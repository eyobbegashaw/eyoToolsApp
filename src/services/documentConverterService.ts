import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { strFromU8, unzipSync } from 'fflate';
import { SimplePdfGenerator } from './pdfGenerator';
import { SimpleZipBuilder } from './zipUtils';
import { renderDocxHtml, renderPptxHtml } from './officeHtmlRenderer';
import { renderMarkdownHtml } from './markdownPdfRenderer';
import PdfPageRenderer, { type PdfPageRaster } from '../../modules/pdf-page-renderer';

export type ConversionDirection =
  | 'doc_to_pdf'
  | 'pdf_to_doc'
  | 'ppt_to_pdf'
  | 'md_to_pdf';

export interface ConversionResult {
  outputUri: string;
  outputFileName: string;
  fileSizeBytes: number;
  textPreview?: string;
  pageCount?: number;
  slideCount?: number;
}

function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array(Math.floor((value.length * 3) / 4) - padding);
  let accumulator = 0;
  let bitCount = 0;
  let offset = 0;

  for (const character of value) {
    if (character === '=') break;
    const digit = alphabet.indexOf(character);
    if (digit === -1) continue;

    accumulator = (accumulator << 6) | digit;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes[offset++] = (accumulator >> bitCount) & 0xff;
    }
  }

  return bytes.subarray(0, offset);
}

function encodeBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    result += alphabet[first >> 2];
    result += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    result += second === undefined
      ? '=='
      : `${alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)]}${third === undefined ? '=' : alphabet[third & 63]}`;
  }
  return result;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 10))
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractXmlText(xml: string, tag: 'w:t' | 'a:t'): string {
  const values = Array.from(xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'g')));
  return values.map((match) => decodeXmlText(match[1])).join(' ');
}

function extractXmlParagraphs(xml: string, paragraphTag: 'w:p' | 'a:p', textTag: 'w:t' | 'a:t'): string[] {
  return Array.from(
    xml.matchAll(new RegExp(`<${paragraphTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${paragraphTag}>`, 'g'))
  )
    .map((paragraph) => extractXmlText(paragraph[1], textTag).trim())
    .filter(Boolean);
}

async function readZipEntries(uri: string): Promise<Record<string, Uint8Array>> {
  try {
    return unzipSync(await readFileBytes(uri));
  } catch (error) {
    throw new Error(
      'Unable to open this Office document. It may be corrupted, encrypted, or not a valid DOCX/PPTX file.',
      { cause: error }
    );
  }
}

async function readFileBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Unable to read the selected file (HTTP ${response.status}).`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decodeBase64(base64);
}

async function readFileText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Unable to read the selected file (HTTP ${response.status}).`);
    }
    return response.text();
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

async function writeOutput(
  fileName: string,
  content: string,
  encoding: 'utf8' | 'base64' | 'latin1'
): Promise<{ uri: string; size: number }> {
  if (Platform.OS === 'web') {
    let data: string | Uint8Array;
    if (encoding === 'base64') {
      data = decodeBase64(content);
    } else if (encoding === 'latin1') {
      data = Uint8Array.from(content, (character) => character.charCodeAt(0) & 0xff);
    } else {
      data = content;
    }
    let blobPart: BlobPart;
    if (data instanceof Uint8Array) {
      const buffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(buffer).set(data);
      blobPart = buffer;
    } else {
      blobPart = data;
    }
    const blob = new Blob([blobPart]);
    return { uri: URL.createObjectURL(blob), size: blob.size };
  }

  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  const fileEncoding = encoding === 'utf8'
    ? FileSystem.EncodingType.UTF8
    : FileSystem.EncodingType.Base64;
  const fileContent = encoding === 'latin1'
    ? encodeBase64(Uint8Array.from(content, (character) => character.charCodeAt(0) & 0xff))
    : content;
  await FileSystem.writeAsStringAsync(uri, fileContent, { encoding: fileEncoding });
  const info = await FileSystem.getInfoAsync(uri);
  return { uri, size: info.exists ? info.size : content.length };
}

