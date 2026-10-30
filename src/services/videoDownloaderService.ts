import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { VideoInfo, VideoQuality } from '../types';

export class VideoDownloaderService {
  /**
   * Verified sample URLs for quick testing (YouTube, TikTok, and direct streams)
   */
  static getSampleUrls() {
    return [
      {
        title: 'TikTok (Pets of TikTok - Verified No Watermark HD)',
        url: 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
        platform: 'tiktok',
      },
      {
        title: 'YouTube (Rick Astley - Never Gonna Give You Up)',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube',
      },
      {
        title: 'Big Buck Bunny (Direct 720p Open Movie MP4)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        platform: 'direct',
      },
      {
        title: 'Elephants Dream (Creative Commons 1080p MP4)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        platform: 'direct',
      },
    ];
  }

  /**
   * Inspect and extract streams from YouTube, TikTok (No Watermark), or direct media URLs
   */
  static async fetchVideoInfo(url: string): Promise<VideoInfo> {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      throw new Error('Please enter a valid media URL.');
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    // 1. Try local extraction server
    const endpoints = [
      'http://localhost:3001/api/extract-video',
      typeof window !== 'undefined' ? `${window.location.origin}/api/extract-video` : '',
    ].filter(Boolean);

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.info) {
            return data.info as VideoInfo;
          }
        }
      } catch {
        // Fallback to client-side extraction
      }
    }

    // 2. Direct client fallback for TikTok (No Watermark via TikWM)
    const lower = cleanUrl.toLowerCase();
    if (lower.includes('tiktok.com')) {
      try {
        const res = await fetch('https://www.tikwm.com/api/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'url=' + encodeURIComponent(cleanUrl),
        });
        const json = await res.json();
        if (json.code === 0 && json.data) {
          const d = json.data;
          const qualities: VideoQuality[] = [];

          if (d.hdplay) {
            qualities.push({
              label: 'No Watermark (HD MP4)',
              format: 'mp4',
              resolution: '1080p HD',
              type: 'video',
              isWatermarkFree: true,
              size: d.size ? `${(d.size / (1024 * 1024)).toFixed(1)} MB` : 'Direct HD',
              url: d.hdplay,
            });
          }

          if (d.play) {
            qualities.push({
              label: 'No Watermark (Clean MP4)',
              format: 'mp4',
              resolution: '720p Clean',
              type: 'video',
              isWatermarkFree: true,
              size: d.size ? `${(d.size / (1024 * 1024)).toFixed(1)} MB` : 'Original MP4',
              url: d.play,
            });
          }

          if (d.music) {
            qualities.push({
              label: 'Original Soundtrack (MP3)',
              format: 'mp3',
              resolution: 'Audio 320 kbps',
              type: 'audio',
              isWatermarkFree: true,
              size: 'Soundtrack MP3',
              url: d.music,
            });
          }

          return {
            title: d.title || 'TikTok Video',
            thumbnail: d.cover || d.origin_cover || '',
            duration: d.duration ? `${d.duration}s` : 'TikTok Short',
            author: `@${d.author?.unique_id || d.author?.nickname || 'TikTok Creator'}`,
            views: `${d.play_count ? d.play_count.toLocaleString() : 'Trending'} views`,
            platform: 'tiktok',
            qualities,
          };
        }
      } catch (err: any) {
        throw new Error(`Failed to extract TikTok video: ${err.message}`);
      }
    }

    // 3. Direct Media Stream Fallback
    let contentLength = 0;
    let contentType = '';
    try {
      const headRes = await fetch(cleanUrl, { method: 'HEAD' });
      if (headRes.ok) {
        contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
        contentType = headRes.headers.get('content-type') || '';
      }
    } catch {}

    const urlPath = cleanUrl.split('?')[0];
    const rawFileName = urlPath.split('/').pop() || 'media_stream.mp4';
    const ext = rawFileName.split('.').pop()?.toLowerCase() || 'mp4';
    const isAudio = ext === 'mp3' || ext === 'm4a' || ext === 'aac' || contentType.includes('audio');

    return {
      title: decodeURIComponent(rawFileName),
      thumbnail: isAudio
        ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
      duration: 'Direct Stream',
      author: new URL(cleanUrl).hostname,
      views: 'Direct Public Stream',
      platform: 'direct',
      qualities: [
        {
          label: isAudio ? `Audio Stream (${ext.toUpperCase()})` : `Media Stream (${ext.toUpperCase()})`,
          format: isAudio ? 'mp3' : 'mp4',
          resolution: isAudio ? 'Audio Only' : 'Source Quality',
          type: isAudio ? 'audio' : 'video',
          size: contentLength > 0 ? `${(contentLength / (1024 * 1024)).toFixed(1)} MB` : 'Direct Source',
          url: cleanUrl,
        },
      ],
    };
  }

  /**
   * Resumable file downloader supporting Web (fetch + streaming blob) and Mobile (expo-file-system)
   */
  static createDownloader(
    downloadUrl: string,
    targetFileName: string,
    onProgress: (percent: number, bytesWritten: number, totalBytes: number) => void
  ) {
    const cleanFileName = targetFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    let isCancelled = false;

    // Web Implementation
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const proxyDownloadUrl = `http://localhost:3001/api/proxy-download?url=${encodeURIComponent(
        downloadUrl
      )}&name=${encodeURIComponent(cleanFileName)}`;

      let abortController: AbortController | null = null;
      let blobUrl = '';

      return {
        fileUri: '',
        start: async () => {
          abortController = new AbortController();

          // Try downloading via proxy or directly
          let response: Response;
          try {
            response = await fetch(proxyDownloadUrl, { signal: abortController.signal });
          } catch {
            response = await fetch(downloadUrl, { signal: abortController.signal });
          }

          if (!response.ok) {
            throw new Error(`Download HTTP error: ${response.status}`);
          }

          const contentLength = response.headers.get('content-length');
          const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
          let bytesWritten = 0;

          if (!response.body) {
            const blob = await response.blob();
            blobUrl = URL.createObjectURL(blob);
            onProgress(100, blob.size, blob.size);
            VideoDownloaderService.triggerBrowserDownload(blobUrl, cleanFileName);
            return { uri: blobUrl, sizeBytes: blob.size };
          }

          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];

          while (!isCancelled) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              bytesWritten += value.length;
              const percent = totalBytes > 0 ? Math.min(100, Math.round((bytesWritten / totalBytes) * 100)) : -1;
              onProgress(percent, bytesWritten, totalBytes);
            }
          }

          if (isCancelled) {
            throw new Error('Download was cancelled by user.');
          }

          const fullBlob = new Blob(chunks as BlobPart[], {
            type: cleanFileName.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4',
          });
          blobUrl = URL.createObjectURL(fullBlob);

          // Trigger download to browser
          VideoDownloaderService.triggerBrowserDownload(blobUrl, cleanFileName);

          return {
            uri: blobUrl,
            sizeBytes: fullBlob.size,
          };
        },
        cancel: async () => {
          isCancelled = true;
          if (abortController) {
            abortController.abort();
          }
        },
        share: async () => {
          if (typeof navigator !== 'undefined' && navigator.share) {
            try {
              await navigator.share({
                title: cleanFileName,
                url: blobUrl || downloadUrl,
              });
            } catch {}
          }
        },
      };
    }

    // Mobile Native Implementation (expo-file-system)
    const fileUri = `${FileSystem.documentDirectory}${cleanFileName}`;

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      fileUri,
      {
        headers: {
          'User-Agent': 'eyoTools-Mobile-Downloader/1.0',
        },
      },
      (downloadProgress) => {
        if (isCancelled) return;
        const total = downloadProgress.totalBytesExpectedToWrite;
        const written = downloadProgress.totalBytesWritten;

        if (total > 0) {
          const percent = Math.min(100, Math.round((written / total) * 100));
          onProgress(percent, written, total);
        } else {
          onProgress(-1, written, 0);
        }
      }
    );

    return {
      fileUri,
      start: async () => {
        const result = await downloadResumable.downloadAsync();
        if (!result || !result.uri) {
          throw new Error('Download failed to save file to device storage.');
        }

        const info = await FileSystem.getInfoAsync(result.uri);
        if (!info.exists) {
          throw new Error('Downloaded file could not be verified on device.');
        }

        return {
          uri: result.uri,
          sizeBytes: info.size,
        };
      },
      cancel: async () => {
        isCancelled = true;
        try {
          await downloadResumable.pauseAsync();
        } catch {}
      },
      share: async () => {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
      },
    };
  }

  /**
   * Helper to trigger a browser download
   */
  private static triggerBrowserDownload(url: string, fileName: string) {
    if (typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
