export class SteganographyService {
  static readonly TERMINATOR = '1111111111111110';

  /**
   * Convert text to binary string
   */
  static textToBinary(text: string): string {
    let binary = '';
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      binary += code.toString(2).padStart(8, '0');
    }
    return binary;
  }

  /**
   * Convert binary string back to UTF-8 text
   */
  static binaryToText(binary: string): string {
    let text = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substr(i, 8);
      if (byte.length === 8) {
        text += String.fromCharCode(parseInt(byte, 2));
      }
    }
    return text;
  }

  /**
   * Calculate message capacity for image dimensions
   */
  static calculateCapacity(width: number, height: number): {
    totalBytes: number;
    maxCharacters: number;
  } {
    // 3 color channels (RGB) per pixel
    const totalBits = width * height * 3;
    const availableBits = totalBits - this.TERMINATOR.length;
    const maxCharacters = Math.max(0, Math.floor(availableBits / 8));
    return {
      totalBytes: Math.floor(availableBits / 8),
      maxCharacters,
    };
  }

  /**
   * Embed text into RGBA raw byte array
   */
  static encodeIntoPixels(
    pixels: Uint8Array,
    message: string
  ): { success: boolean; bytesWritten: number } {
    const payload = this.textToBinary(message) + this.TERMINATOR;
    if (payload.length > pixels.length * 0.75) {
      return { success: false, bytesWritten: 0 };
    }

    let payloadIndex = 0;
    for (let i = 0; i < pixels.length && payloadIndex < payload.length; i++) {
      // Skip Alpha channel (every 4th byte)
      if ((i + 1) % 4 === 0) continue;

      const bit = parseInt(payload[payloadIndex], 10);
      pixels[i] = (pixels[i] & ~1) | bit;
      payloadIndex++;
    }

    return { success: true, bytesWritten: payloadIndex };
  }

  /**
   * Extract hidden text from RGBA raw byte array
   */
  static decodeFromPixels(pixels: Uint8Array): {
    hasMessage: boolean;
    message: string;
  } {
    let binaryBuffer = '';
    let foundTerminator = false;

    for (let i = 0; i < pixels.length; i++) {
      // Skip Alpha channel
      if ((i + 1) % 4 === 0) continue;

      const lsb = pixels[i] & 1;
      binaryBuffer += lsb;

      if (binaryBuffer.endsWith(this.TERMINATOR)) {
        foundTerminator = true;
        binaryBuffer = binaryBuffer.slice(0, -this.TERMINATOR.length);
        break;
      }

      // Safeguard max search limit
      if (binaryBuffer.length > 50000) break;
    }

    if (!foundTerminator || binaryBuffer.length === 0) {
      return { hasMessage: false, message: '' };
    }

    try {
      const text = this.binaryToText(binaryBuffer);
      return { hasMessage: true, message: text };
    } catch {
      return { hasMessage: false, message: '' };
    }
  }
}
