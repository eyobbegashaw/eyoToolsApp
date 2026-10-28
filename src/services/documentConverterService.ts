import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFService } from './pdfService';
import { SimplePdfGenerator } from './pdfGenerator';
import { SimpleZipBuilder } from './zipUtils';

export type ConversionDirection =
  | 'doc_to_pdf'
  | 'pdf_to_doc'
  | 'ppt_to_pdf'
  | 'pdf_to_ppt'
  | 'md_to_pdf'
  | 'pdf_to_md';

export interface ConversionResult {
  outputUri: string;
  outputFileName: string;
  fileSizeBytes: number;
  textPreview?: string;
  pageCount?: number;
  slideCount?: number;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class DocumentConverterService {
  /**
   * Convert Word/DOCX to a valid binary PDF-1.4 file
   */
  static async convertDocxToPdf(
    uri: string,
    sourceFileName = 'document.docx'
  ): Promise<ConversionResult> {
    const rawContent = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    }).catch(async () => {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Latin1 as any,
      });
    });

    // Extract textual blocks from docx XML / streams
    const textMatches = rawContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
    let extracted = textMatches.map((t: string) => t.replace(/<[^>]+>/g, '')).join(' ');

    if (!extracted || extracted.trim().length === 0) {
      extracted = rawContent.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    if (!extracted.trim()) {
      extracted = 'No readable textual content could be extracted from this Word document.';
    }

    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_converted.pdf`;
    const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;

    // Generate compliant binary PDF
    const validPdfContent = SimplePdfGenerator.generate(extracted, {
      title: baseName,
      author: 'eyoTools Mobile Converter',
    });

    await FileSystem.writeAsStringAsync(outputUri, validPdfContent, {
      encoding: FileSystem.EncodingType.Latin1 as any,
    });

    return {
      outputUri,
      outputFileName,
      fileSizeBytes: validPdfContent.length,
      pageCount: Math.max(1, Math.ceil(extracted.length / 1800)),
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
    const pdfData = await PDFService.extractTextFromUri(uri);
    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_converted.docx`;
    const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;

    const textToConvert = pdfData.text.trim() || 'No readable text layer found in source PDF.';

    // Construct valid DOCX OpenXML Zip Archive
    const zip = new SimpleZipBuilder();

    // 1. [Content_Types].xml
    zip.addFile(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );

    // 2. _rels/.rels
    zip.addFile(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    // 3. word/_rels/document.xml.rels
    zip.addFile(
      'word/_rels/document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
    );

    // 4. word/document.xml
    const paragraphs = textToConvert.split(/\r?\n/).filter((p) => p.trim().length > 0);
    const paragraphsXml = paragraphs
      .map(
        (p) => `<w:p>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr>
    <w:t>${escapeXml(p)}</w:t>
  </w:r>
</w:p>`
      )
      .join('\n');

    zip.addFile(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="32"/></w:rPr>
        <w:t>${escapeXml(baseName)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:i/><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr>
        <w:t>Converted by eyoTools Mobile Engine • ${new Date().toLocaleDateString()}</w:t>
      </w:r>
    </w:p>
    ${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`
    );

    const base64Docx = zip.buildBase64();
    await FileSystem.writeAsStringAsync(outputUri, base64Docx, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileInfo = await FileSystem.getInfoAsync(outputUri);
    const size = fileInfo.exists ? fileInfo.size : Math.round((base64Docx.length * 3) / 4);

    return {
      outputUri,
      outputFileName,
      fileSizeBytes: size,
      pageCount: pdfData.totalPages,
      textPreview: textToConvert.slice(0, 300),
    };
  }

  /**
   * Convert PPTX presentation to a valid binary PDF-1.4 file
   */
  static async convertPptxToPdf(
    uri: string,
    sourceFileName = 'presentation.pptx'
  ): Promise<ConversionResult> {
    const raw = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Latin1 as any,
    });

    const slideMatches = raw.match(/<a:t>(.*?)<\/a:t>/g) || [];
    const slideTexts = slideMatches
      .map((t: string) => t.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);

    let contentToFormat = '';
    if (slideTexts.length > 0) {
      contentToFormat = slideTexts.map((s, idx) => `[Slide ${idx + 1}]\n${s}`).join('\n\n');
    } else {
      contentToFormat = `Presentation: ${sourceFileName}\nNo textual slide layers detected.`;
    }

    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_slides.pdf`;
    const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;

    const validPdfContent = SimplePdfGenerator.generate(contentToFormat, {
      title: `${baseName} (Slides)`,
      author: 'eyoTools Mobile Engine',
    });

    await FileSystem.writeAsStringAsync(outputUri, validPdfContent, {
      encoding: FileSystem.EncodingType.Latin1 as any,
    });

    return {
      outputUri,
      outputFileName,
      fileSizeBytes: validPdfContent.length,
      slideCount: Math.max(1, slideTexts.length),
      textPreview: slideTexts.slice(0, 6).join(' • '),
    };
  }

  /**
   * Convert PDF to a valid binary Microsoft PowerPoint (.pptx) OpenXML ZIP file
   */
  static async convertPdfToPptx(
    uri: string,
    sourceFileName = 'document.pdf'
  ): Promise<ConversionResult> {
    const pdfData = await PDFService.extractTextFromUri(uri);
    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_presentation.pptx`;
    const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;

    const pages = pdfData.pageTexts && pdfData.pageTexts.length > 0
      ? pdfData.pageTexts
      : [pdfData.text || 'Slide 1 Content'];

    // Construct valid PPTX OpenXML Zip Archive
    const zip = new SimpleZipBuilder();

    // 1. [Content_Types].xml
    const slideOverrides = pages
      .map(
        (_, idx) =>
          `<Override PartName="/ppt/slides/slide${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
      )
      .join('\n');

    zip.addFile(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideOverrides}
</Types>`
    );

    // 2. _rels/.rels
    zip.addFile(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
    );

    // 3. ppt/presentation.xml
    const sldIdLst = pages
      .map((_, idx) => `<p:sldId id="${256 + idx}" r:id="rId${idx + 1}"/>`)
      .join('\n');

    zip.addFile(
      'ppt/presentation.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst/>
  <p:sldIdLst>
    ${sldIdLst}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>`
    );

    // 4. ppt/_rels/presentation.xml.rels
    const presRels = pages
      .map(
        (_, idx) =>
          `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${idx + 1}.xml"/>`
      )
      .join('\n');

    zip.addFile(
      'ppt/_rels/presentation.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${presRels}
</Relationships>`
    );

    // 5. Slides
    pages.forEach((pageContent, idx) => {
      const slideNum = idx + 1;
      const lines = pageContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const title = lines[0] || `Slide ${slideNum}`;
      const body = lines.slice(1).join('\n') || pageContent.slice(0, 300);

      zip.addFile(
        `ppt/slides/slide${slideNum}.xml`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="457200"/><a:ext cx="7772400" cy="1143000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:rPr lang="en-US" sz="3200" b="1"/><a:t>${escapeXml(title)}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="1800000"/><a:ext cx="7772400" cy="4500000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:rPr lang="en-US" sz="1600"/><a:t>${escapeXml(body)}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
      );
    });

    const base64Pptx = zip.buildBase64();
    await FileSystem.writeAsStringAsync(outputUri, base64Pptx, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileInfo = await FileSystem.getInfoAsync(outputUri);
    const size = fileInfo.exists ? fileInfo.size : Math.round((base64Pptx.length * 3) / 4);

    return {
      outputUri,
      outputFileName,
      fileSizeBytes: size,
      slideCount: pages.length,
      textPreview: pages[0]?.slice(0, 300) || '',
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
    const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;

    const validPdfContent = SimplePdfGenerator.generate(markdown, {
      title: baseName,
      author: 'eyoTools Markdown Engine',
    });

    await FileSystem.writeAsStringAsync(outputUri, validPdfContent, {
      encoding: FileSystem.EncodingType.Latin1 as any,
    });

    return {
      outputUri,
      outputFileName,
      fileSizeBytes: validPdfContent.length,
      pageCount: Math.max(1, Math.ceil(markdown.length / 1500)),
      textPreview: markdown.slice(0, 300),
    };
  }

  /**
   * Convert PDF to Markdown (.md)
   */
  static async convertPdfToMd(
    uri: string,
    sourceFileName = 'document.pdf'
  ): Promise<ConversionResult> {
    const pdfData = await PDFService.extractTextFromUri(uri);
    const baseName = sourceFileName.replace(/\.[^/.]+$/, '');
    const outputFileName = `${baseName}_converted.md`;
    const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;

    let md = `# ${baseName}\n\n> Converted via eyoTools Mobile Engine on ${new Date().toLocaleDateString()}\n\n`;
    pdfData.pageTexts.forEach((p, idx) => {
      md += `## Page ${idx + 1}\n\n${p}\n\n---\n\n`;
    });

    await FileSystem.writeAsStringAsync(outputUri, md, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return {
      outputUri,
      outputFileName,
      fileSizeBytes: md.length,
      pageCount: pdfData.totalPages,
      textPreview: md.slice(0, 300),
    };
  }

  /**
   * Share / Download converted file via Android native SAF share sheet
   */
  static async shareResult(outputUri: string) {
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
    const dir = FileSystem.cacheDirectory;

    if (type === 'docx') {
      const fileName = 'Sample_CS_Notes.docx';
      const uri = `${dir}${fileName}`;
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
      await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
      const info = await FileSystem.getInfoAsync(uri);
      return { uri, name: fileName, size: info.exists ? info.size : 1024 };
    }

    if (type === 'pptx') {
      const fileName = 'Sample_CS_Slides.pptx';
      const uri = `${dir}${fileName}`;
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
      await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
      const info = await FileSystem.getInfoAsync(uri);
      return { uri, name: fileName, size: info.exists ? info.size : 1024 };
    }

    if (type === 'md') {
      const fileName = 'Sample_Notes.md';
      const uri = `${dir}${fileName}`;
      const content = '# Sample Markdown Notes\n\n## Algorithmic Complexity\n- O(1) Constant\n- O(log n) Logarithmic\n- O(n) Linear\n';
      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
      return { uri, name: fileName, size: content.length };
    }

    // PDF sample
    const fileName = 'Sample_Document.pdf';
    const uri = `${dir}${fileName}`;
    const pdfData = SimplePdfGenerator.generate(
      'eyoTools Sample PDF Document\n\nCourse: Operating Systems & Memory Management\nStack and Heap memory allocation models with virtual memory paging.',
      { title: 'Operating Systems Sample', author: 'eyoTools Engine' }
    );
    await FileSystem.writeAsStringAsync(uri, pdfData, { encoding: FileSystem.EncodingType.Latin1 as any });
    return { uri, name: fileName, size: pdfData.length };
  }
}
