import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Copy,
  CheckCircle2,
  Sparkles,
  Info,
  Download,
  FileText,
  Share2,
  RefreshCw,
  Lock,
} from 'lucide-react-native';
import { SteganographyService } from '../services/steganographyService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export const SteganographyScreen: React.FC = () => {
  const { colors, t, language, fontScale } = useTheme();

  const [mode, setMode] = useState<'hide' | 'reveal'>('hide');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [secretMessage, setSecretMessage] = useState<string>('');
  const [revealedMessage, setRevealedMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Download & Filename editing states
  const [encodedUri, setEncodedUri] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState<string>('stego_encoded_image.png');
  const [exportTextFileName, setExportTextFileName] = useState<string>('revealed_secret.txt');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1, // Full PNG quality for lossless LSB
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setEncodedUri(null);
        setRevealedMessage(null);

        if (asset.width && asset.height) {
          setImageDimensions({ width: asset.width, height: asset.height });
        } else {
          setImageDimensions(null);
        }

        const assetName =
          (asset as any).fileName || (asset.uri ? asset.uri.split('/').pop()?.split('?')[0] : '');
        if (assetName && !assetName.startsWith('data:')) {
          const baseName = assetName.replace(/\.[^/.]+$/, '');
          setOutputFileName(`${baseName}_stego.png`);
          setExportTextFileName(`${baseName}_secret.txt`);
        } else {
          setOutputFileName('stego_encoded_image.png');
          setExportTextFileName('revealed_secret.txt');
        }
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to select image');
    }
  };

  const handleLoadSample = () => {
    if (mode === 'hide') {
      const sampleUri = SteganographyService.createSampleCarrier();
      setImageUri(sampleUri);
      setEncodedUri(null);
      setRevealedMessage(null);
      setSecretMessage('Top Secret CS Key: RSA-4096:Begashaw-2026-Confidential');
      setOutputFileName('sample_confidential_stego.png');
      setImageDimensions({ width: 480, height: 320 });
    } else {
      const sampleSecret =
        'eyoTools Decoded: "Data Structures & Graph Theory Final Examination - Addis Ababa 2026"';
      const sampleCarrierWithSecret = SteganographyService.createSampleCarrier(sampleSecret);
      setImageUri(sampleCarrierWithSecret);
      setEncodedUri(null);
      setRevealedMessage(null);
      setExportTextFileName('sample_revealed_secret.txt');
      setImageDimensions({ width: 480, height: 320 });
    }
  };

  const handleProcess = async () => {
    if (!imageUri || isProcessing) return;

    if (mode === 'hide') {
      if (!secretMessage.trim()) {
        Alert.alert(
          t.error,
          language === 'am'
            ? 'እባክዎ የሚደበቀውን ሚስጥራዊ መልእክት ያስገቡ'
            : 'Please enter a secret message to embed into the image.'
        );
        return;
      }

      setIsProcessing(true);
      try {
        const res = await SteganographyService.encodeImage(imageUri, secretMessage.trim());
        setEncodedUri(res.outputUri);
        setImageDimensions({ width: res.width, height: res.height });

        await StorageService.addHistoryItem({
          toolId: 'steganography',
          title: outputFileName,
          snippet: secretMessage.slice(0, 50) + '...',
          fileSize: `${Math.round(res.fileSizeBytes / 1024)} KB`,
          fileType: 'PNG',
        });

        Alert.alert(
          language === 'am' ? 'ተጠናቋል' : 'Secret Embedded',
          language === 'am'
            ? 'ሚስጥራዊ መልእክቱ በምስሉ ፒክሰሎች ውስጥ በስኬት ተደብቋል! አሁን የተዘጋጀውን Stego PNG ማውረድ ይችላሉ።'
            : 'Secret message embedded into PNG image bits with 16-bit termination sequence. You can now edit the filename and download!'
        );
      } catch (e: any) {
        Alert.alert(t.error, e.message || 'Failed to encode message into image');
      } finally {
        setIsProcessing(false);
      }
    } else {
      setIsProcessing(true);
      try {
        const res = await SteganographyService.decodeImage(imageUri);
        if (res.hasMessage && res.message) {
          setRevealedMessage(res.message);
          setImageDimensions({ width: res.width, height: res.height });

          await StorageService.addHistoryItem({
            toolId: 'steganography',
            title: exportTextFileName,
            snippet: res.message.slice(0, 60) + '...',
            fileSize: `${res.message.length} chars`,
            fileType: 'TXT',
          });
        } else {
          Alert.alert(
            t.error,
            t.no_hidden_message ||
              'No secret message detected in this image. Make sure you selected the uncompressed PNG generated with eyoTools.'
          );
        }
      } catch (e: any) {
        Alert.alert(t.error, e.message || 'Failed to decode secret message');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDownloadStegoPng = async () => {
    const targetUri = encodedUri || imageUri;
    if (!targetUri) return;

    try {
      await SteganographyService.exportStegoImage(targetUri, outputFileName);
      Alert.alert(
        language === 'am' ? 'ተጠናቋል' : 'Success',
        language === 'am'
          ? `Stego PNG ፋይል "${outputFileName}" በተሳካ ሁኔታ ወርዷል`
          : `Stego PNG image "${outputFileName}" saved successfully!`
      );
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to export Stego PNG');
    }
  };

  const handleDownloadSecretText = async () => {
    if (!revealedMessage) return;

    try {
      await SteganographyService.exportTextFile(revealedMessage, exportTextFileName);
      Alert.alert(
        language === 'am' ? 'ተጠናቋል' : 'Success',
        language === 'am'
          ? `የተገኘው ስውር መልእክት "${exportTextFileName}" በተሳካ ሁኔታ ወርዷል`
          : `Secret message text "${exportTextFileName}" exported successfully!`
      );
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to export text file');
    }
  };

  const handleCopy = async () => {
    if (!revealedMessage) return;
    await Clipboard.setStringAsync(revealedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareEncoded = async () => {
    const targetUri = encodedUri || imageUri;
    if (!targetUri) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${outputFileName}`,
        });
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to share image');
    }
  };

  // Estimate capacity if image dimensions are known
  const capacityChars = imageDimensions
    ? SteganographyService.calculateCapacity(imageDimensions.width, imageDimensions.height).maxCharacters
    : null;

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
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(79, 70, 229, 0.15)' }]}>
            <ShieldCheck size={22} color="#4f46e5" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.stego_title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.steganography_desc}
            </Text>
          </View>
        </View>

        {/* Mode Selector Tabs: Hide vs Reveal */}
        <View style={[styles.modeRow, { backgroundColor: colors.cardSecondary }]}>
          <TouchableOpacity
            onPress={() => {
              setMode('hide');
              setEncodedUri(null);
              setRevealedMessage(null);
            }}
            style={[
              styles.modeBtn,
              { backgroundColor: mode === 'hide' ? colors.primary : 'transparent' },
            ]}
          >
            <EyeOff size={14} color={mode === 'hide' ? '#fff' : colors.textSecondary} />
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'hide' ? '#fff' : colors.textSecondary },
              ]}
            >
              {t.mode_hide}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMode('reveal');
              setEncodedUri(null);
              setRevealedMessage(null);
            }}
            style={[
              styles.modeBtn,
              { backgroundColor: mode === 'reveal' ? colors.primary : 'transparent' },
            ]}
          >
            <Eye size={14} color={mode === 'reveal' ? '#fff' : colors.textSecondary} />
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'reveal' ? '#fff' : colors.textSecondary },
              ]}
            >
              {t.mode_reveal}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Selection Box */}
        <TouchableOpacity
          onPress={handlePickImage}
          style={[styles.pickBtn, { backgroundColor: colors.cardSecondary }]}
        >
          <ImageIcon size={16} color={colors.text} style={{ marginRight: 6 }} />
          <Text style={[styles.pickBtnText, { color: colors.text }]}>
            {imageUri
              ? language === 'am'
                ? 'ምስል ቀይር (Carrier PNG)'
                : 'Change Carrier Image (PNG)'
              : language === 'am'
              ? 'ምስል ምረጥ (Carrier PNG)'
              : 'Select Carrier Image (PNG)'}
          </Text>
        </TouchableOpacity>

        {/* Secret Message Input (Only in Hide mode) */}
        {mode === 'hide' && (
          <View style={styles.messageWrap}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t.enter_secret_message}
              </Text>
              {capacityChars !== null && (
                <Text style={[styles.capacityText, { color: colors.textMuted }]}>
                  {secretMessage.length} / {capacityChars.toLocaleString()} chars
                </Text>
              )}
            </View>
            <TextInput
              multiline
              value={secretMessage}
              onChangeText={(txt) => {
                setSecretMessage(txt);
                setEncodedUri(null);
              }}
              placeholder={t.secret_placeholder}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.cardSecondary,
                  color: colors.text,
                  fontSize: 12 * fontScale,
                },
              ]}
            />
          </View>
        )}

        {/* Load Sample Button */}
        <TouchableOpacity
          onPress={handleLoadSample}
          style={[styles.sampleBtn, { backgroundColor: colors.cardSecondary }]}
        >
          <Sparkles size={14} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={[styles.sampleBtnText, { color: colors.textSecondary }]}>
            {mode === 'hide'
              ? language === 'am'
                ? 'የናሙና ሚስጥራዊ ምስል ጫን'
                : 'Load Sample Confidential Carrier'
              : language === 'am'
              ? 'የተደበቀበት የናሙና ምስል ጫን'
              : 'Load Sample Encoded Carrier'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview & Action Card */}
      {imageUri && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Active Preview */}
          <View style={[styles.imagePreviewWrap, { backgroundColor: colors.cardSecondary }]}>
            <Image
              source={{ uri: encodedUri || imageUri }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          </View>

          {/* Status Badge when message encoded */}
          {mode === 'hide' && encodedUri && (
            <View style={styles.statusBadgeRow}>
              <CheckCircle2 size={13} color="#10b981" style={{ marginRight: 5 }} />
              <Text style={styles.statusBadgeText}>
                {language === 'am'
                  ? 'ሚስጥራዊ መልእክቱ ተደብቋል • 16-bit LSB Lossless PNG'
                  : 'Secret Message Embedded • 16-bit LSB Lossless PNG'}
              </Text>
            </View>
          )}

          {/* Action Button: Hide / Reveal */}
          {(!encodedUri || mode === 'reveal') && (
            <TouchableOpacity
              onPress={handleProcess}
              disabled={isProcessing}
              style={[
                styles.processBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isProcessing ? 0.7 : 1,
                },
              ]}
            >
              {isProcessing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.processBtnText}>
                    {mode === 'hide' ? t.hiding_message : t.revealing_message}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {mode === 'hide' ? (
                    <Lock size={15} color="#fff" style={{ marginRight: 6 }} />
                  ) : (
                    <Eye size={15} color="#fff" style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.processBtnText}>
                    {mode === 'hide' ? t.mode_hide : t.mode_reveal}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Download & Editable Filename Section (Hide Mode Result) */}
          {mode === 'hide' && encodedUri && (
            <View style={styles.exportSection}>
              {/* Editable Output File Name */}
              <Text style={[styles.label, { color: colors.textMuted, marginBottom: 5 }]}>
                {language === 'am' ? 'የፋይል ስም (.png):' : 'Output File Name (.png):'}
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
                  placeholder="stego_encoded_image.png"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.filenameInput,
                    { color: colors.text, fontSize: 12 * fontScale },
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Action Buttons: Re-encode & Download */}
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity
                  onPress={() => setEncodedUri(null)}
                  style={[
                    styles.secondaryBtn,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
                  ]}
                >
                  <RefreshCw size={14} color={colors.text} style={{ marginRight: 5 }} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                    {language === 'am' ? 'እንደገና ቀይር' : 'Edit'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDownloadStegoPng}
                  style={[styles.downloadBtn, { backgroundColor: '#10b981' }]}
                >
                  <Download size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.downloadBtnText}>
                    {language === 'am' ? 'Stego PNG አውርድ' : 'Download Stego PNG'}
                  </Text>
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    onPress={handleShareEncoded}
                    style={[
                      styles.shareBtn,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
                    ]}
                  >
                    <Share2 size={15} color={colors.text} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Revealed Secret Message Result (Reveal Mode) */}
      {mode === 'reveal' && revealedMessage && (
        <View
          style={[
            styles.resultCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {t.revealed_message}
            </Text>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>16-bit Terminated</Text>
            </View>
          </View>

          <View style={[styles.resultBox, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.resultText, { color: colors.text, fontSize: 13 * fontScale }]}>
              {revealedMessage}
            </Text>
          </View>

          {/* Editable File Name for Extracted Secret Text */}
          <Text style={[styles.label, { color: colors.textMuted, marginBottom: 5 }]}>
            {language === 'am' ? 'የፋይል ስም (.txt):' : 'Save Secret As (.txt):'}
          </Text>
          <View
            style={[
              styles.filenameInputWrap,
              { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
            ]}
          >
            <FileText size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={exportTextFileName}
              onChangeText={setExportTextFileName}
              placeholder="revealed_secret.txt"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.filenameInput,
                { color: colors.text, fontSize: 12 * fontScale },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Action Row: Copy & Download TXT */}
          <View style={styles.exportButtonsRow}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: copied
                    ? 'rgba(16, 185, 129, 0.15)'
                    : colors.cardSecondary,
                  borderColor: copied ? '#10b981' : colors.cardBorder,
                  flex: 1,
                },
              ]}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={15} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryBtnText, { color: '#10b981' }]}>{t.copied}</Text>
                </>
              ) : (
                <>
                  <Copy size={15} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>{t.copy}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDownloadSecretText}
              style={[styles.downloadBtn, { backgroundColor: '#10b981', flex: 1.4 }]}
            >
              <Download size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadBtnText}>
                {language === 'am' ? 'TXT አውርድ' : 'Download TXT'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* LSB Algorithm Info Callout */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
        ]}
      >
        <Info size={15} color={colors.cyan} style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {t.lsb_explanation}
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
  modeRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    marginBottom: 10,
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageWrap: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  capacityText: {
    fontSize: 10,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    borderRadius: 12,
    padding: 10,
    textAlignVertical: 'top',
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
  imagePreviewWrap: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  processBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  exportSection: {
    marginTop: 4,
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
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  successBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  successBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  resultBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultText: {
    lineHeight: 18,
    fontFamily: 'monospace',
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
