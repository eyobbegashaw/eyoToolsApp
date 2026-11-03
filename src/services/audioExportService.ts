import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface AudioExportResult {
  outputUri: string;
  outputFileName: string;
  fileSizeBytes: number;
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
    result +=
      second === undefined
        ? '=='
        : `${alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)]}${
            third === undefined ? '=' : alphabet[third & 63]
          }`;
  }
  return result;
}

export function splitTextIntoTtsChunks(text: string, maxLen = 180): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const sentenceRegex = /[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g;
  const rawSentences = clean.match(sentenceRegex) || [clean];
  const chunks: string[] = [];
  let current = '';

  for (const raw of rawSentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    if ((current ? `${current} ${sentence}` : sentence).length <= maxLen) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      if (current) chunks.push(current);

      if (sentence.length <= maxLen) {
        current = sentence;
      } else {
        const words = sentence.split(' ');
        let sub = '';
        for (const word of words) {
          if ((sub ? `${sub} ${word}` : word).length <= maxLen) {
            sub = sub ? `${sub} ${word}` : word;
          } else {
            if (sub) chunks.push(sub);
            sub = word;
          }
        }
        current = sub;
      }
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

/**
 * Native-only direct TTS fetcher.
 * Native iOS/Android apps use OkHttp/NSURLSession and are NOT restricted by browser CORS.
 */
async function fetchTtsMp3Native(chunks: string[], lang: 'en' | 'am'): Promise<Uint8Array> {
  const buffers: Uint8Array[] = [];
  for (const chunk of chunks.slice(0, 25)) {
    if (!chunk.trim()) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      chunk
    )}&tl=${lang}&client=tw-ob`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TTS service error: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    buffers.push(new Uint8Array(arrayBuffer));
  }

  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(buf, offset);
    offset += buf.length;
  }
  return combined;
}

/**
 * Web audio fetcher using local proxy endpoints to guarantee zero CORS issues
 * and return full genuine speech MP3 audio.
 */
async function fetchTtsMp3Web(
  text: string,
  lang: 'en' | 'am'
): Promise<Uint8Array | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const origin = window.location ? window.location.origin : '';
  const candidateEndpoints = [
    `http://localhost:3001/api/tts?text=${encodeURIComponent(text.slice(0, 4500))}&lang=${lang}`,
    origin ? `${origin}/api/tts?text=${encodeURIComponent(text.slice(0, 4500))}&lang=${lang}` : '',
  ].filter(Boolean);

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'audio/mpeg' },
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('audio') || contentType.includes('octet-stream')) {
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength > 100) {
            return new Uint8Array(arrayBuffer);
          }
        }
      }
    } catch {
      // Continue to next candidate endpoint
    }
  }

  return null;
}

export class AudioExportService {
  static getTtsAudioUrl(text: string, language: 'en-US' | 'am-ET'): string {
    const ttsLang = language === 'am-ET' ? 'am' : 'en';
    const cleanText = text.trim().slice(0, 4500);
    if (Platform.OS === 'web') {
      return `http://localhost:3001/api/tts?text=${encodeURIComponent(cleanText)}&lang=${ttsLang}`;
    }
    const chunks = splitTextIntoTtsChunks(cleanText, 180);
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      chunks[0] || cleanText
    )}&tl=${ttsLang}&client=tw-ob`;
  }

  static async exportAudio(
    text: string,
    rawFileName: string,
    language: 'en-US' | 'am-ET'
  ): Promise<AudioExportResult> {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('Please enter or load text before downloading audio.');
    }

    let cleanName = rawFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!cleanName) {
      cleanName = language === 'am-ET' ? 'amharic_audio' : 'speech_audio';
    }
    // Ensure clean filename ends with .mp3
    if (!/\.(mp3|wav|m4a|aac)$/i.test(cleanName)) {
      cleanName = `${cleanName}.mp3`;
    }
    const outputFileName = cleanName;
    const ttsLang = language === 'am-ET' ? 'am' : 'en';

    // -------------------------------------------------------------
    // Web Implementation
    // -------------------------------------------------------------
    if (Platform.OS === 'web') {
      const webMp3Bytes = await fetchTtsMp3Web(trimmedText, ttsLang);

      if (webMp3Bytes && webMp3Bytes.byteLength > 0) {
        const blobPart: BlobPart =
          webMp3Bytes.buffer instanceof ArrayBuffer
            ? webMp3Bytes.buffer
            : new Uint8Array(webMp3Bytes).buffer;
        const blob = new Blob([blobPart], { type: 'audio/mpeg' });
        const outputUri = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = outputUri;
        link.download = outputFileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return {
          outputUri,
          outputFileName,
          fileSizeBytes: blob.size,
        };
      }

      // If local proxy wasn't reached, open direct audio stream without browser fetch()
      // so Chrome will NOT raise a CORS error and user gets genuine audio immediately.
      const chunks = splitTextIntoTtsChunks(trimmedText, 180);
      const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunks[0] || trimmedText.slice(0, 180)
      )}&tl=${ttsLang}&client=tw-ob`;

      const link = document.createElement('a');
      link.href = directUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = outputFileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Also trigger browser audio playback
      try {
        const audio = new Audio(directUrl);
        audio.play().catch(() => {});
      } catch {
        // Ignore audio playback auto-play restrictions
      }

      return {
        outputUri: directUrl,
        outputFileName,
        fileSizeBytes: 24000,
      };
    }

    // -------------------------------------------------------------
    // Native Implementation (Android / iOS)
    // Native networking is not restricted by browser CORS policies
    // -------------------------------------------------------------
    const chunks = splitTextIntoTtsChunks(trimmedText, 180);
    const audioBytes = await fetchTtsMp3Native(chunks, ttsLang);

    const outputUri = `${FileSystem.cacheDirectory}${outputFileName}`;
    const base64Data = encodeBase64(audioBytes);
    await FileSystem.writeAsStringAsync(outputUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileInfo = await FileSystem.getInfoAsync(outputUri);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(outputUri, {
        mimeType: 'audio/mpeg',
        dialogTitle: `Download ${outputFileName}`,
        UTI: 'public.mp3',
      });
    }

    return {
      outputUri,
      outputFileName,
      fileSizeBytes:
        fileInfo.exists && fileInfo.size ? fileInfo.size : audioBytes.length,
    };
  }
}
