import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import QRCodeLib from 'qrcode';
import jsQR from 'jsqr';

export interface QrOptions {
  fgColor?: string;
  bgColor?: string;
  errorLevel?: 'L' | 'M' | 'Q' | 'H';
  size?: number;
}

export class QrService {
  /**
   * Generate high-resolution PNG data URL for QR code
   */
  static async generateQrDataUrl(
    value: string,
    options: QrOptions = {}
  ): Promise<string> {
    const text = value && value.trim() ? value : 'eyoTools';
    const fg = options.fgColor || '#000000';
    const bg = options.bgColor || '#ffffff';
    const ecl = options.errorLevel || 'M';
    const width = options.size || 512;

    return await QRCodeLib.toDataURL(text, {
      width,
      margin: 2,
      errorCorrectionLevel: ecl,
      color: {
        dark: fg,
        light: bg,
      },
    });
  }

  /**
   * Convert Data URL to File object for Web Share API
   */
  private static dataUrlToFile(dataUrl: string, fileName: string): File | null {
    if (typeof window === 'undefined' || typeof File === 'undefined') return null;
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], fileName, { type: mime });
    } catch {
      return null;
    }
  }

  /**
   * Save / Download the QR code as PNG image
   */
  static async saveQrImage(dataUrl: string, rawFileName: string): Promise<string> {
    let cleanName = rawFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!cleanName) cleanName = 'eyoTools_qr.png';
    if (!cleanName.toLowerCase().endsWith('.png')) cleanName += '.png';

    // Web: direct download anchor
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return dataUrl;
    }

    // Native Mobile: FileSystem + Sharing
    const fileUri = `${FileSystem.cacheDirectory}${cleanName}`;
    const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');

    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: `Save ${cleanName}`,
        UTI: 'public.png',
      });
    }

    return fileUri;
  }

  /**
   * Share the QR code across platforms
   */
  static async shareQr(
    dataUrl: string,
    rawFileName: string,
    content: string
  ): Promise<{ shared: boolean; method: 'web_share' | 'native_share' | 'clipboard_download' | 'cancelled' }> {
    let cleanName = rawFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!cleanName) cleanName = 'eyoTools_qr.png';
    if (!cleanName.toLowerCase().endsWith('.png')) cleanName += '.png';

    // 1. Web Sharing
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      const file = this.dataUrlToFile(dataUrl, cleanName);

      // Web Share API with File
      if (
        navigator.share &&
        file &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: 'eyoTools QR Code',
            text: content,
          });
          return { shared: true, method: 'web_share' };
        } catch (err: any) {
          if (err.name === 'AbortError') return { shared: false, method: 'cancelled' };
        }
      }

      // Web Share API with Link/Text
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'eyoTools QR Code',
            text: content,
            url: content.startsWith('http') ? content : undefined,
          });
          return { shared: true, method: 'web_share' };
        } catch (err: any) {
          if (err.name === 'AbortError') return { shared: false, method: 'cancelled' };
        }
      }

      // Desktop Browser Fallback: Copy to clipboard and trigger download
      await Clipboard.setStringAsync(content);
      await this.saveQrImage(dataUrl, cleanName);
      return { shared: true, method: 'clipboard_download' };
    }

    // 2. Mobile Native Sharing
    const fileUri = `${FileSystem.cacheDirectory}${cleanName}`;
    const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');

    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share QR Code',
        UTI: 'public.png',
      });
      return { shared: true, method: 'native_share' };
    }

    return { shared: false, method: 'cancelled' };
  }

  /**
   * Decode QR code from an image URI (using pure JS jsQR engine)
   */
  static async decodeQrFromImage(imageUri: string): Promise<string | null> {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, canvas.width, canvas.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data) {
              return resolve(code.data);
            }

            const codeInverted = jsQR(imgData.data, canvas.width, canvas.height, {
              inversionAttempts: 'invertFirst',
            });
            resolve(codeInverted?.data || null);
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = imageUri;
      });
    }

    return null;
  }

  /**
   * Save / Download the decoded QR text content as a file
   */
  static async exportDecodedText(text: string, rawFileName: string): Promise<void> {
    let cleanName = rawFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!cleanName) cleanName = 'scanned_qr_output.txt';
    if (!cleanName.toLowerCase().endsWith('.txt')) cleanName += '.txt';

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

    const fileUri = `${FileSystem.cacheDirectory}${cleanName}`;
    await FileSystem.writeAsStringAsync(fileUri, text, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: `Export ${cleanName}`,
        UTI: 'public.plain-text',
      });
    }
  }

  /**
   * Share decoded text content across platforms
   */
  static async shareDecodedText(
    text: string,
    rawFileName: string
  ): Promise<{ shared: boolean; method: string }> {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Decoded QR Content',
            text: text,
            url: text.startsWith('http') ? text : undefined,
          });
          return { shared: true, method: 'web_share' };
        } catch (err: any) {
          if (err.name === 'AbortError') return { shared: false, method: 'cancelled' };
        }
      }

      await Clipboard.setStringAsync(text);
      await this.exportDecodedText(text, rawFileName);
      return { shared: true, method: 'clipboard_download' };
    }

    let cleanName = rawFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!cleanName) cleanName = 'scanned_qr_output.txt';
    if (!cleanName.toLowerCase().endsWith('.txt')) cleanName += '.txt';

    const fileUri = `${FileSystem.cacheDirectory}${cleanName}`;
    await FileSystem.writeAsStringAsync(fileUri, text, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Decoded QR Content',
        UTI: 'public.plain-text',
      });
      return { shared: true, method: 'native_share' };
    }

    await Clipboard.setStringAsync(text);
    return { shared: true, method: 'clipboard' };
  }
}
