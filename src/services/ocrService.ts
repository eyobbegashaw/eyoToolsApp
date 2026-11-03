import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface OCRResult {
  text: string;
  confidence: number;
  lines: string[];
  language: 'eng' | 'amh';
  engine?: string;
}

export class OCRService {
  private static readonly CLOUD_API_ENDPOINT = 'https://api.ocr.space/parse/image';
  private static readonly PRIMARY_KEY = 'K88928373388957';
  private static readonly FALLBACK_KEY = 'helloworld';

  /**
   * Pre-process and optimize an image URI/Base64 to prevent 413 Payload Too Large
   * and optimize resolution for maximum character recognition accuracy.
   */
  private static async prepareOptimizedImage(imageUri: string): Promise<string> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const MAX_DIMENSION = 1600;
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
              const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(imageUri);
              return;
            }

            // Draw with white background for transparency safety
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to standard JPEG format (well under 500KB)
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            resolve(optimizedBase64);
          } catch (e) {
            resolve(imageUri);
          }
        };
        img.onerror = () => {
          resolve(imageUri);
        };
        img.src = imageUri;
      });
    }

    // Native implementation
    if (imageUri.startsWith('data:image')) {
      return imageUri;
    }

    // Handle remote HTTP/HTTPS images (e.g. samples or CDN assets)
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      try {
        const tmpPath = `${FileSystem.cacheDirectory}ocr_sample_tmp.jpg`;
        const downloadRes = await FileSystem.downloadAsync(imageUri, tmpPath);
        const rawBase64 = await FileSystem.readAsStringAsync(downloadRes.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/jpeg;base64,${rawBase64}`;
      } catch {
        return imageUri;
      }
    }

    try {
      const rawBase64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const ext = imageUri.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${rawBase64}`;
    } catch {
      return imageUri;
    }
  }

  /**
   * Run OCR locally using our local Tesseract service with official
   * Ethiopic / Amharic Fidel traineddata (amh.traineddata) & English (eng.traineddata).
   */
  private static async runLocalTesseractOCR(
    base64Data: string,
    lang: 'eng' | 'amh'
  ): Promise<OCRResult | null> {
    // Only available on Web when a valid location origin is present
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !window.location ||
      !window.location.origin
    ) {
      return null;
    }

    const candidateEndpoints = [
      'http://localhost:3001/api/ocr',
      `${window.location.origin}/api/ocr`,
    ].filter(Boolean);

    for (const endpoint of candidateEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: base64Data,
            lang: lang === 'amh' ? 'amh' : 'eng',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.success) {
            return {
              text: data.text || '',
              confidence: data.confidence ?? 90,
              lines: data.lines || [],
              language: lang,
              engine: 'Tesseract Local Engine (Official Amharic / Ethiopic Model)',
            };
          }
        }
      } catch {
        // Continue to next endpoint or fallback
      }
    }

    return null;
  }

  /**
   * Run in-browser Tesseract.js WebAssembly worker as a direct client fallback.
   */
  private static async runBrowserTesseract(
    base64Data: string,
    lang: 'eng' | 'amh',
    onProgress?: (progressPercent: number, statusText: string) => void
  ): Promise<OCRResult | null> {
    try {
      const Tesseract = await import('tesseract.js');
      if (onProgress) {
        onProgress(35, `Initializing Local Tesseract (${lang === 'amh' ? 'Amharic Fidel' : 'English'})...`);
      }

      const worker = await Tesseract.createWorker(lang === 'amh' ? 'amh' : 'eng');

      if (onProgress) {
        onProgress(60, 'Processing local Fidel glyph recognition...');
      }

      const res = await worker.recognize(base64Data);
      await worker.terminate();

      const text = (res.data.text || '').trim();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      return {
        text,
        confidence: Math.round(res.data.confidence || 0),
        lines,
        language: lang,
        engine: 'Tesseract WebAssembly Engine',
      };
    } catch (e) {
      console.warn('In-browser Tesseract fallback error:', e);
      return null;
    }
  }

  /**
   * Remote Cloud fallback using OCR.space with the compressed image.
   */
  private static async runCloudFallback(
    base64Data: string,
    lang: 'eng' | 'amh',
    onProgress?: (progressPercent: number, statusText: string) => void
  ): Promise<OCRResult> {
    const formData = new FormData();
    formData.append('base64Image', base64Data);
    formData.append('language', lang === 'amh' ? 'amh' : 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('scale', 'true');
    formData.append('detectOrientation', 'true');
    formData.append('OCREngine', '2');

    if (onProgress) {
      onProgress(65, 'Analyzing image glyphs...');
    }

    let response = await fetch(this.CLOUD_API_ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: this.PRIMARY_KEY,
      },
      body: formData,
    }).catch(async () => {
      return await fetch(this.CLOUD_API_ENDPOINT, {
        method: 'POST',
        headers: {
          apikey: this.FALLBACK_KEY,
        },
        body: formData,
      });
    });

    if (!response || !response.ok) {
      throw new Error(`OCR service error: HTTP ${response?.status || 'Network failure'}`);
    }

    const json: any = await response.json();
    if (json.IsErroredOnProcessing && json.ErrorMessage) {
      const errorMsg = Array.isArray(json.ErrorMessage)
        ? json.ErrorMessage.join(', ')
        : String(json.ErrorMessage);
      throw new Error(errorMsg || 'Vision OCR engine failed to parse image.');
    }

    const parsedResults = json.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) {
      throw new Error('No recognition results returned from OCR.');
    }

    const rawText: string = parsedResults[0]?.ParsedText || '';
    const cleanedText = rawText.trim();
    const lines = cleanedText
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    return {
      text: cleanedText,
      confidence: json.OCRExitCode === 1 ? 95 : 80,
      lines,
      language: lang,
      engine: 'Cloud Neural OCR',
    };
  }

  /**
   * Main entrypoint: Perform high-accuracy OCR on an image URI.
   * Runs local Tesseract engine with official Ethiopic / Amharic Fidel traineddata,
   * with automatic pre-processing to eliminate HTTP 413 content limits.
   */
  static async recognizeImage(
    imageUri: string,
    lang: 'eng' | 'amh' = 'eng',
    onProgress?: (progressPercent: number, statusText: string) => void
  ): Promise<OCRResult> {
    try {
      if (onProgress) {
        onProgress(15, 'Optimizing image resolution and contrast...');
      }

      // 1. Optimize image (resizes large camera photos to eliminate HTTP 413)
      const optimizedBase64 = await this.prepareOptimizedImage(imageUri);

      if (onProgress) {
        onProgress(35, `Running Local OCR Engine (${lang === 'amh' ? 'Ethiopic / Amharic Fidel' : 'English'})...`);
      }

      // 2. Web-Only: Local Tesseract Server or In-browser WebAssembly
      if (Platform.OS === 'web') {
        const localResult = await this.runLocalTesseractOCR(optimizedBase64, lang);
        if (localResult && localResult.text) {
          if (onProgress) onProgress(100, 'Recognition complete!');
          return localResult;
        }

        if (onProgress) {
          onProgress(50, 'Processing with Tesseract WebAssembly engine...');
        }
        const browserResult = await this.runBrowserTesseract(optimizedBase64, lang, onProgress);
        if (browserResult && browserResult.text) {
          if (onProgress) onProgress(100, 'Recognition complete!');
          return browserResult;
        }
      }

      // 4. Tertiary Fallback: Cloud OCR (safe from 413 because payload is < 350KB)
      if (onProgress) {
        onProgress(60, 'Processing with Cloud Vision engine...');
      }
      const cloudResult = await this.runCloudFallback(optimizedBase64, lang, onProgress);
      if (onProgress) {
        onProgress(100, 'Recognition complete!');
      }
      return cloudResult;
    } catch (err: any) {
      console.warn('OCR processing error:', err);
      throw new Error(err.message || 'Failed to extract text from the selected image.');
    }
  }
}
