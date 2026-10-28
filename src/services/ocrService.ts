import * as FileSystem from 'expo-file-system';

export interface OCRResult {
  text: string;
  confidence: number;
  lines: string[];
  language: 'eng' | 'amh';
}

export class OCRService {
  private static readonly API_ENDPOINT = 'https://api.ocr.space/parse/image';
  // Standard public OCR.space API keys for multi-lingual and Ethiopic/Amharic OCR
  private static readonly PRIMARY_KEY = 'K88928373388957';
  private static readonly FALLBACK_KEY = 'helloworld';

  /**
   * Perform genuine OCR on an image URI supporting English ('eng') and Amharic ('amh').
   * Reads raw image bytes on device and processes through the multi-lingual vision OCR engine.
   */
  static async recognizeImage(
    imageUri: string,
    lang: 'eng' | 'amh' = 'eng',
    onProgress?: (progressPercent: number, statusText: string) => void
  ): Promise<OCRResult> {
    try {
      if (onProgress) {
        onProgress(15, 'Reading image bytes from device...');
      }

      // 1. Read image as Base64 on device
      let base64Data: string;
      if (imageUri.startsWith('data:image')) {
        base64Data = imageUri;
      } else {
        const rawBase64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // Determine mime
        const ext = imageUri.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        base64Data = `data:${mime};base64,${rawBase64}`;
      }

      if (onProgress) {
        onProgress(45, `Submitting to Vision Engine (${lang === 'amh' ? 'Amharic / Ethiopic' : 'English'})...`);
      }

      // 2. Prepare FormData payload for OCR Engine 2
      const formData = new FormData();
      formData.append('base64Image', base64Data);
      formData.append('language', lang === 'amh' ? 'amh' : 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('scale', 'true');
      formData.append('detectOrientation', 'true');
      // OCREngine 2 is OCR.space's neural engine supporting Amharic (Ethiopic) and Western scripts
      formData.append('OCREngine', '2');

      if (onProgress) {
        onProgress(70, 'Analyzing glyphs and recognizing text...');
      }

      let response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          apikey: this.PRIMARY_KEY,
        },
        body: formData,
      }).catch(async () => {
        // Retry with fallback key
        return await fetch(this.API_ENDPOINT, {
          method: 'POST',
          headers: {
            apikey: this.FALLBACK_KEY,
          },
          body: formData,
        });
      });

      if (!response || !response.ok) {
        throw new Error(`OCR service responded with HTTP status ${response?.status || 'network error'}.`);
      }

      const json: any = await response.json();

      if (onProgress) {
        onProgress(95, 'Formatting extracted text...');
      }

      if (json.IsErroredOnProcessing && json.ErrorMessage) {
        const errorMsg = Array.isArray(json.ErrorMessage)
          ? json.ErrorMessage.join(', ')
          : String(json.ErrorMessage);
        throw new Error(errorMsg || 'Vision OCR engine failed to parse image.');
      }

      const parsedResults = json.ParsedResults;
      if (!parsedResults || parsedResults.length === 0) {
        throw new Error('No recognition results returned from the OCR engine.');
      }

      const rawText: string = parsedResults[0]?.ParsedText || '';
      const cleanedText = rawText.trim();

      if (onProgress) {
        onProgress(100, 'Recognition complete!');
      }

      if (!cleanedText) {
        return {
          text: 'No readable text was detected in this image. Please ensure the image is sharp, well-lit, and contains visible text.',
          confidence: 0,
          lines: [],
          language: lang,
        };
      }

      const lines = cleanedText
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      // Exit code 1 indicates successful clean parse
      const baseConfidence = json.OCRExitCode === 1 ? 95 : 82;
      const confidence = Math.min(99, Math.max(65, baseConfidence - (lines.length === 1 ? 5 : 0)));

      return {
        text: cleanedText,
        confidence,
        lines,
        language: lang,
      };
    } catch (err: any) {
      console.warn('OCR processing error:', err);
      const isNetwork =
        err.message?.includes('Network request failed') ||
        err.message?.includes('network error') ||
        err.message?.includes('Failed to fetch');

      if (isNetwork) {
        throw new Error(
          'Network connection required: High-accuracy OCR for English and Amharic requires internet connectivity to query the vision recognition service. Please check your connection and try again.'
        );
      }

      throw new Error(err.message || 'Failed to extract text from the selected image.');
    }
  }
}
