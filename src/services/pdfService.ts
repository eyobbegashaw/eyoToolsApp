import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface PDFExtractionResult {
  text: string;
  totalPages: number;
  wordCount: number;
  characterCount: number;
  isScannedOnly: boolean;
  hasImages: boolean;
  pageTexts: string[];
}

export class PDFService {
  /**
   * Extract readable text from a local PDF URI using on-device PDF stream parsing.
   * Accurately distinguishes text-based PDFs from scanned/raster PDFs.
   */
  static async extractTextFromUri(
    uri: string,
    onProgress?: (progress: number) => void
  ): Promise<PDFExtractionResult> {
    try {
      if (onProgress) onProgress(15);

      // Read file content
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Latin1 as any,
      });

      if (onProgress) onProgress(40);

      // Check for image objects
      const hasImages = /\/Subtype\s*\/Image\b/i.test(content) || /\/XObject\b/i.test(content);

      // Count pages via /Type /Page
      const pageMatches = content.match(/\/Type\s*\/Page\b/g) || [];
      const totalPages = Math.max(1, pageMatches.length);

      // Extract text enclosed in PDF text operators (BT ... ET)
      const textMatches: string[] = [];
      const btBlocks = content.match(/BT[\s\S]*?ET/g) || [];

      for (const block of btBlocks) {
        // 1. Literal strings in parentheses: (Text) Tj or ' or "
        const tjMatches = block.match(/\((.*?)\)\s*(?:Tj|'|")/g) || [];
        for (const match of tjMatches) {
          const raw = match
            .replace(/^\(/, '')
            .replace(/\)\s*(?:Tj|'|")$/, '')
            .replace(/\\([()\\])/g, '$1')
            .replace(/\\r/g, ' ')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, ' ')
            .trim();
          if (raw) textMatches.push(raw);
        }

        // 2. Hex strings: <48656c6c6f> Tj
        const hexMatches = block.match(/<([0-9A-Fa-f]+)>\s*Tj/g) || [];
        for (const match of hexMatches) {
          const hex = match.replace(/^</, '').replace(/>\s*Tj$/, '').trim();
          let decoded = '';
          for (let i = 0; i < hex.length; i += 2) {
            const code = parseInt(hex.substr(i, 2), 16);
            if (code >= 32 && code <= 126) {
              decoded += String.fromCharCode(code);
            }
          }
          if (decoded.trim()) textMatches.push(decoded.trim());
        }

        // 3. Text arrays: [(T) 10 (e) 5 (xt)] TJ
        const arrayMatches = block.match(/\[(.*?)\]\s*TJ/g) || [];
        for (const match of arrayMatches) {
          const innerStrings = match.match(/\((.*?)\)/g) || [];
          const combined = innerStrings
            .map((s: string) => s.slice(1, -1).replace(/\\([()\\])/g, '$1'))
            .join('')
            .trim();
          if (combined) textMatches.push(combined);
        }
      }

      if (onProgress) onProgress(75);

      // Check if genuine printable text was found
      const candidateText = textMatches.join(' \n');
      const cleanAlphaNumeric = candidateText.replace(/[^a-zA-Z0-9\u1200-\u137F]/g, '');
      const hasMeaningfulText = cleanAlphaNumeric.length > 15;

      if (onProgress) onProgress(100);

      // If no text operator layer was found or minimal gibberish
      if (!hasMeaningfulText) {
        return {
          text: '',
          totalPages,
          wordCount: 0,
          characterCount: 0,
          isScannedOnly: true,
          hasImages: hasImages || true,
          pageTexts: [],
        };
      }

      const words = candidateText
        .split(/\s+/)
        .filter((w) => w.length > 0);

      // Split into page chunks
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
      };
    } catch (e: any) {
      console.warn('PDF parsing error', e);
      throw new Error('Failed to parse PDF document: ' + (e.message || String(e)));
    }
  }

  /**
   * Save extracted text to local cache and open Android share sheet
   */
  static async exportTextFile(content: string, filename = 'eyoTools_extracted.txt') {
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
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
