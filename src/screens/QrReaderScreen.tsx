import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { CameraView, Camera } from 'expo-camera';
import jsQR from 'jsqr';
import {
  Scan,
  Camera as CameraIcon,
  X,
  Image as ImageIcon,
  Copy,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Info,
  Download,
  Share2,
  FileText,
} from 'lucide-react-native';
import { QrService } from '../services/qrService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export const QrReaderScreen: React.FC = () => {
  const { colors, t, language, fontScale } = useTheme();

  const [decodedData, setDecodedData] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string>('Web URL');
  const [copied, setCopied] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [outputFileName, setOutputFileName] = useState<string>('scanned_qr_output.txt');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // References for Web Camera Scanning
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);

  const determineQrType = (data: string): string => {
    if (data.startsWith('http://') || data.startsWith('https://')) return 'Web URL';
    if (data.startsWith('mailto:')) return 'Email Address';
    if (data.startsWith('tel:')) return 'Phone Number';
    if (data.startsWith('WIFI:')) return 'Wi-Fi Network';
    return 'Plain Text';
  };

  const handleQrScanned = (data: string) => {
    setIsScanning(false);
    setDecodedData(data);
    const type = determineQrType(data);
    setDetectedType(type);

    // Auto default file name according to type
    if (data.startsWith('http://') || data.startsWith('https://')) {
      setOutputFileName('scanned_url.txt');
    } else if (data.startsWith('WIFI:')) {
      setOutputFileName('scanned_wifi_config.txt');
    } else {
      setOutputFileName('scanned_qr_output.txt');
    }

    StorageService.addHistoryItem({
      toolId: 'qr_reader',
      title: `Scanned: ${data.slice(0, 30)}...`,
      snippet: data,
      fileSize: `${data.length} chars`,
      fileType: 'QR',
    });
  };

  /**
   * Start Live Camera Scanner
   */
  const handleStartCamera = async () => {
    setDecodedData(null);

    if (Platform.OS === 'web') {
      setIsScanning(true);
      return;
    }

    try {
      const { granted } = await Camera.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert(t.error, t.qr_camera_permission);
        return;
      }
      setIsScanning(true);
    } catch (err: any) {
      Alert.alert(t.error, err.message || 'Camera permission failed');
    }
  };

  const handleStopCamera = () => {
    setIsScanning(false);
  };

  /**
   * Web Camera Scanner Video Stream & Frame Grabber Loop
   */
  useEffect(() => {
    let animId: number;
    let stream: MediaStream | null = null;
    let active = true;

    if (isScanning && Platform.OS === 'web' && typeof navigator !== 'undefined') {
      const startWebCamera = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            Alert.alert(t.error, 'Camera not supported in this browser environment.');
            setIsScanning(false);
            return;
          }

          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          });

          if (!active) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }

          const scanFrame = () => {
            if (!active) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (video && canvas && video.readyState >= 2) {
              const w = video.videoWidth || 640;
              const h = video.videoHeight || 480;
              if (w > 0 && h > 0) {
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(video, 0, 0, w, h);
                  const imgData = ctx.getImageData(0, 0, w, h);
                  const code = jsQR(imgData.data, w, h, { inversionAttempts: 'dontInvert' });
                  if (code && code.data && code.data.trim()) {
                    handleQrScanned(code.data.trim());
                    return;
                  }
                }
              }
            }
            animId = requestAnimationFrame(scanFrame);
          };

          animId = requestAnimationFrame(scanFrame);
        } catch (err: any) {
          Alert.alert(
            t.error,
            err.name === 'NotAllowedError'
              ? t.qr_camera_permission
              : err.message || 'Unable to access camera.'
          );
          setIsScanning(false);
        }
      };

      startWebCamera();
    }

    return () => {
      active = false;
      if (animId) cancelAnimationFrame(animId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks?.().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isScanning]);

  /**
   * Scan from Gallery Image
   */
  const handleScanFromImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const assetUri = result.assets[0].uri;
        setIsScanning(false);

        // Attempt real jsQR decode on image
        const decoded = await QrService.decodeQrFromImage(assetUri);
        if (decoded) {
          handleQrScanned(decoded);
          return;
        }

        // Fallback or unreadable alert
        Alert.alert(
          t.error,
          t.qr_no_code_found ||
            'No QR code detected in this image. Ensure the QR code is clearly focused and well-lit.'
        );
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to scan image');
    }
  };

  /**
   * Quick Sample QR
   */
  const handleTestSample = (sample: string) => {
    setIsScanning(false);
    handleQrScanned(sample);
  };

  /**
   * Copy to Clipboard
   */
  const handleCopy = async () => {
    if (!decodedData) return;
    await Clipboard.setStringAsync(decodedData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Open Link / Action
   */
  const handleOpenAction = () => {
    if (!decodedData) return;
    if (decodedData.startsWith('http://') || decodedData.startsWith('https://')) {
      Linking.openURL(decodedData).catch((err) =>
        console.warn('Failed to open URL', err)
      );
    } else if (decodedData.startsWith('mailto:') || decodedData.startsWith('tel:')) {
      Linking.openURL(decodedData).catch((err) =>
        console.warn('Failed to open action URL', err)
      );
    } else {
      handleCopy();
    }
  };

  /**
   * Download / Export Scanned Output
   */
  const handleDownloadOutput = async () => {
    if (!decodedData || isExporting) return;
    setIsExporting(true);

    try {
      await QrService.exportDecodedText(decodedData, outputFileName);
      Alert.alert(
        language === 'am' ? 'ተጠናቋል' : 'Download Complete',
        language === 'am'
          ? `የተነበበው የ QR ኮድ ፋይል "${outputFileName}" በተሳካ ሁኔታ ወርዷል`
          : `Scanned QR output "${outputFileName}" saved successfully!`
      );
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to download output');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Share Scanned Output
   */
  const handleShareOutput = async () => {
    if (!decodedData || isExporting) return;
    setIsExporting(true);

    try {
      const res = await QrService.shareDecodedText(decodedData, outputFileName);
      if (res.method === 'clipboard_download') {
        Alert.alert(
          language === 'am' ? 'ተጋርቷል' : 'Ready to Share',
          language === 'am'
            ? 'ይዘቱ ወደ ቅንጥብ ሰሌዳ ተቀድቷል እና ፋይሉ ወርዷል'
            : 'Content copied to clipboard & text file downloaded for easy sharing!'
        );
      } else if (res.shared && res.method !== 'cancelled') {
        Alert.alert(
          language === 'am' ? 'ተጠናቋል' : 'Success',
          language === 'am' ? 'ይዘቱ በተሳካ ሁኔታ ተጋርቷል' : 'Scanned QR content shared successfully!'
        );
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to share output');
    } finally {
      setIsExporting(false);
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
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(13, 148, 136, 0.15)' }]}>
            <Scan size={22} color="#0d9488" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.qr_reader_title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.qr_reader_desc}
            </Text>
          </View>
        </View>

        {/* Scan Actions: Camera, File, and Sample */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={isScanning ? handleStopCamera : handleStartCamera}
            style={[
              styles.actionBtn,
              { backgroundColor: isScanning ? '#e11d48' : '#0d9488' },
            ]}
          >
            {isScanning ? (
              <>
                <X size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>{t.qr_camera_stop}</Text>
              </>
            ) : (
              <>
                <CameraIcon size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>{t.scan_with_camera}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              onPress={handleScanFromImage}
              style={[
                styles.actionBtnSecondary,
                { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
              ]}
            >
              <ImageIcon size={15} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
                {t.scan_from_file}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                handleTestSample('https://github.com/eyobbegashaw/eyoTools-Mobile-App')
              }
              style={[
                styles.actionBtnSecondary,
                { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
              ]}
            >
              <Sparkles size={14} color="#0d9488" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
                {t.qr_sample_code}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Live Camera Scanner Viewport */}
      {isScanning && (
        <View
          style={[
            styles.scannerCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cameraBox}>
            {Platform.OS === 'web' ? (
              <>
                {React.createElement('video', {
                  ref: videoRef,
                  autoPlay: true,
                  playsInline: true,
                  muted: true,
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 16,
                  },
                })}
                {React.createElement('canvas', {
                  ref: canvasRef,
                  style: { display: 'none' },
                })}
              </>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }: { data: string }) => handleQrScanned(data)}
              />
            )}

            {/* Target Reticle Overlay */}
            <View style={styles.targetFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.laserLine} />
            </View>

            <View style={styles.scanNoticeWrap}>
              <Text style={styles.scanNoticeText}>{t.qr_scanning_active}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleStopCamera}
            style={[styles.stopCameraBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <X size={15} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.stopCameraBtnText, { color: colors.text }]}>
              {t.qr_camera_stop}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Decoded Content Result */}
      {decodedData ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {t.qr_decoded_title}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: 'rgba(13, 148, 136, 0.15)' }]}>
              <Text style={styles.typeText}>{detectedType}</Text>
            </View>
          </View>

          {/* Decoded Data Display */}
          <View style={[styles.dataBox, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.dataText, { color: colors.text, fontSize: 13 * fontScale }]}>
              {decodedData}
            </Text>
          </View>

          {/* Quick Actions: Open Link & Copy */}
          <View style={styles.resultButtonsRow}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[
                styles.actionPillBtn,
                {
                  backgroundColor: copied
                    ? 'rgba(16, 185, 129, 0.15)'
                    : colors.cardSecondary,
                  borderColor: copied ? '#10b981' : colors.cardBorder,
                },
              ]}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={15} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionPillBtnText, { color: '#10b981' }]}>
                    {t.copied}
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={15} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionPillBtnText, { color: colors.text }]}>
                    {t.qr_action_copy}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {(decodedData.startsWith('http://') ||
              decodedData.startsWith('https://') ||
              decodedData.startsWith('mailto:') ||
              decodedData.startsWith('tel:')) && (
              <TouchableOpacity
                onPress={handleOpenAction}
                style={[styles.actionPillBtn, { backgroundColor: colors.primary }]}
              >
                <ExternalLink size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[styles.actionPillBtnText, { color: '#fff' }]}>
                  {t.qr_action_open}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Editable Output File Name */}
          <View style={styles.exportSection}>
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 5 }]}>
              {language === 'am' ? 'የፋይል ስም (.txt):' : 'Output File Name (.txt):'}
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
                placeholder="scanned_qr_output.txt"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.filenameInput,
                  { color: colors.text, fontSize: 12 * fontScale },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Action Buttons: Download & Share */}
            <View style={styles.exportButtonsRow}>
              <TouchableOpacity
                onPress={handleDownloadOutput}
                disabled={isExporting}
                style={[styles.downloadBtn, { backgroundColor: '#10b981' }]}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Download size={15} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.exportBtnText}>
                      {language === 'am' ? 'TXT አውርድ' : 'Download Output'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareOutput}
                disabled={isExporting}
                style={[styles.shareBtn, { backgroundColor: colors.primary }]}
              >
                <Share2 size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.exportBtnText}>
                  {language === 'am' ? 'አጋራ' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        !isScanning && (
          <View
            style={[
              styles.placeholderCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Scan size={36} color={colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
              {language === 'am'
                ? 'በስልክዎ ካሜራ የ QR ኮድ ያንብቡ ወይም ከምስል ላይ ይምረጡ'
                : 'Point your camera at a QR code or select an image to scan.'}
            </Text>
          </View>
        )
      )}

      {/* Info Callout */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
        ]}
      >
        <Info size={15} color={colors.cyan} style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {language === 'am'
            ? 'ከካሜራ እና ከምስል በቀጥታ የ QR ኮዶችን ያለ ምንም ኢንተርኔት 100% በስልክዎ ላይ ያነባል።'
            : 'High-performance on-device QR matrix scanner runs 100% offline via hardware camera and computer vision.'}
        </Text>
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
  actionsRow: {
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scannerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  cameraBox: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetFrame: {
    width: 170,
    height: 170,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#0d9488',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  laserLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#14b8a6',
    boxShadow: '0 0 8px #14b8a6',
  },
  scanNoticeWrap: {
    position: 'absolute',
    bottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  scanNoticeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  stopCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 40,
    borderRadius: 12,
  },
  stopCameraBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    color: '#0d9488',
    fontSize: 10,
    fontWeight: '800',
  },
  dataBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  dataText: {
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  resultButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  exportSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  filenameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
  },
  filenameInput: {
    flex: 1,
    height: 40,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  placeholderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