async function renderOfficePdf(
  html: string,
  outputFileName: string,
  pageSize: {
    width: number;
    height: number;
    margins?: { top: number; right: number; bottom: number; left: number };
  }
): Promise<{ uri: string; size: number; pages: number }> {
  const width = Math.max(72, Number(pageSize.width) || 612);
  const height = Math.max(72, Number(pageSize.height) || 792);

  if (Platform.OS === 'web') {
    const { default: html2pdf } = await import('html2pdf.js');
    const frame = document.createElement('iframe');
    frame.title = 'Document PDF rendering surface';
    frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${Math.ceil(width * 96 / 72)}px;height:${Math.ceil(height * 96 / 72)}px;border:0`;
    frame.srcdoc = html;
    const frameLoaded = new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error('Unable to load the document for PDF rendering.'));
    });
    document.body.appendChild(frame);

    try {
      await frameLoaded;
      const body = frame.contentDocument?.body;
      if (!body || !body.children.length) {
        throw new Error('The document renderer produced no printable content.');
      }
      await frame.contentDocument?.fonts?.ready;
      const images = Array.from(body.querySelectorAll('img'));
      await Promise.all(images.map((image) => image.decode()));
      if (images.some((image) => image.naturalWidth === 0 || image.naturalHeight === 0)) {
        throw new Error('The document contains an image that could not be rendered.');
      }

      const worker = html2pdf()
        .set({
          margin: pageSize.margins
            ? [
                pageSize.margins.top,
                pageSize.margins.right,
                pageSize.margins.bottom,
                pageSize.margins.left,
              ]
            : 0,
          image: { type: 'jpeg', quality: 0.96 },
          enableLinks: true,
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          },
          jsPDF: {
            unit: 'pt',
            format: [width, height],
            orientation: width > height ? 'landscape' : 'portrait',
          },
        })
        .from(body)
        .toPdf();
      const pdf = await worker.get('pdf') as {
        internal: { getNumberOfPages: () => number };
        output: (type: 'blob') => Blob;
      };
      const blob = pdf.output('blob');
      const pageCount = pdf.internal.getNumberOfPages();
      if (blob.size === 0 || pageCount < 1 || (await blob.slice(0, 5).text()) !== '%PDF-') {
        throw new Error('PDF rendering did not produce a valid PDF file.');
      }
      return {
        uri: URL.createObjectURL(blob),
        size: blob.size,
        pages: pageCount,
      };
    } finally {
      frame.remove();
    }
  }

  const result = await Print.printToFileAsync({
    html,
    width,
    height,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const info = await FileSystem.getInfoAsync(result.uri);
  if (!info.exists || info.size <= 0 || result.numberOfPages < 1) {
    throw new Error('The document renderer did not produce a complete PDF.');
  }
  return {
    uri: result.uri,
    size: info.exists ? info.size : 0,
    pages: result.numberOfPages,
  };
}

async function rasterizePdf(uri: string): Promise<PdfPageRaster[]> {
  if (Platform.OS !== 'web') {
    const renderedPages = await PdfPageRenderer.renderPages(uri);
    return Promise.all(
      renderedPages.map(async (page) => ({
        ...page,
        uri: await FileSystem.readAsStringAsync(page.uri, {
          encoding: FileSystem.EncodingType.Base64,
        }),
      }))
    );
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Unable to read the selected PDF (HTTP ${response.status}).`);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  const [pdfjs] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ]);
  const document = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const pages: PdfPageRaster[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 2400 / Math.max(baseViewport.width, baseViewport.height));
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to render a PDF page image.');
      await page.render({ canvasContext: context, viewport }).promise;
      const base64Image = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
      pages.push({
        uri: base64Image,
        width: baseViewport.width,
        height: baseViewport.height,
      });
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await document.destroy();
  }

  return pages;
}

