import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { unzlibSync, inflateSync } from 'fflate';
import { OCRService } from './ocrService';

export interface PDFExtractionResult {
  text: string;
  totalPages: number;
  wordCount: number;
  characterCount: number;
  isScannedOnly: boolean;
  hasImages: boolean;
  pageTexts: string[];
  extractedImageUris?: string[];
}

/**
 * Fast Base64 to Uint8Array decoder that works seamlessly across
 * React Native Hermes, JSC, and Web environments.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  const cleanBase64 = base64.replace(/[\r\n\s]+/g, '');
  let bufferLength = cleanBase64.length * 0.75;
  if (cleanBase64.endsWith('==')) bufferLength -= 2;
  else if (cleanBase64.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const e1 = lookup[cleanBase64.charCodeAt(i)];
    const e2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const e3 = lookup[cleanBase64.charCodeAt(i + 2)];
    const e4 = lookup[cleanBase64.charCodeAt(i + 3)];

    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}

/**
 * Fast Uint8Array to Base64 encoder.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const e1 = b1 >> 2;
    const e2 = ((b1 & 3) << 4) | (b2 >> 4);
    const e3 = ((b2 & 15) << 2) | (b3 >> 6);
    const e4 = b3 & 63;

    base64 += chars[e1] + chars[e2];
    base64 += i + 1 < len ? chars[e3] : '=';
    base64 += i + 2 < len ? chars[e4] : '=';
  }
  return base64;
}

/**
 * Decode PDF literal string (e.g., text enclosed in parentheses)
 * Handles escaped octals, parentheses, newlines, and control characters.
 */
function decodePdfLiteralString(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\\r?\n/g, '');
}

/**
 * Parse PDF /ToUnicode CMap streams to map character glyph codes to Unicode text.
 */
function parseCMap(cmapText: string): Map<string, string> {
  const map = new Map<string, string>();

  // Parse beginbfchar ... endbfchar
  const bfCharBlocks = cmapText.match(/beginbfchar([\s\S]*?)endbfchar/g) || [];
  for (const block of bfCharBlocks) {
    const lines = block.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g) || [];
    for (const line of lines) {
      const m = line.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
      if (m) {
        const src = m[1].toLowerCase();
        const dstHex = m[2];
        let dstChar = '';
        for (let i = 0; i < dstHex.length; i += 4) {
          const code = parseInt(dstHex.substr(i, 4), 16);
          if (code > 0) dstChar += String.fromCodePoint(code);
        }
        if (dstChar) map.set(src, dstChar);
      }
    }
  }

  // Parse beginbfrange ... endbfrange
  const bfRangeBlocks = cmapText.match(/beginbfrange([\s\S]*?)endbfrange/g) || [];
  for (const block of bfRangeBlocks) {
    const rangeLines =
      block.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g) || [];
    for (const r of rangeLines) {
      const m = r.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
      if (m) {
        const start = parseInt(m[1], 16);
        const end = parseInt(m[2], 16);
        let dst = parseInt(m[3], 16);
        const hexLen = m[1].length;
        for (let code = start; code <= end; code++) {
          const key = code.toString(16).padStart(hexLen, '0').toLowerCase();
          map.set(key, String.fromCodePoint(dst++));
        }
      }
    }
  }

  return map;
}

/**
 * Decode hexadecimal PDF strings (e.g. <00480065006C006C006F>)
 * Checks CMap first, then UTF-16BE / UCS-2, then standard Latin/ASCII.
 */
