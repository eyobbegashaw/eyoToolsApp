import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { VideoInfo, VideoQuality } from '../types';

export class VideoDownloaderService {
  /**
   * Verified direct media URLs with public domain / Creative Commons streams
   * for testing direct video and audio downloads
   */
  static getSampleUrls() {
    return [
      {
        title: 'Big Buck Bunny (Blender Open Movie - Direct 720p MP4)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      },
      {
        title: 'Elephants Dream (Creative Commons Open Film - 1080p MP4)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      },
      {
        title: 'For Bigger Blazes (Google Sample Media - 480p MP4)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      },
      {
        title: 'We Are Going On Bullrun (Google Sample Media - Direct MP4)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      },
    ];
  }

  /**
   * Verify if URL is from a protected / DRM platform that requires a backend proxy
   */
  static isRestrictedPlatform(url: string): { isRestricted: boolean; platformName?: string } {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return { isRestricted: true, platformName: 'YouTube' };
    }
    if (lower.includes('tiktok.com')) {
      return { isRestricted: true, platformName: 'TikTok' };
    }
    if (lower.includes('instagram.com')) {
      return { isRestricted: true, platformName: 'Instagram' };
    }
    if (lower.includes('facebook.com') || lower.includes('fb.watch')) {
      return { isRestricted: true, platformName: 'Facebook' };
    }
    if (lower.includes('twitter.com') || lower.includes('x.com')) {
      return { isRestricted: true, platformName: 'Twitter/X' };
    }
    return { isRestricted: false };
  }

  /**
   * Inspect and validate direct media stream URL
   */
  static async fetchVideoInfo(url: string): Promise<VideoInfo> {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      throw new Error('Please enter a valid media URL.');
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    // Check for protected platforms
    const restriction = this.isRestrictedPlatform(cleanUrl);
    if (restriction.isRestricted) {
      throw new Error(
        `Direct extraction for ${restriction.platformName} is not supported on client-only mobile without a dedicated extraction backend proxy (due to dynamic cipher signatures and DRM restrictions). ` +
        `Please use direct media links (.mp4, .webm, .mp3, .m4a, or public CDN streams) or test with the verified sample media streams below.`
      );
    }

    // Attempt real HTTP HEAD inspection to verify media availability & headers
    let contentLength = 0;
    let contentType = '';
    let isReachable = false;

    try {
      const response = await fetch(cleanUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'eyoTools-Mobile-Client/1.0',
        },
      });

      if (response.ok) {
        isReachable = true;
        const lengthHeader = response.headers.get('content-length');
        if (lengthHeader) {
          contentLength = parseInt(lengthHeader, 10) || 0;
        }
        contentType = response.headers.get('content-type') || '';
      }
    } catch {
      // If HEAD is blocked by CORS/server, direct GET download may still work
      isReachable = true;
    }

    const urlPath = cleanUrl.split('?')[0];
    const rawFileName = urlPath.split('/').pop() || 'media_stream.mp4';
    const ext = rawFileName.split('.').pop()?.toLowerCase() || 'mp4';
    const isAudio = ext === 'mp3' || ext === 'm4a' || ext === 'aac' || contentType.includes('audio');

    // Format human readable size
    let formattedSize = 'Unknown Size';
    if (contentLength > 0) {
      const mb = contentLength / (1024 * 1024);
      formattedSize = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(contentLength / 1024)} KB`;
    } else {
      formattedSize = 'Direct Stream';
    }

    const qualities: VideoQuality[] = [
      {
        label: isAudio ? `Audio Stream (${ext.toUpperCase()})` : `Direct Media Stream (${ext.toUpperCase()})`,
        format: (isAudio ? 'mp3' : 'mp4') as 'mp4' | 'mp3',
        resolution: isAudio ? 'Audio Only' : 'Native Source Quality',
        size: formattedSize,
        url: cleanUrl,
      },
    ];

    return {
      title: decodeURIComponent(rawFileName),
      thumbnail: isAudio
        ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
      duration: 'Direct Stream',
      author: new URL(cleanUrl).hostname,
      views: 'Public Stream',
      qualities,
    };
  }

  /**
   * Genuine resumable file downloader with real-time byte progression
   */
  static createDownloader(
    downloadUrl: string,
    targetFileName: string,
    onProgress: (percent: number, bytesWritten: number, totalBytes: number) => void
  ) {
    const cleanFileName = targetFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileUri = `${FileSystem.documentDirectory}${cleanFileName}`;

    let isCancelled = false;

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
          // Chunked stream where total size is omitted by server
          onProgress(-1, written, 0);
        }
      }
    );

    return {
      downloadResumable,
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
        } catch {
          // Ignore
        }
      },
      share: async () => {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
      },
    };
  }
}