export class DocumentConverterService {
  /**
   * Convert Word/DOCX to a valid binary PDF-1.4 file
   */
  static async convertDocxToPdf(
    uri: string,
    sourceFileName = 'document.docx'
  ): Promise<ConversionResult> {
    const entries = await readZipEntries(uri);
    const rendered = renderDocxHtml(entries);
    const documentXml = entries['word/document.xml'];
    const extracted = documentXml
      ? extractXmlParagraphs(strFromU8(documentXml), 'w:p', 'w:t').join('\n')
      : '';
    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_converted.pdf`;
    const output = await renderOfficePdf(
      rendered.html,
      outputFileName,
      rendered
    );

    return {
      outputUri: output.uri,
      outputFileName,
      fileSizeBytes: output.size,
      pageCount: output.pages,
      textPreview: extracted.slice(0, 300),
    };
  }

  /**
   * Convert PDF to a valid binary Microsoft Word (.docx) OpenXML ZIP file
   */
  static async convertPdfToDocx(
    uri: string,
    sourceFileName = 'document.pdf'
  ): Promise<ConversionResult> {
    const pages = await rasterizePdf(uri);
    if (!pages.length) {
      throw new Error('The selected PDF does not contain any pages.');
    }
    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_converted.docx`;

    const zip = new SimpleZipBuilder();
    zip.addFile(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );

    zip.addFile(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    const imageRelationships = pages
      .map((_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${index + 1}.jpg"/>`
      )
      .join('\n');
    zip.addFile(
      'word/_rels/document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${imageRelationships}
</Relationships>`
    );

    const pageParagraphs = pages.map((page, index) => {
      const width = Math.max(1, Math.round(page.width * 12700));
      const height = Math.max(1, Math.round(page.height * 12700));
      const sectionProperties =
        index < pages.length - 1
          ? `<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${Math.round(width / 635)}" w:h="${Math.round(height / 635)}"${width > height ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`
          : '';
      return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/>${sectionProperties}</w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:docPr id="${index + 1}" name="PDF page ${index + 1}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${index + 1}" name="PDF page ${index + 1}.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${index + 1}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    });
    const lastPageWidth = Math.round(pages[pages.length - 1].width * 20);
    const lastPageHeight = Math.round(pages[pages.length - 1].height * 20);
    const finalSection = `<w:sectPr><w:pgSz w:w="${lastPageWidth}" w:h="${lastPageHeight}"${lastPageWidth > lastPageHeight ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;

    zip.addFile(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${pageParagraphs.join('\n')}
    ${finalSection}
  </w:body>
</w:document>`
    );

    pages.forEach((page, index) => {
      zip.addFile(`word/media/page${index + 1}.jpg`, decodeBase64(page.uri));
    });
    const base64Docx = zip.buildBase64();
    const output = await writeOutput(outputFileName, base64Docx, 'base64');

    return {
      outputUri: output.uri,
      outputFileName,
      fileSizeBytes: output.size,
      pageCount: pages.length,
      textPreview: 'PDF pages are preserved as images and are not editable.',
    };
  }

  /**
   * Convert PPTX presentation to a valid binary PDF-1.4 file
   */
  static async convertPptxToPdf(
    uri: string,
    sourceFileName = 'presentation.pptx'
  ): Promise<ConversionResult> {
    const entries = await readZipEntries(uri);
    const slideFiles = Object.keys(entries)
      .map((name) => ({ name, match: name.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
      .filter((entry): entry is { name: string; match: RegExpMatchArray } => !!entry.match)
      .sort((left, right) => Number(left.match[1]) - Number(right.match[1]));
    if (slideFiles.length === 0) {
      throw new Error('The selected file is not a valid PowerPoint presentation.');
    }

    const slideTexts = slideFiles
      .map(({ name }) => extractXmlParagraphs(strFromU8(entries[name]), 'a:p', 'a:t').join('\n'));

    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_slides.pdf`;
    const rendered = renderPptxHtml(entries);
    const output = await renderOfficePdf(
      rendered.html,
      outputFileName,
      rendered
    );

    return {
      outputUri: output.uri,
      outputFileName,
      fileSizeBytes: output.size,
      slideCount: rendered.slideCount,
      textPreview: slideTexts.slice(0, 6).join(' • '),
    };
  }

  /**
   * Convert Markdown to a valid binary PDF-1.4 file
   */
  static async convertMdToPdf(
    markdown: string,
    sourceFileName = 'notes.md'
  ): Promise<ConversionResult> {
    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}.pdf`;
    const html = await renderMarkdownHtml(markdown);
    const output = await renderOfficePdf(
      html,
      outputFileName,
      { width: 612, height: 792, margins: { top: 54, right: 54, bottom: 54, left: 54 } }
    );

    return {
      outputUri: output.uri,
      outputFileName,
      fileSizeBytes: output.size,
      pageCount: output.pages,
      textPreview: markdown.slice(0, 300),
    };
  }

  static async convertMdFileToPdf(
    uri: string,
    sourceFileName = 'notes.md'
  ): Promise<ConversionResult> {
    const markdown = await readFileText(uri);
    return this.convertMdToPdf(markdown, sourceFileName);
  }

  /**
   * Share or download the converted file.
   */
  static async shareResult(outputUri: string, fileName?: string) {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = outputUri;
      link.download = fileName || 'converted-file';
      link.click();
      if (outputUri.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(outputUri), 1000);
      }
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(outputUri);
    }
  }

  /**
   * Create authentic sample test documents in cache directory
   */
  static async createSampleDocument(type: 'docx' | 'pptx' | 'pdf' | 'md'): Promise<{
    uri: string;
    name: string;
    size: number;
  }> {
    if (type === 'docx') {
      const fileName = 'Sample_CS_Notes.docx';
      const zip = new SimpleZipBuilder();
      zip.addFile(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
      );
      zip.addFile(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
      );
      zip.addFile(
        'word/document.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>eyoTools Sample Word Document</w:t></w:r></w:p>
    <w:p><w:r><w:t>Data Structures and Algorithms</w:t></w:r></w:p>
    <w:p><w:r><w:t>1. Big-O Complexity: Constant, Logarithmic, Linear, Quadratic</w:t></w:r></w:p>
    <w:p><w:r><w:t>2. Binary Search Trees and Balancing Operations</w:t></w:r></w:p>
  </w:body>
</w:document>`
      );
      const b64 = zip.buildBase64();
      const output = await writeOutput(fileName, b64, 'base64');
      return { uri: output.uri, name: fileName, size: output.size };
    }

    if (type === 'pptx') {
      const fileName = 'Sample_CS_Slides.pptx';
      const zip = new SimpleZipBuilder();
      zip.addFile(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`
      );
      zip.addFile(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
      );
      zip.addFile(
        'ppt/presentation.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst>
</p:presentation>`
      );
      zip.addFile(
        'ppt/_rels/presentation.xml.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`
      );
      zip.addFile(
        'ppt/slides/slide1.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
    <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:p><a:r><a:t>Computer Science Foundations</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:p><a:r><a:t>Sorting, Searching, and Tree Traversal</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`
      );
      const b64 = zip.buildBase64();
      const output = await writeOutput(fileName, b64, 'base64');
      return { uri: output.uri, name: fileName, size: output.size };
    }

    if (type === 'md') {
      const fileName = 'Sample_Notes.md';
      const content = '# Sample Markdown Notes\n\n## Algorithmic Complexity\n- O(1) Constant\n- O(log n) Logarithmic\n- O(n) Linear\n';
      const output = await writeOutput(fileName, content, 'utf8');
      return { uri: output.uri, name: fileName, size: output.size };
    }

    // PDF sample
    const fileName = 'Sample_Document.pdf';
    const pdfData = SimplePdfGenerator.generate(
      'eyoTools Sample PDF Document\n\nCourse: Operating Systems & Memory Management\nStack and Heap memory allocation models with virtual memory paging.',
      { title: 'Operating Systems Sample', author: 'eyoTools Engine' }
    );
    const output = await writeOutput(fileName, pdfData, 'latin1');
    return { uri: output.uri, name: fileName, size: output.size };
  }
}
