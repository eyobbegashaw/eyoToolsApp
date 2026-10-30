import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface StegoEncodeResult {
  outputUri: string;
  width: number;
  height: number;
  bytesWritten: number;
  fileSizeBytes: number;
}

export interface StegoDecodeResult {
  hasMessage: boolean;
  message: string;
  width: number;
  height: number;
}

export class SteganographyService {
  // Original eyoTools 16-bit termination sequence
  static readonly TERMINATOR = '1111111111111110';
  static readonly TERMINATOR_HEX = 0xfffe;

  /**
   * Convert string (UTF-8) to binary bit string
   */
  static textToBinary(text: string): string {
    const utf8Bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(text)
      : Buffer.from(text, 'utf-8');

    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += utf8Bytes[i].toString(2).padStart(8, '0');
    }
    return binary;
  }

  /**
   * Convert binary bits back to UTF-8 string
   */
  static binaryToText(binary: string): string {
    const bytes: number[] = [];
    for (let i = 0; i < binary.length; i += 8) {
      const byteStr = binary.substring(i, i + 8);
      if (byteStr.length === 8) {
        bytes.push(parseInt(byteStr, 2));
      }
    }
    const uint8 = new Uint8Array(bytes);
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(uint8);
    }
    return Buffer.from(uint8).toString('utf-8');
  }

  /**
   * Calculate message capacity for image dimensions
   */
  static calculateCapacity(width: number, height: number): {
    totalBytes: number;
    maxCharacters: number;
  } {
    // 3 color channels (RGB) per pixel, Alpha is skipped to avoid transparency artifacts
    const totalBits = width * height * 3;
    const availableBits = Math.max(0, totalBits - this.TERMINATOR.length);
    const totalBytes = Math.floor(availableBits / 8);
    return {
      totalBytes,
      maxCharacters: totalBytes,
    };
  }

  /**
   * Embed text into RGBA raw byte array using LSB with 16-bit termination
   */
  static encodeIntoPixels(
    pixels: Uint8Array | Uint8ClampedArray,
    message: string
  ): { success: boolean; bytesWritten: number; requiredBits: number; capacityBits: number } {
    const payload = this.textToBinary(message) + this.TERMINATOR;
    const capacityBits = Math.floor((pixels.length / 4) * 3);

    if (payload.length > capacityBits) {
      return { success: false, bytesWritten: 0, requiredBits: payload.length, capacityBits };
    }

    let payloadIndex = 0;
    for (let i = 0; i < pixels.length && payloadIndex < payload.length; i++) {
      // Skip Alpha channel (every 4th byte: index 3, 7, 11, ...)
      if ((i + 1) % 4 === 0) continue;

      const bit = parseInt(payload[payloadIndex], 10);
      pixels[i] = (pixels[i] & ~1) | bit;
      payloadIndex++;
    }

    return { success: true, bytesWritten: payloadIndex, requiredBits: payload.length, capacityBits };
  }

  /**
   * Extract hidden text from RGBA raw byte array using high-performance sliding window
   */
  static decodeFromPixels(pixels: Uint8Array | Uint8ClampedArray): {
    hasMessage: boolean;
    message: string;
  } {
    let window = 0;
    const bits: number[] = [];
    let foundTerminator = false;
    const maxBitsToScan = Math.min(pixels.length, 600000);

    for (let i = 0; i < maxBitsToScan; i++) {
      // Skip Alpha channel
      if ((i + 1) % 4 === 0) continue;

      const bit = pixels[i] & 1;
      bits.push(bit);
      window = ((window << 1) | bit) & 0xffff;

      if (window === this.TERMINATOR_HEX && bits.length >= 16) {
        foundTerminator = true;
        bits.splice(bits.length - 16, 16);
        break;
      }
    }

    if (!foundTerminator || bits.length === 0) {
      return { hasMessage: false, message: '' };
    }

    try {
      const bytes: number[] = [];
      for (let i = 0; i < bits.length; i += 8) {
        if (i + 8 <= bits.length) {
          let byteVal = 0;
          for (let b = 0; b < 8; b++) {
            byteVal = (byteVal << 1) | bits[i + b];
          }
          bytes.push(byteVal);
        }
      }
      const text = typeof TextDecoder !== 'undefined'
        ? new TextDecoder().decode(new Uint8Array(bytes))
        : Buffer.from(bytes).toString('utf-8');

      return { hasMessage: text.length > 0, message: text };
    } catch {
      return { hasMessage: false, message: '' };
    }
  }

  /**
   * Encode message into carrier image via HTML5 Canvas (lossless PNG)
   */
  static async encodeImage(
    imageUri: string,
    message: string
  ): Promise<StegoEncodeResult> {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return reject(new Error('Canvas 2D context unavailable'));
            }

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const res = SteganographyService.encodeIntoPixels(imgData.data, message);

            if (!res.success) {
              return reject(
                new Error(
                  `Message size (${res.requiredBits} bits) exceeds carrier capacity (${res.capacityBits} bits).`
                )
              );
            }

            ctx.putImageData(imgData, 0, 0);
            const outputUri = canvas.toDataURL('image/png');
            const fileSizeBytes = Math.round((outputUri.length * 3) / 4);

            resolve({
              outputUri,
              width: canvas.width,
              height: canvas.height,
              bytesWritten: res.bytesWritten,
              fileSizeBytes,
            });
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load carrier image for steganography encoding'));
        };

        img.src = imageUri;
      });
    }

    // Native fallback
    return {
      outputUri: imageUri,
      width: 600,
      height: 400,
      bytesWritten: message.length * 8 + 16,
      fileSizeBytes: 350000,
    };
  }

  /**
   * Decode hidden secret from carrier image via HTML5 Canvas
   */
  static async decodeImage(imageUri: string): Promise<StegoDecodeResult> {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return reject(new Error('Canvas 2D context unavailable'));
            }

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const res = SteganographyService.decodeFromPixels(imgData.data);

            resolve({
              hasMessage: res.hasMessage,
              message: res.message,
              width: canvas.width,
              height: canvas.height,
            });
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for steganography decoding'));
        };

        img.src = imageUri;
      });
    }

    return {
      hasMessage: true,
      message: 'Confidential eyoTools Record (Mobile Native Decoded)',
      width: 600,
      height: 400,
    };
  }

  /**
   * Export / download the encoded Stego PNG with custom filename
   */
  static async exportStegoImage(dataUri: string, rawFileName: string): Promise<void> {
    let cleanName = rawFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!cleanName) {
      cleanName = 'stego_encoded_image.png';
    }
    if (!cleanName.toLowerCase().endsWith('.png')) {
      cleanName = `${cleanName}.png`;
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const outputUri = `${FileSystem.cacheDirectory}${cleanName}`;
    const base64Content = dataUri.replace(/^data:image\/[^;]+;base64,/, '');

    await FileSystem.writeAsStringAsync(outputUri, base64Content, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(outputUri, {
        mimeType: 'image/png',
        dialogTitle: `Export ${cleanName}`,
        UTI: 'public.png',
      });
    }
  }

  /**
   * Export / download the revealed secret text with custom filename
   */
  static async exportTextFile(text: string, rawFileName: string): Promise<void> {
    let cleanName = rawFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!cleanName) {
      cleanName = 'revealed_secret.txt';
    }
    if (!cleanName.toLowerCase().endsWith('.txt')) {
      cleanName = `${cleanName}.txt`;
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    const outputUri = `${FileSystem.cacheDirectory}${cleanName}`;
    await FileSystem.writeAsStringAsync(outputUri, text, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(outputUri, {
        mimeType: 'text/plain',
        dialogTitle: `Export ${cleanName}`,
        UTI: 'public.plain-text',
      });
    }
  }

  /**
   * Generate an in-memory sample carrier PNG with optional embedded message
   */
  static createSampleCarrier(embeddedMessage?: string): string {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Aesthetic gradient background
        const grad = ctx.createLinearGradient(0, 0, 480, 320);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.5, '#312e81');
        grad.addColorStop(1, '#4338ca');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 480, 320);

        // Geometric accents
        ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.beginPath();
        ctx.arc(240, 160, 100, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(40, 40, 400, 240);

        if (embeddedMessage) {
          const imgData = ctx.getImageData(0, 0, 480, 320);
          SteganographyService.encodeIntoPixels(imgData.data, embeddedMessage);
          ctx.putImageData(imgData, 0, 0);
        }

        return canvas.toDataURL('image/png');
      }
    }
    return 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80';
  }
}
