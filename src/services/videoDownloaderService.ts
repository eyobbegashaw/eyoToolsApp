import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { VideoInfo, VideoQuality } from '../types';

export class VideoDownloaderService {
  /**
   * Verified working sample URLs for quick testing (Direct MP4, TikTok, CC0 Video, YouTube)
   */
  static getSampleUrls() {
    return [
      {
        title: 'W3Schools Bunny (Direct 720p MP4)',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        platform: 'direct',
      },
      {
        title: 'TikTok (Pets of TikTok - No Watermark HD)',
        url: 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
        platform: 'tiktok',
      },
      {
        title: 'MDN Flower (CC0 Fast Direct MP4)',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        platform: 'direct',
      },
      {
        title: 'Internet Archive Feature Movie (Direct 720p)',
        url: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
        platform: 'direct',
      },
      {
        title: 'YouTube (Rick Astley - Never Gonna Give You Up)',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube',
      },
    ];
  }

  /**
   * Inspect and extract streams from Direct Media URLs, TikTok (No Watermark), YouTube, or Web Streams
   */
  static async fetchVideoInfo(url: string): Promise<VideoInfo> {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      throw new Error('Please enter a valid media URL.');
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    // 1. Try local extraction server ONLY on Web (never block mobile native)
    if (Platform.OS === 'web') {
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
      const endpoints = [
        origin ? `${origin}/api/extract-video` : '',
        'http://localhost:3001/api/extract-video',
      ].filter(Boolean);

      for (const ep of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: cleanUrl }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.info) {
              return data.info as VideoInfo;
            }
          }
        } catch {
          // Fallback to client-side extraction immediately
        }
      }
    }

    const lower = cleanUrl.toLowerCase();

    // 2. YouTube Metadata Extraction via Official oEmbed
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      const videoIdMatch = cleanUrl.match(
        /(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/
      );
      const videoId = videoIdMatch ? videoIdMatch[1] : '';

      let title = 'YouTube Video';
      let author = 'YouTube Creator';
      let thumbnail = videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`,
          {
            signal: controller.signal,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
            },
          }
        );
        clearTimeout(timeoutId);
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          title = data.title || title;
          author = data.author_name || author;
          thumbnail = data.thumbnail_url || thumbnail;
        }
      } catch {
        // Continue with default YouTube info
      }

      return {
        title,
        thumbnail,
        duration: 'YouTube Video',
        author,
        views: 'Official YouTube Stream',
        platform: 'youtube',
        qualities: [
          {
            label: 'YouTube Protected Stream (Online Play)',
            format: 'mp4',
            resolution: 'Official YouTube Quality',
            type: 'video',
            size: 'Protected Stream',
            url: cleanUrl,
          },
        ],
      };
    }

    // 3. TikTok Extraction (No Watermark via TikWM)
    if (lower.includes('tiktok.com')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://www.tikwm.com/api/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          },
          body: 'url=' + encodeURIComponent(cleanUrl),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

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
              size: d.size ? `${(d.size / (1024 * 1024)).toFixed(1)} MB` : 'Clean MP4',
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

          if (qualities.length === 0 && d.wmplay) {
            qualities.push({
              label: 'Original Video (MP4)',
              format: 'mp4',
              resolution: '720p Standard',
              type: 'video',
              isWatermarkFree: false,
              size: 'Direct MP4',
              url: d.wmplay,
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

    // 4. Direct Media Stream (MP4, MP3, WebM, MOV, Audio, Video)
    let contentLength = 0;
    let contentType = '';
    const browserUA =
      'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

    try {
      const headController = new AbortController();
      const headTimeout = setTimeout(() => headController.abort(), 4000);
      const headRes = await fetch(cleanUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': browserUA,
          Accept: '*/*',
        },
        signal: headController.signal,
      });
      clearTimeout(headTimeout);

      if (headRes.ok) {
        contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
        contentType = headRes.headers.get('content-type') || '';
      } else {
        // Fallback to lightweight byte range request if HEAD is rejected by CDN
        const rangeController = new AbortController();
        const rangeTimeout = setTimeout(() => rangeController.abort(), 4000);
        const rangeRes = await fetch(cleanUrl, {
          method: 'GET',
          headers: {
            'User-Agent': browserUA,
            Range: 'bytes=0-10',
          },
          signal: rangeController.signal,
        });
        clearTimeout(rangeTimeout);

        if (rangeRes.ok || rangeRes.status === 206) {
          contentType = rangeRes.headers.get('content-type') || '';
          const cr = rangeRes.headers.get('content-range');
          if (cr && cr.includes('/')) {
            contentLength = parseInt(cr.split('/')[1] || '0', 10);
          }
        }
      }
    } catch {
      // Continue even if server blocks probe
    }

    let urlPath = cleanUrl.split('?')[0];
    let rawFileName = urlPath.split('/').filter(Boolean).pop() || 'media_stream.mp4';
    if (!rawFileName.includes('.')) {
      rawFileName += contentType.includes('audio') ? '.mp3' : '.mp4';
    }
    const ext = rawFileName.split('.').pop()?.toLowerCase() || 'mp4';
    const isAudio =
      ext === 'mp3' || ext === 'm4a' || ext === 'aac' || ext === 'flac' || contentType.includes('audio');

    let hostname = 'Direct Stream';
    try {
      hostname = new URL(cleanUrl).hostname;
    } catch {}

    return {
      title: decodeURIComponent(rawFileName),
      thumbnail: isAudio
        ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
      duration: 'Direct Stream',
      author: hostname,
      views: 'Direct Public Stream',
      platform: 'direct',
      qualities: [
        {
          label: isAudio
            ? `Audio Stream (${ext.toUpperCase()})`
            : `Media Stream (${ext.toUpperCase()})`,
          format: isAudio ? 'mp3' : 'mp4',
          resolution: isAudio ? 'Audio Only' : 'Source Quality',
          type: isAudio ? 'audio' : 'video',
          size:
            contentLength > 0
              ? `${(contentLength / (1024 * 1024)).toFixed(1)} MB`
              : 'Direct Source',
          url: cleanUrl,
        },
      ],
    };
  }

  /**
   * Resumable file downloader supporting Web and Mobile (expo-file-system)
   */
  static createDownloader(
    downloadUrl: string,
    targetFileName: string,
    onProgress: (percent: number, bytesWritten: number, totalBytes: number) => void
  ) {
    const cleanFileName = targetFileName.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
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
              const percent =
                totalBytes > 0
                  ? Math.min(100, Math.round((bytesWritten / totalBytes) * 100))
                  : -1;
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
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
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
