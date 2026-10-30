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
  TextInput,
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
  FileText,
} from 'lucide-react-native';
import { OCRService } from '../services/ocrService';
import { PDFService } from '../services/pdfService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export const ImageToTextScreen: React.FC = () => {
  const { colors, t, language, fontScale } = useTheme();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrLang, setOcrLang] = useState<'eng' | 'amh'>('eng');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [ocrEngine, setOcrEngine] = useState<string>('');
  const [exportFileName, setExportFileName] = useState<string>('ocr_extracted_text.txt');

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
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setExtractedText('');
        setConfidence(null);
        setOcrEngine('');
        const assetName = (asset as any).fileName || (asset.uri ? asset.uri.split('/').pop()?.split('?')[0] : '');
        if (assetName && !assetName.startsWith('data:')) {
          const baseName = assetName.replace(/\.[^/.]+$/, '');
          setExportFileName(`${baseName}_ocr.txt`);
        } else {
          setExportFileName(`ocr_${ocrLang}_document.txt`);
        }
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
        setOcrEngine('');
        setExportFileName(`camera_scan_${ocrLang}.txt`);
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
    setOcrEngine('');
    setExportFileName(ocrLang === 'amh' ? 'amharic_sample_ocr.txt' : 'textbook_sample_ocr.txt');
  };

  const handleRunOcr = async () => {
    if (!imageUri || isProcessing) return;

    setIsProcessing(true);
    setProgress(10);
    setStatusMessage('Optimizing image for OCR...');

    try {
      const result = await OCRService.recognizeImage(imageUri, ocrLang, (p, status) => {
        setProgress(p);
        setStatusMessage(status);
      });

      setExtractedText(result.text);
      setConfidence(result.confidence);
      if (result.engine) {
        setOcrEngine(result.engine);
      }

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
    if (!extractedText.trim()) {
      Alert.alert(t.error, 'No text available to export.');
      return;
    }

    let cleanFilename = exportFileName.trim().replace(/[\\/:*?"<>|]/g, '_');
    if (!cleanFilename) {
      cleanFilename = `ocr_${ocrLang}_document.txt`;
    }
    if (!cleanFilename.toLowerCase().endsWith('.txt')) {
      cleanFilename += '.txt';
    }

    try {
      await PDFService.exportTextFile(extractedText, cleanFilename);

      await StorageService.addHistoryItem({
        toolId: 'ocr',
        title: cleanFilename,
        snippet: extractedText.slice(0, 80) + '...',
        fileSize: `${extractedText.length} chars`,
        fileType: 'TXT',
      });

      Alert.alert(
        language === 'am' ? 'ተጠናቋል' : 'Success',
        language === 'am'
          ? `ፋይል "${cleanFilename}" በተሳካ ሁኔታ ተልኳል / ወርዷል`
          : `File "${cleanFilename}" exported successfully!`
      );
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to export file');
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
              disabled={isProcessing}
              style={[
                styles.recognizeBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isProcessing ? 0.7 : 1,
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
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  {t.extracted_text}
                </Text>
                <View
                  style={[
                    styles.editableBadge,
                    { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
                  ]}
                >
                  <FileText size={11} color="#3b82f6" style={{ marginRight: 4 }} />
                  <Text style={[styles.editableBadgeText, { color: '#3b82f6' }]}>
                    {language === 'am' ? 'ማረም ይቻላል' : 'Editable'}
                  </Text>
                </View>
              </View>
              {ocrEngine ? (
                <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '600', marginTop: 2 }}>
                  ✓ {ocrEngine}
                </Text>
              ) : null}
            </View>
            {confidence && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {confidence}% {t.ocr_confidence}
                </Text>
              </View>
            )}
          </View>

          {/* Editable Extracted Text Area */}
          <TextInput
            multiline
            value={extractedText}
            onChangeText={setExtractedText}
            placeholder="Extracted text will appear here..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.resultTextInput,
              {
                color: colors.text,
                fontSize: 13 * fontScale,
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardBorder,
              },
            ]}
            textAlignVertical="top"
          />

          <View style={styles.charCountRow}>
            <Text style={[styles.charCountText, { color: colors.textMuted }]}>
              {extractedText.length} {language === 'am' ? 'ፊደላት' : 'characters'} •{' '}
              {extractedText.split('\n').filter(Boolean).length} {language === 'am' ? 'መስመሮች' : 'lines'}
            </Text>
          </View>

          {/* Output File Name Field */}
          <View style={styles.filenameSection}>
            <Text style={[styles.filenameLabel, { color: colors.textMuted }]}>
              {language === 'am' ? 'የፋይል ስም (.txt)' : 'Output File Name (.txt)'}
            </Text>
            <View
              style={[
                styles.filenameInputWrap,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <FileText size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                value={exportFileName}
                onChangeText={setExportFileName}
                placeholder="ocr_extracted_text.txt"
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
  editableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  editableBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  resultTextInput: {
    minHeight: 120,
    maxHeight: 220,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
  },
  charCountText: {
    fontSize: 10,
    fontWeight: '500',
  },
  filenameSection: {
    marginBottom: 14,
  },
  filenameLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
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
