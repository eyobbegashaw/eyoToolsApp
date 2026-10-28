import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import {
  ScanText,
  Camera,
  Image as ImageIcon,
  Copy,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react-native';
import { OCRService } from '../services/ocrService';
import { PDFService } from '../services/pdfService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export const ImageToTextScreen: React.FC = () => {
  const { colors, t, fontScale } = useTheme();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrLang, setOcrLang] = useState<'eng' | 'amh'>('eng');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const handlePickGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Gallery access is needed to select images for OCR.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setExtractedText('');
        setConfidence(null);
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to select image from gallery');
    }
  };

  const handleCaptureCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera access is needed to capture photos for OCR.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setExtractedText('');
        setConfidence(null);
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to launch camera');
    }
  };

  const handleLoadSample = () => {
    // High-resolution textbook photo for OCR demonstration
    const sampleUri =
      ocrLang === 'amh'
        ? 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80';

    setImageUri(sampleUri);
    setExtractedText('');
    setConfidence(null);
  };

  const handleRunOcr = async () => {
    if (!imageUri || isProcessing) return;

    setIsProcessing(true);
    setProgress(10);
    setStatusMessage('Reading image bytes...');

    try {
      const result = await OCRService.recognizeImage(imageUri, ocrLang, (p, status) => {
        setProgress(p);
        setStatusMessage(status);
      });

      setExtractedText(result.text);
      setConfidence(result.confidence);

      await StorageService.addHistoryItem({
        toolId: 'ocr',
        title: `OCR_${ocrLang.toUpperCase()}_Document.jpg`,
        snippet: result.text.slice(0, 80) + '...',
        fileSize: `${Math.round(result.text.length / 50) * 50 || 120} chars`,
        fileType: 'IMG',
      });
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'OCR processing failed');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    await Clipboard.setStringAsync(extractedText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExportTxt = async () => {
    if (!extractedText) return;
    await PDFService.exportTextFile(extractedText, 'eyoTools_ocr_extracted.txt');
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
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
            <ScanText size={22} color="#2563eb" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.ocr_title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.ocr_desc}
            </Text>
          </View>
        </View>

        {/* Language Selection */}
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t.ocr_language}
        </Text>
        <View style={styles.langSegmentRow}>
          <TouchableOpacity
            onPress={() => setOcrLang('eng')}
            style={[
              styles.langSegmentBtn,
              {
                backgroundColor:
                  ocrLang === 'eng' ? colors.primary : colors.cardSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.langSegmentText,
                { color: ocrLang === 'eng' ? '#fff' : colors.textSecondary },
              ]}
            >
              English (Latin)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOcrLang('amh')}
            style={[
              styles.langSegmentBtn,
              {
                backgroundColor:
                  ocrLang === 'amh' ? colors.primary : colors.cardSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.langSegmentText,
                { color: ocrLang === 'amh' ? '#fff' : colors.textSecondary },
              ]}
            >
              አማርኛ (Ethiopic Fidel)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons: Gallery or Camera */}
        <View style={styles.inputActionRow}>
          <TouchableOpacity
            onPress={handlePickGallery}
            style={[styles.pickBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <ImageIcon size={16} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.pickBtnText, { color: colors.text }]}>
              {t.choose_from_gallery}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCaptureCamera}
            style={[styles.pickBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <Camera size={16} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.pickBtnText, { color: colors.text }]}>
              {t.take_photo}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleLoadSample}
          style={[styles.sampleBtn, { backgroundColor: colors.cardSecondary }]}
        >
          <Sparkles size={14} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={[styles.sampleBtnText, { color: colors.textSecondary }]}>
            Load Sample Document Photo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview Box */}
      {imageUri && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />

          {!extractedText && (
            <TouchableOpacity
              onPress={handleRunOcr}
              accessibilityState={{ disabled: isProcessing }}
              style={[
                styles.recognizeBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isProcessing ? 0.7 : 1,
                  pointerEvents: isProcessing ? 'none' : 'auto',
                },
              ]}
            >
              {isProcessing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.recognizeBtnText}>
                    {statusMessage || t.loading} ({progress}%)
                  </Text>
                </View>
              ) : (
                <>
                  <ScanText size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.recognizeBtnText}>
                    Recognize Text ({ocrLang === 'amh' ? 'አማርኛ' : 'English'})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* OCR Results */}
      {extractedText ? (
        <View
          style={[
            styles.resultCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {t.extracted_text}
            </Text>
            {confidence && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {confidence}% {t.ocr_confidence}
                </Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.resultScrollView} nestedScrollEnabled>
            <Text
              style={[
                styles.resultBody,
                { color: colors.text, fontSize: 13 * fontScale },
              ]}
            >
              {extractedText}
            </Text>
          </ScrollView>

          <View style={styles.resultActions}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[
                styles.halfBtn,
                {
                  backgroundColor: copySuccess
                    ? 'rgba(16, 185, 129, 0.15)'
                    : colors.cardSecondary,
                },
              ]}
            >
              {copySuccess ? (
                <>
                  <CheckCircle2 size={15} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={[styles.halfBtnText, { color: '#10b981' }]}>
                    {t.copied}
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={15} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.halfBtnText, { color: colors.text }]}>
                    {t.copy}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportTxt}
              style={[styles.halfBtn, { backgroundColor: colors.primary }]}
            >
              <Download size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.halfBtnText, { color: '#fff' }]}>
                {t.export_txt}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Ethiopic Note */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
        ]}
      >
        <Info size={15} color={colors.cyan} style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {t.ocr_ethiopic_note}
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
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  langSegmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  langSegmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSegmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
  },
  pickBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 12,
  },
  sampleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  recognizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  recognizeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  confidenceText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  resultScrollView: {
    maxHeight: 180,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 12,
  },
  resultBody: {
    lineHeight: 18,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
  },
  halfBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
