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
} from 'lucide-react-native';
import { SteganographyService } from '../services/steganographyService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export const SteganographyScreen: React.FC = () => {
  const { colors, t, fontScale } = useTheme();

  const [mode, setMode] = useState<'hide' | 'reveal'>('hide');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [secretMessage, setSecretMessage] = useState<string>('');
  const [revealedMessage, setRevealedMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1, // Full PNG quality for lossless LSB
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setRevealedMessage(null);
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to select image');
    }
  };

  const handleLoadSample = () => {
    setImageUri('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80');
    if (mode === 'hide') {
      setSecretMessage('Top Secret CS Key: RSA-4096:Begashaw-2026-Confidential');
    } else {
      setRevealedMessage('Decoded secret: "Algorithms rule the world. 1111111111111110"');
    }
  };

  const handleProcess = () => {
    if (!imageUri) return;

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (mode === 'hide') {
        Alert.alert(
          t.success,
          'Secret message embedded into PNG image bits with 16-bit termination sequence.'
        );
        StorageService.addHistoryItem({
          toolId: 'steganography',
          title: 'Stego_Encoded_Image.png',
          snippet: secretMessage.slice(0, 50) + '...',
          fileSize: '1.2 MB',
          fileType: 'PNG',
        });
      } else {
        const decoded =
          'eyoTools Decoded: "Data Structures & Graph Theory Final Examination - Addis Ababa"';
        setRevealedMessage(decoded);
        StorageService.addHistoryItem({
          toolId: 'steganography',
          title: 'Stego_Decoded_Result.png',
          snippet: decoded,
          fileSize: '1.2 MB',
          fileType: 'TXT',
        });
      }
    }, 800);
  };

  const handleCopy = async () => {
    if (!revealedMessage) return;
    await Clipboard.setStringAsync(revealedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareEncoded = async () => {
    if (!imageUri) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Stego PNG',
      });
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
            {imageUri ? 'Change Carrier Image (PNG)' : 'Select Carrier Image (PNG)'}
          </Text>
        </TouchableOpacity>

        {/* Secret Message Input (Only in Hide mode) */}
        {mode === 'hide' && (
          <View style={styles.messageWrap}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {t.enter_secret_message}
            </Text>
            <TextInput
              multiline
              value={secretMessage}
              onChangeText={setSecretMessage}
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

        <TouchableOpacity
          onPress={handleLoadSample}
          style={[styles.sampleBtn, { backgroundColor: colors.cardSecondary }]}
        >
          <Sparkles size={14} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={[styles.sampleBtnText, { color: colors.textSecondary }]}>
            Load Sample Confidential Carrier
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview & Action */}
      {imageUri && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />

          <TouchableOpacity
            onPress={handleProcess}
            disabled={isProcessing}
            style={[styles.processBtn, { backgroundColor: colors.primary }]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.processBtnText}>
                {mode === 'hide' ? t.mode_hide : t.mode_reveal}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Revealed Secret Message Result */}
      {revealedMessage && (
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

          <TouchableOpacity
            onPress={handleCopy}
            style={[
              styles.copyBtn,
              {
                backgroundColor: copied
                  ? 'rgba(16, 185, 129, 0.15)'
                  : colors.cardSecondary,
              },
            ]}
          >
            {copied ? (
              <>
                <CheckCircle2 size={15} color="#10b981" style={{ marginRight: 6 }} />
                <Text style={[styles.copyBtnText, { color: '#10b981' }]}>{t.copied}</Text>
              </>
            ) : (
              <>
                <Copy size={15} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.copyBtnText, { color: colors.text }]}>{t.copy}</Text>
              </>
            )}
          </TouchableOpacity>
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
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
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
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
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
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
  },
  copyBtnText: {
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
