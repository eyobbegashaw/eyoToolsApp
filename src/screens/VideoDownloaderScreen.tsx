import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import {
  Video,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  XCircle,
  Music,
  Share2,
} from 'lucide-react-native';
import { VideoDownloaderService } from '../services/videoDownloaderService';
import { StorageService } from '../services/storageService';
import { VideoInfo, VideoQuality } from '../types';
import { useTheme } from '../theme/ThemeContext';

export const VideoDownloaderScreen: React.FC = () => {
  const { colors, t, fontScale } = useTheme();

  const [url, setUrl] = useState<string>('');
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [bytesWritten, setBytesWritten] = useState<number>(0);
  const [totalBytesExpected, setTotalBytesExpected] = useState<number>(0);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);

  const activeDownloaderRef = useRef<any>(null);

  const sampleUrls = VideoDownloaderService.getSampleUrls();

  const formatSize = (bytes: number): string => {
    if (bytes <= 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const handleFetchInfo = async () => {
    if (!url.trim()) return;

    setIsFetching(true);
    setVideoInfo(null);
    setDownloadSuccess(false);
    setDownloadedFileUri(null);

    try {
      const info = await VideoDownloaderService.fetchVideoInfo(url);
      setVideoInfo(info);
      if (info.qualities.length > 0) {
        setSelectedQuality(info.qualities[0]);
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to analyze stream URL');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !selectedQuality) return;

    setIsDownloading(true);
    setProgress(0);
    setBytesWritten(0);
    setTotalBytesExpected(0);
    setDownloadSuccess(false);
    setDownloadedFileUri(null);

    try {
      const safeTitle = (videoInfo.title || 'media_file')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40);
      const targetFileName = `${safeTitle}.${selectedQuality.format}`;

      const downloader = VideoDownloaderService.createDownloader(
        selectedQuality.url,
        targetFileName,
        (percent, written, total) => {
          if (percent >= 0) {
            setProgress(percent);
          }
          setBytesWritten(written);
          setTotalBytesExpected(total);
        }
      );

      activeDownloaderRef.current = downloader;

      const result = await downloader.start();
      setDownloadedFileUri(result.uri);
      setProgress(100);
      setIsDownloading(false);
      setDownloadSuccess(true);

      await StorageService.addHistoryItem({
        toolId: 'youtube',
        title: videoInfo.title,
        snippet: `${selectedQuality.label} • Saved to Device`,
        fileSize: formatSize(result.sizeBytes),
        fileType: selectedQuality.format.toUpperCase(),
      });
    } catch (e: any) {
      setIsDownloading(false);
      if (e.message?.includes('pause') || e.message?.includes('cancel')) {
        Alert.alert('Download Cancelled', 'Media download was stopped.');
      } else {
        Alert.alert(t.error, e.message || 'Download failed. Please check the media URL.');
      }
    } finally {
      activeDownloaderRef.current = null;
    }
  };

  const handleCancelDownload = async () => {
    if (activeDownloaderRef.current) {
      await activeDownloaderRef.current.cancel();
      activeDownloaderRef.current = null;
    }
    setIsDownloading(false);
    setProgress(0);
    setBytesWritten(0);
  };

  const handleShareDownloaded = async () => {
    if (downloadedFileUri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(downloadedFileUri);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Info */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(220, 38, 38, 0.15)' }]}>
            <Video size={22} color="#dc2626" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.youtube}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.youtube_desc}
            </Text>
          </View>
        </View>

        {/* URL Input */}
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t.enter_url}
        </Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="https://... direct .mp4, .webm, or media stream"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: colors.cardSecondary,
              color: colors.text,
              fontSize: 12 * fontScale,
            },
          ]}
        />

        <TouchableOpacity
          onPress={handleFetchInfo}
          disabled={isFetching || !url.trim()}
          style={[
            styles.analyzeBtn,
            { backgroundColor: '#dc2626', opacity: isFetching || !url.trim() ? 0.6 : 1 },
          ]}
        >
          {isFetching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Sparkles size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.analyzeBtnText}>Inspect Media Stream</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sample Direct URLs */}
        <View style={styles.sampleSection}>
          <Text style={[styles.sampleTitle, { color: colors.textMuted }]}>
            Verified Sample Direct Media Streams:
          </Text>
          {sampleUrls.map((s, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setUrl(s.url);
                setVideoInfo(null);
                setDownloadSuccess(false);
              }}
              style={[styles.sampleItem, { backgroundColor: colors.cardSecondary }]}
            >
              <Text
                style={[styles.sampleItemText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                • {s.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Video Details & Quality Selection */}
      {videoInfo && (
        <View
          style={[
            styles.videoCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: videoInfo.thumbnail }} style={styles.thumbnail} />
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{videoInfo.duration}</Text>
            </View>
          </View>

          <Text style={[styles.videoTitle, { color: colors.text }]}>
            {videoInfo.title}
          </Text>
          <Text style={[styles.videoAuthor, { color: colors.textMuted }]}>
            Host: {videoInfo.author} • {videoInfo.views}
          </Text>

          {/* Quality List */}
          <Text style={[styles.qualityLabel, { color: colors.textMuted }]}>
            Select Stream / Quality:
          </Text>
          {videoInfo.qualities.map((q, idx) => {
            const isSelected = selectedQuality?.label === q.label;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedQuality(q)}
                style={[
                  styles.qualityOption,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(220, 38, 38, 0.1)'
                      : colors.cardSecondary,
                    borderColor: isSelected ? '#dc2626' : colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.qualityInfo}>
                  <Text style={[styles.qualityName, { color: colors.text }]}>
                    {q.label}
                  </Text>
                  <Text style={[styles.qualityMeta, { color: colors.textMuted }]}>
                    Format: {q.format.toUpperCase()} • Size: {q.size}
                  </Text>
                </View>
                {isSelected && <CheckCircle2 size={18} color="#dc2626" />}
              </TouchableOpacity>
            );
          })}

          {/* Download Action */}
          {!isDownloading && !downloadSuccess && (
            <TouchableOpacity
              onPress={handleDownload}
              style={[styles.downloadBtn, { backgroundColor: '#dc2626' }]}
            >
              <Download size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadBtnText}>{t.download}</Text>
            </TouchableOpacity>
          )}

          {isDownloading && (
            <View style={styles.downloadingBox}>
              <View style={[styles.progressBarBg, { backgroundColor: colors.cardSecondary }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(5, progress)}%`,
                      backgroundColor: '#dc2626',
                    },
                  ]}
                />
              </View>
              <View style={styles.downloadingTextRow}>
                <Text style={[styles.downloadingText, { color: colors.text }]}>
                  {progress > 0 ? `${t.downloading} (${progress}%)` : t.downloading}
                  {totalBytesExpected > 0
                    ? ` • ${formatSize(bytesWritten)} / ${formatSize(totalBytesExpected)}`
                    : bytesWritten > 0
                    ? ` • ${formatSize(bytesWritten)} written`
                    : ''}
                </Text>
                <TouchableOpacity onPress={handleCancelDownload}>
                  <Text style={styles.cancelText}>{t.download_cancel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {downloadSuccess && (
            <View style={styles.successBox}>
              <View style={styles.successRow}>
                <CheckCircle2 size={18} color="#10b981" style={{ marginRight: 8 }} />
                <Text style={styles.successText}>{t.download_complete}</Text>
              </View>
              <Text style={[styles.savedPathText, { color: colors.textMuted }]}>
                File saved locally: {videoInfo.title}.{selectedQuality?.format}
              </Text>
              <TouchableOpacity
                onPress={handleShareDownloaded}
                style={[styles.shareBtn, { backgroundColor: colors.primary }]}
              >
                <Share2 size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.shareBtnText}>Open / Share Downloaded File</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Legal & Terms Notice Callout */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
        ]}
      >
        <Info size={15} color={colors.cyan} style={{ marginRight: 8, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            {t.video_notice_title}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t.video_notice_desc}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  analyzeBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sampleSection: {
    marginTop: 6,
  },
  sampleTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  sampleItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  sampleItemText: {
    fontSize: 11,
  },
  videoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  thumbnailContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  videoAuthor: {
    fontSize: 12,
    marginBottom: 12,
  },
  qualityLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  qualityInfo: {
    flex: 1,
  },
  qualityName: {
    fontSize: 13,
    fontWeight: '600',
  },
  qualityMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  downloadBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  downloadingBox: {
    marginTop: 12,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  downloadingTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  downloadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },
  savedPathText: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 8,
  },
  shareBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
