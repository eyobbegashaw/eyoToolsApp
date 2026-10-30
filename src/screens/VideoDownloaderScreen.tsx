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
  Platform,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import {
  Video,
  Download,
  CheckCircle2,
  Sparkles,
  Info,
  Music,
  Share2,
  FileText,
  ShieldCheck,
  Sliders,
  Check,
} from 'lucide-react-native';
import { VideoDownloaderService } from '../services/videoDownloaderService';
import { StorageService } from '../services/storageService';
import { VideoInfo, VideoQuality } from '../types';
import { useTheme } from '../theme/ThemeContext';

export const VideoDownloaderScreen: React.FC = () => {
  const { colors, t, language, fontScale } = useTheme();

  const [url, setUrl] = useState<string>('');
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality | null>(null);
  const [formatFilter, setFormatFilter] = useState<'all' | 'video' | 'audio'>('all');
  const [outputFileName, setOutputFileName] = useState<string>('media_download.mp4');

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
    if (isFetching || !url.trim()) return;

    setIsFetching(true);
    setVideoInfo(null);
    setDownloadSuccess(false);
    setDownloadedFileUri(null);

    try {
      const info = await VideoDownloaderService.fetchVideoInfo(url);
      setVideoInfo(info);

      if (info.qualities.length > 0) {
        // Default to best video stream if available, otherwise first stream
        const initialQuality =
          info.qualities.find((q) => q.type === 'video' || q.format === 'mp4') ||
          info.qualities[0];
        setSelectedQuality(initialQuality);

        const safeTitle = (info.title || 'media_file')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 36);
        setOutputFileName(`${safeTitle}.${initialQuality.format}`);
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to analyze stream URL');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSelectQuality = (q: VideoQuality) => {
    setSelectedQuality(q);
    if (videoInfo) {
      const safeTitle = (videoInfo.title || 'media_file')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 36);
      setOutputFileName(`${safeTitle}.${q.format}`);
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
      let cleanTargetName = outputFileName.trim().replace(/[/\\?%*:|"<>]/g, '_');
      if (!cleanTargetName) {
        cleanTargetName = `download.${selectedQuality.format}`;
      }
      if (!cleanTargetName.toLowerCase().endsWith(`.${selectedQuality.format}`)) {
        cleanTargetName = `${cleanTargetName}.${selectedQuality.format}`;
      }

      const downloader = VideoDownloaderService.createDownloader(
        selectedQuality.url,
        cleanTargetName,
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
        title: cleanTargetName,
        snippet: `${selectedQuality.label} • ${videoInfo.author}`,
        fileSize: formatSize(result.sizeBytes),
        fileType: selectedQuality.format.toUpperCase(),
      });

      Alert.alert(
        language === 'am' ? 'ተጠናቋል' : 'Download Complete',
        language === 'am'
          ? `ፋይል "${cleanTargetName}" በተሳካ ሁኔታ ወርዷል`
          : `File "${cleanTargetName}" downloaded successfully!`
      );
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
    if (activeDownloaderRef.current && activeDownloaderRef.current.share) {
      await activeDownloaderRef.current.share();
      return;
    }

    if (downloadedFileUri) {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: outputFileName,
            url: downloadedFileUri,
          });
        } catch {}
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedFileUri);
      }
    }
  };

  // Filtered qualities based on selected format tab
  const displayedQualities = videoInfo?.qualities.filter((q) => {
    if (formatFilter === 'video') return q.type === 'video' || q.format === 'mp4';
    if (formatFilter === 'audio') return q.type === 'audio' || q.format === 'mp3';
    return true;
  });

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
              {language === 'am'
                ? 'YouTube፣ TikTok (ያለ ዋተርማርክ) እና ማንኛውንም የቪዲዮ አድራሻ በቀላሉ አውርድ'
                : 'Download YouTube, TikTok (No Watermark), and direct media streams'}
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
          placeholder="Paste YouTube, TikTok, or direct stream link..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: colors.cardSecondary,
              color: colors.text,
              fontSize: 12 * fontScale,
            },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          onPress={handleFetchInfo}
          disabled={isFetching || !url.trim()}
          style={[
            styles.analyzeBtn,
            {
              backgroundColor: '#dc2626',
              opacity: isFetching || !url.trim() ? 0.6 : 1,
            },
          ]}
        >
          {isFetching ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.analyzeBtnText}>{t.fetching_info}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Sparkles size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.analyzeBtnText}>
                {language === 'am' ? 'ቪዲዮውን መርምር' : 'Inspect & Extract Streams'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Sample Direct & Platform URLs */}
        <View style={styles.sampleSection}>
          <Text style={[styles.sampleTitle, { color: colors.textMuted }]}>
            {language === 'am' ? 'የተፈቀዱ የሙከራ አድራሻዎች:' : 'Try Verified Media Streams:'}
          </Text>
          <View style={styles.samplePillsRow}>
            {sampleUrls.map((s, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setUrl(s.url);
                  setVideoInfo(null);
                  setDownloadSuccess(false);
                }}
                style={[styles.samplePill, { backgroundColor: colors.cardSecondary }]}
              >
                <Sparkles size={11} color="#dc2626" style={{ marginRight: 4 }} />
                <Text style={[styles.samplePillText, { color: colors.textSecondary }]}>
                  {s.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          {/* Thumbnail & Badges */}
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: videoInfo.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{videoInfo.duration}</Text>
            </View>
            {videoInfo.platform === 'tiktok' && (
              <View style={styles.watermarkFreeBadge}>
                <ShieldCheck size={12} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.watermarkFreeBadgeText}>No Watermark</Text>
              </View>
            )}
          </View>

          <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
            {videoInfo.title}
          </Text>
          <Text style={[styles.videoAuthor, { color: colors.textMuted }]}>
            {videoInfo.author} • {videoInfo.views}
          </Text>

          {/* Format Type Selector Tabs */}
          <View style={[styles.filterTabsRow, { backgroundColor: colors.cardSecondary }]}>
            <TouchableOpacity
              onPress={() => setFormatFilter('all')}
              style={[
                styles.filterTab,
                { backgroundColor: formatFilter === 'all' ? colors.primary : 'transparent' },
              ]}
            >
              <Sliders size={13} color={formatFilter === 'all' ? '#fff' : colors.textSecondary} />
              <Text
                style={[
                  styles.filterTabText,
                  { color: formatFilter === 'all' ? '#fff' : colors.textSecondary },
                ]}
              >
                {language === 'am' ? 'ሁሉም' : 'All Streams'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFormatFilter('video')}
              style={[
                styles.filterTab,
                { backgroundColor: formatFilter === 'video' ? colors.primary : 'transparent' },
              ]}
            >
              <Video size={13} color={formatFilter === 'video' ? '#fff' : colors.textSecondary} />
              <Text
                style={[
                  styles.filterTabText,
                  { color: formatFilter === 'video' ? '#fff' : colors.textSecondary },
                ]}
              >
                {language === 'am' ? 'ቪዲዮ (MP4)' : 'Video (MP4)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFormatFilter('audio')}
              style={[
                styles.filterTab,
                { backgroundColor: formatFilter === 'audio' ? colors.primary : 'transparent' },
              ]}
            >
              <Music size={13} color={formatFilter === 'audio' ? '#fff' : colors.textSecondary} />
              <Text
                style={[
                  styles.filterTabText,
                  { color: formatFilter === 'audio' ? '#fff' : colors.textSecondary },
                ]}
              >
                {language === 'am' ? 'ድምጽ (MP3)' : 'Audio (MP3)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quality List */}
          <Text style={[styles.qualityLabel, { color: colors.textMuted }]}>
            {t.select_quality}:
          </Text>
          <View style={styles.qualitiesList}>
            {displayedQualities && displayedQualities.length > 0 ? (
              displayedQualities.map((q, idx) => {
                const isSelected = selectedQuality?.label === q.label;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectQuality(q)}
                    style={[
                      styles.qualityOption,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(220, 38, 38, 0.08)'
                          : colors.cardSecondary,
                        borderColor: isSelected ? '#dc2626' : colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.qualityInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.qualityName, { color: colors.text }]}>
                          {q.label}
                        </Text>
                        {q.isWatermarkFree && (
                          <View style={styles.cleanBadge}>
                            <Text style={styles.cleanBadgeText}>✓ No Watermark</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.qualityMeta, { color: colors.textMuted }]}>
                        {q.format.toUpperCase()} • {q.resolution || 'Direct'} • {q.size}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color="#dc2626" />}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={[styles.emptyFilterText, { color: colors.textMuted }]}>
                No streams matching the selected filter.
              </Text>
            )}
          </View>

          {/* Editable Output File Name */}
          <View style={styles.filenameSection}>
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 5 }]}>
              {language === 'am' ? 'የፋይል ስም:' : 'Output File Name:'}
            </Text>
            <View
              style={[
                styles.filenameInputWrap,
                { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
              ]}
            >
              <FileText size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                value={outputFileName}
                onChangeText={setOutputFileName}
                placeholder="media_download.mp4"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.filenameInput,
                  { color: colors.text, fontSize: 12 * fontScale },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Download Action & Progress */}
          {!isDownloading && !downloadSuccess && (
            <TouchableOpacity
              onPress={handleDownload}
              style={[styles.downloadBtn, { backgroundColor: '#dc2626' }]}
            >
              <Download size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadBtnText}>
                {selectedQuality?.format === 'mp3'
                  ? language === 'am'
                    ? 'ድምጽ አውርድ (MP3)'
                    : 'Download Audio (MP3)'
                  : language === 'am'
                  ? 'ቪዲዮ አውርድ (MP4)'
                  : 'Download Video (MP4)'}
              </Text>
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
                {language === 'am' ? 'ፋይሉ ተቀምጧል:' : 'File saved:'} {outputFileName}
              </Text>

              <View style={styles.successButtonsRow}>
                <TouchableOpacity
                  onPress={handleDownload}
                  style={[
                    styles.reDownloadBtn,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
                  ]}
                >
                  <Download size={14} color={colors.text} style={{ marginRight: 5 }} />
                  <Text style={[styles.reDownloadBtnText, { color: colors.text }]}>
                    {language === 'am' ? 'እንደገና አውርድ' : 'Save Again'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShareDownloaded}
                  style={[styles.shareBtn, { backgroundColor: colors.primary }]}
                >
                  <Share2 size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>
                    {language === 'am' ? 'አጋራ / ክፈት' : 'Share File'}
                  </Text>
                </TouchableOpacity>
              </View>
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
            {language === 'am'
              ? 'YouTube እና TikTok ቪዲዮዎችን ከዋተርማርክ ነጻ ሆነው ወይም በድምጽ (MP3) ጥራት በቀጥታ ማውረድ ይችላሉ።'
              : 'Direct audio/video streaming extracts high-resolution files. TikTok videos are extracted without watermarks.'}
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
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    marginBottom: 14,
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sampleSection: {
    marginTop: 4,
  },
  sampleTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  samplePillsRow: {
    gap: 6,
  },
  samplePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  samplePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  videoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  watermarkFreeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  watermarkFreeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  videoAuthor: {
    fontSize: 11,
    marginBottom: 14,
  },
  filterTabsRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 5,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qualityLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  qualitiesList: {
    gap: 8,
    marginBottom: 14,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  qualityInfo: {
    flex: 1,
  },
  qualityName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  cleanBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cleanBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '700',
  },
  qualityMeta: {
    fontSize: 10,
  },
  emptyFilterText: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 10,
  },
  filenameSection: {
    marginBottom: 12,
  },
  filenameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  filenameInput: {
    flex: 1,
    height: 40,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  downloadingBox: {
    paddingVertical: 6,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  successBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  successText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  savedPathText: {
    fontSize: 11,
    marginBottom: 10,
  },
  successButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  reDownloadBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