function decodeHexString(hex: string, cmap?: Map<string, string>): string {
  const cleanHex = hex.replace(/\s+/g, '');
  if (!cleanHex) return '';

  if (cmap && cmap.size > 0) {
    let out = '';
    const chunkLen = cmap.keys().next().value?.length || 4;
    for (let i = 0; i < cleanHex.length; i += chunkLen) {
      const chunk = cleanHex.substr(i, chunkLen).toLowerCase();
      if (cmap.has(chunk)) {
        out += cmap.get(chunk);
      } else {
        const val = parseInt(chunk, 16);
        if (val >= 32) out += String.fromCodePoint(val);
      }
    }
    if (out.trim()) return out;
  }

  // Standard UTF-16BE (2 bytes per character)
  if (cleanHex.length >= 4 && cleanHex.length % 4 === 0) {
    let out = '';
    for (let i = 0; i < cleanHex.length; i += 4) {
      const val = parseInt(cleanHex.substr(i, 4), 16);
      if (val >= 32) {
        out += String.fromCodePoint(val);
      }
    }
    if (out.trim()) return out;
  }

  // Standard Latin/ASCII (1 byte per character)
  let out = '';
  for (let i = 0; i < cleanHex.length; i += 2) {
    const val = parseInt(cleanHex.substr(i, 2), 16);
    if (val >= 32 && val <= 126) {
      out += String.fromCharCode(val);
    }
  }
  return out;
}

/**
 * Extract text lines from decompressed PDF stream content
 */
function extractTextFromStream(streamText: string, cmap?: Map<string, string>): string[] {
  const lines: string[] = [];
  const btBlocks = streamText.match(/BT[\s\S]*?ET/g) || [];

  for (const block of btBlocks) {
    // Regex matching Tj, ', ", TJ, Td, T*
    const opRegex =
      /(?:\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]+>)\s*(?:Tj|'|")|\[([\s\S]*?)\]\s*TJ|([0-9.\-]+)\s+([0-9.\-]+)\s+Td|T\*/g;
    let match: RegExpExecArray | null;
    let currentLine = '';

    while ((match = opRegex.exec(block)) !== null) {
      const full = match[0];

      if (full.endsWith('T*') || full.endsWith("'") || full.endsWith('"')) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
      } else if (match[2] !== undefined && match[3] !== undefined) {
        // Td operator indicates relative position displacement
        const dy = parseFloat(match[3]);
        if (Math.abs(dy) > 2) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = '';
        }
      } else if (match[1] !== undefined) {
        // TJ array
        const inner = match[1];
        const tokens =
          inner.match(/\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]+>|[-+]?[0-9]*\.?[0-9]+/g) || [];
        for (const token of tokens) {
          if (token.startsWith('(') && token.endsWith(')')) {
            currentLine += decodePdfLiteralString(token.slice(1, -1));
          } else if (token.startsWith('<') && token.endsWith('>')) {
            currentLine += decodeHexString(token.slice(1, -1), cmap);
          } else {
            const num = parseFloat(token);
            if (!isNaN(num) && num <= -80) {
              if (!currentLine.endsWith(' ')) currentLine += ' ';
            }
          }
        }
      } else if (full.endsWith('Tj')) {
        const raw = full.replace(/\s*Tj$/, '').trim();
        if (raw.startsWith('(') && raw.endsWith(')')) {
          currentLine += decodePdfLiteralString(raw.slice(1, -1));
        } else if (raw.startsWith('<') && raw.endsWith('>')) {
          currentLine += decodeHexString(raw.slice(1, -1), cmap);
        }
      }
    }

    if (currentLine.trim()) lines.push(currentLine.trim());
  }

  return lines;
}

export class PDFService {
  /**
   * Web extraction using PDF.js
   */
  private static async extractTextOnWeb(
    uri: string,
    onProgress?: (progress: number) => void
  ): Promise<PDFExtractionResult> {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Unable to read the selected PDF (HTTP ${response.status}).`);
    }

    const data = new Uint8Array(await response.arrayBuffer());
    onProgress?.(15);

    const [pdfjs] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
    ]);

    const document = await pdfjs.getDocument({
      data,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
    const totalPages = document.numPages;
    const pageTexts: string[] = [];
    let hasImages = false;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const [textContent, operatorList] = await Promise.all([
        page.getTextContent(),
        page.getOperatorList(),
      ]);
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')
        .trim();

      pageTexts.push(pageText);
      hasImages ||= operatorList.fnArray.some(
        (operator) =>
          operator === pdfjs.OPS.paintImageXObject ||
          operator === pdfjs.OPS.paintInlineImageXObject ||
          operator === pdfjs.OPS.paintImageMaskXObject
      );
      onProgress?.(15 + Math.round((pageNumber / totalPages) * 80));
    }

    await document.destroy();

    const text = pageTexts.filter(Boolean).join('\n\n');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const cleanAlphaNumeric = text.replace(/[^a-zA-Z0-9\u1200-\u137F]/g, '');
    onProgress?.(100);

    return {
      text,
      totalPages,
      wordCount,
      characterCount: text.length,
      isScannedOnly: cleanAlphaNumeric.length === 0,
      hasImages,
      pageTexts,
    };
  }

  /**
   * Robust Native extraction that decompresses FlateDecode streams,
   * parses CMaps, decodes TJ/Tj text, and captures embedded page scans/images.
   */
  private static async extractTextOnNative(
    uri: string,
    onProgress?: (progress: number) => void
  ): Promise<PDFExtractionResult> {
    if (onProgress) onProgress(10);

    // Read full raw bytes via base64 for reliable binary fidelity
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (onProgress) onProgress(30);

    const u8 = base64ToUint8Array(base64);
    let latin1 = '';
    // Build Latin-1 index string efficiently
    const CHUNK_SIZE = 32768;
    for (let i = 0; i < u8.length; i += CHUNK_SIZE) {
      const chunk = u8.subarray(i, Math.min(i + CHUNK_SIZE, u8.length));
      latin1 += String.fromCharCode.apply(null, chunk as any);
    }

    if (onProgress) onProgress(45);

    // Count pages
    const pageMatches = latin1.match(/\/Type\s*\/Page\b/g) || [];
    const totalPages = Math.max(1, pageMatches.length);

    // Check for images
    const hasImages =
      /\/Subtype\s*\/Image\b/i.test(latin1) ||
      /\/XObject\b/i.test(latin1) ||
      /\/Filter\s*\/DCTDecode\b/i.test(latin1);

    // Decompress all streams and collect CMaps and text
    const cmap = new Map<string, string>();
    const decompressedStreams: string[] = [];
    const extractedImageUris: string[] = [];

    let searchPos = 0;
    let streamIndex = 0;

    while (searchPos < latin1.length) {
      const streamIdx = latin1.indexOf('stream', searchPos);
      if (streamIdx === -1) break;

      // Find preceding dictionary << ... >>
      const dictStart = latin1.lastIndexOf('<<', streamIdx);
      const dictEnd = latin1.lastIndexOf('>>', streamIdx);
      const dict =
        dictStart !== -1 && dictEnd !== -1 && dictEnd > dictStart
          ? latin1.slice(dictStart, dictEnd + 2)
          : '';

      // Skip stream keyword and trailing newline
      let dataStart = streamIdx + 6;
      if (latin1.charCodeAt(dataStart) === 13) dataStart++;
      if (latin1.charCodeAt(dataStart) === 10) dataStart++;

      // Find endstream
      const endstreamIdx = latin1.indexOf('endstream', dataStart);
      if (endstreamIdx === -1) {
        searchPos = dataStart;
        continue;
      }

      let dataEnd = endstreamIdx;
      if (latin1.charCodeAt(dataEnd - 1) === 10) dataEnd--;
      if (latin1.charCodeAt(dataEnd - 1) === 13) dataEnd--;

      const streamBytes = u8.subarray(dataStart, Math.max(dataStart, dataEnd));
      searchPos = endstreamIdx + 9;

      // 1. Check for JPEG Image (Scanned PDF pages)
      if (
        (dict.includes('/Subtype') && dict.includes('/Image')) ||
        dict.includes('/DCTDecode') ||
        (streamBytes.length > 4 && streamBytes[0] === 0xff && streamBytes[1] === 0xd8)
      ) {
        try {
          if (extractedImageUris.length < 10) {
            const imgBase64 = uint8ArrayToBase64(streamBytes);
            const imgPath = `${FileSystem.cacheDirectory}pdf_page_scan_${extractedImageUris.length}.jpg`;
            await FileSystem.writeAsStringAsync(imgPath, imgBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            extractedImageUris.push(imgPath);
          }
        } catch {
          // Continue if image caching fails
        }
      }

      // 2. Decompress stream if FlateDecode
      let decompressedStr = '';
      if (dict.includes('FlateDecode')) {
        try {
          const decBytes = unzlibSync(streamBytes);
          for (let i = 0; i < decBytes.length; i += CHUNK_SIZE) {
            const chunk = decBytes.subarray(i, Math.min(i + CHUNK_SIZE, decBytes.length));
            decompressedStr += String.fromCharCode.apply(null, chunk as any);
          }
        } catch {
          try {
            const decBytes = inflateSync(streamBytes);
            for (let i = 0; i < decBytes.length; i += CHUNK_SIZE) {
              const chunk = decBytes.subarray(i, Math.min(i + CHUNK_SIZE, decBytes.length));
              decompressedStr += String.fromCharCode.apply(null, chunk as any);
            }
          } catch {
            // Keep raw if decompression fails
          }
        }
      } else {
        for (let i = 0; i < streamBytes.length; i += CHUNK_SIZE) {
          const chunk = streamBytes.subarray(i, Math.min(i + CHUNK_SIZE, streamBytes.length));
          decompressedStr += String.fromCharCode.apply(null, chunk as any);
        }
      }

      if (decompressedStr) {
        // Parse CMaps
        if (decompressedStr.includes('beginbfchar') || decompressedStr.includes('beginbfrange')) {
          const parsedCMap = parseCMap(decompressedStr);
          parsedCMap.forEach((val, key) => cmap.set(key, val));
        }

        if (decompressedStr.includes('BT') && decompressedStr.includes('ET')) {
          decompressedStreams.push(decompressedStr);
        }
      }

      streamIndex++;
    }

    if (onProgress) onProgress(75);

    // Extract text from all text streams
    const allLines: string[] = [];
    for (const streamContent of decompressedStreams) {
      const extractedLines = extractTextFromStream(streamContent, cmap);
      allLines.push(...extractedLines);
    }

    const candidateText = allLines.join('\n');
    const cleanAlphaNumeric = candidateText.replace(/[^a-zA-Z0-9\u1200-\u137F]/g, '');
    const hasMeaningfulText = cleanAlphaNumeric.length >= 10;

    if (onProgress) onProgress(100);

    // If no text layer found (scanned or image-only PDF)
    if (!hasMeaningfulText) {
      return {
        text: '',
        totalPages,
        wordCount: 0,
        characterCount: 0,
        isScannedOnly: true,
        hasImages,
        pageTexts: [],
        extractedImageUris,
      };
    }

    const words = candidateText.split(/\s+/).filter(Boolean);
    const chunkSize = Math.max(1, Math.ceil(candidateText.length / totalPages));
    const pageTexts: string[] = [];
    for (let i = 0; i < totalPages; i++) {
      const chunk = candidateText.slice(i * chunkSize, (i + 1) * chunkSize).trim();
      pageTexts.push(chunk || `Page ${i + 1}`);
    }

    return {
      text: candidateText,
      totalPages,
      wordCount: words.length,
      characterCount: candidateText.length,
      isScannedOnly: false,
      hasImages,
      pageTexts,
      extractedImageUris,
    };
  }

  /**
   * Main text extraction entrypoint
   */
  static async extractTextFromUri(
    uri: string,
    onProgress?: (progress: number) => void
  ): Promise<PDFExtractionResult> {
    try {
      if (Platform.OS === 'web') {
        return await this.extractTextOnWeb(uri, onProgress);
      }
      return await this.extractTextOnNative(uri, onProgress);
    } catch (e: any) {
      console.warn('PDF parsing error', e);
      throw new Error('Failed to parse PDF document: ' + (e.message || String(e)));
    }
  }

  /**
   * Extract text from a scanned / image-only PDF using OCR recognition.
   * Runs local or cloud Tesseract engine on extracted page images.
   */
  static async extractTextWithOCR(
    uri: string,
    lang: 'eng' | 'amh' = 'eng',
    onProgress?: (progressPercent: number, statusText: string) => void
  ): Promise<PDFExtractionResult> {
    try {
      if (onProgress) {
        onProgress(15, lang === 'amh' ? 'የሰነዱን ገጾች በማዘጋጀት ላይ...' : 'Preparing PDF pages for OCR...');
      }

      // Web platform: Render pages to canvas images and run OCR
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        const response = await fetch(uri);
        const data = new Uint8Array(await response.arrayBuffer());
        const [pdfjs] = await Promise.all([
          import('pdfjs-dist/legacy/build/pdf.mjs'),
          import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
        ]);

        const pdfDoc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
        const totalPages = pdfDoc.numPages;
        const pageTexts: string[] = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const stepPercent = Math.round(15 + (pageNum / (totalPages + 1)) * 80);
          onProgress?.(
            stepPercent,
            lang === 'amh'
              ? `ገጽ ${pageNum} ከ ${totalPages} በማንበብ ላይ...`
              : `Running OCR on page ${pageNum} of ${totalPages}...`
          );

          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = window.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const base64Data = canvas.toDataURL('image/jpeg', 0.9);
            const ocrResult = await OCRService.recognizeImage(base64Data, lang);
            if (ocrResult && ocrResult.text.trim()) {
              pageTexts.push(ocrResult.text.trim());
            }
          }
          canvas.width = 0;
          canvas.height = 0;
        }

        await pdfDoc.destroy();

        const fullText =
          pageTexts.length > 1
            ? pageTexts.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join('\n\n')
            : pageTexts[0] || '';

        const words = fullText.split(/\s+/).filter(Boolean);
        onProgress?.(100, 'OCR Complete!');

        return {
          text: fullText,
          totalPages,
          wordCount: words.length,
          characterCount: fullText.length,
          isScannedOnly: false,
          hasImages: true,
          pageTexts,
        };
      }

      // Native platform (Android / iOS): Use extracted page images
      const initialExtraction = await this.extractTextOnNative(uri);
      const imageUris = initialExtraction.extractedImageUris || [];

      if (imageUris.length === 0) {
        throw new Error(
          lang === 'amh'
            ? 'በሰነዱ ውስጥ ሊነበብ የሚችል የምስል ገጽ አልተገኘም።'
            : 'No extractable scanned page images were found in this PDF.'
        );
      }

      const pageTexts: string[] = [];
      const totalImages = imageUris.length;

      for (let i = 0; i < totalImages; i++) {
        const stepPercent = Math.round(20 + ((i + 1) / totalImages) * 75);
        onProgress?.(
          stepPercent,
          lang === 'amh'
            ? `ገጽ ${i + 1} ከ ${totalImages} በ OCR በማንበብ ላይ...`
            : `Recognizing text on page ${i + 1} of ${totalImages}...`
        );

        const ocrResult = await OCRService.recognizeImage(imageUris[i], lang);
        if (ocrResult && ocrResult.text.trim()) {
          pageTexts.push(ocrResult.text.trim());
        }
      }

      const fullText =
        pageTexts.length > 1
          ? pageTexts.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join('\n\n')
          : pageTexts[0] || '';

      const words = fullText.split(/\s+/).filter(Boolean);
      onProgress?.(100, 'OCR Complete!');

      return {
        text: fullText,
        totalPages: totalImages,
        wordCount: words.length,
        characterCount: fullText.length,
        isScannedOnly: false,
        hasImages: true,
        pageTexts,
        extractedImageUris: imageUris,
      };
    } catch (e: any) {
      console.warn('extractTextWithOCR failed:', e);
      throw new Error(e.message || 'OCR extraction failed for this PDF');
    }
  }

  /**
   * Save extracted text to local cache and open Android share sheet
   */
  static async exportTextFile(content: string, filename = 'eyoTools_extracted.txt') {
    const safeFilename = filename.replace(/[\\/:*?"<>|]/g, '_');

    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = safeFilename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    }

    const fileUri = `${FileSystem.cacheDirectory}${safeFilename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Export Extracted Text',
      });
    }
  }
}
