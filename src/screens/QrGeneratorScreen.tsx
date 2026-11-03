import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  QrCode,
  Share2,
  Sparkles,
  Download,
  FileText,
  CheckCircle2,
  Copy,
} from 'lucide-react-native';
import { QrService } from '../services/qrService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export const QrGeneratorScreen: React.FC = () => {
  const { colors, t, language, fontScale } = useTheme();
  const qrRef = useRef<any>(null);

  const [inputText, setInputText] = useState<string>('https://github.com/eyobbegashaw');
  const [qrValue, setQrValue] = useState<string>('https://github.com/eyobbegashaw');
  const [justGenerated, setJustGenerated] = useState<boolean>(false);
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [fgColor, setFgColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [outputFileName, setOutputFileName] = useState<string>('eyoTools_qr.png');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  /**
   * Explicitly Generate / Update the QR Code
   */
  const handleGenerateQr = () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      Alert.alert(
        t.error,
        language === 'am' ? 'እባክዎ ፅሁፍ ወይም URL ያስገቡ' : 'Please enter text or a URL to generate QR code.'
      );
      return;
    }
    setQrValue(trimmed);
    setJustGenerated(true);
    setTimeout(() => setJustGenerated(false), 2200);
  };

  /**
   * Save / Download the QR code as PNG image
   */
  const handleSaveQr = async () => {
    if (isSaving) return;
    const activeText = (inputText.trim() || qrValue).trim();
    if (!activeText) {
      Alert.alert(t.error, 'Please enter text or URL for QR code');
      return;
    }
    setQrValue(activeText);
    setIsSaving(true);

    try {
      // Generate clean high-resolution (512x512) PNG data URL
      const dataUrl = await QrService.generateQrDataUrl(activeText, {
        fgColor,
        bgColor,
        errorLevel,
        size: 512,
      });

      await QrService.saveQrImage(dataUrl, outputFileName);

      await StorageService.addHistoryItem({
        toolId: 'qr',
        title: outputFileName,
        snippet: activeText,
        fileSize: '512x512 PNG',
        fileType: 'QR',
      });

      Alert.alert(
        language === 'am' ? 'ተጠናቋል' : 'QR Code Saved',
        language === 'am'
          ? `የተዘጋጀው QR ኮድ "${outputFileName}" በተሳካ ሁኔታ ተቀምጧል`
          : `High-resolution QR code "${outputFileName}" saved successfully!`
      );
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to save QR image');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Share the QR code across Web & Mobile platforms
   */
  const handleShareQr = async () => {
    if (isSharing) return;
    const activeText = (inputText.trim() || qrValue).trim();
    if (!activeText) {
      Alert.alert(t.error, 'Please enter text or URL for QR code');
      return;
    }
    setQrValue(activeText);
    setIsSharing(true);

    try {
      const dataUrl = await QrService.generateQrDataUrl(activeText, {
        fgColor,
        bgColor,
        errorLevel,
        size: 512,
      });

      const res = await QrService.shareQr(dataUrl, outputFileName, activeText);

      await StorageService.addHistoryItem({
        toolId: 'qr',
        title: outputFileName,
        snippet: activeText,
        fileSize: '512x512 PNG',
        fileType: 'QR',
      });

      if (res.method === 'clipboard_download') {
        Alert.alert(
          language === 'am' ? 'ተጋርቷል' : 'Ready to Share',
          language === 'am'
            ? 'የ QR ኮዱ ይዘት ወደ ቅንጥብ ሰሌዳ ተቀድቷል እና ምስሉ ወርዷል'
            : 'QR code link copied to clipboard & image downloaded for sharing!'
        );
      } else if (res.shared && res.method !== 'cancelled') {
        Alert.alert(
          language === 'am' ? 'ተጠናቋል' : 'Success',
          language === 'am' ? 'QR ኮዱ በተሳካ ሁኔታ ተጋርቷል' : 'QR code shared successfully!'
        );
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to share QR image');
    } finally {
      setIsSharing(false);
    }
  };

  const handleLoadSample = (sample: string, defaultName: string) => {
    setInputText(sample);
    setQrValue(sample);
    setOutputFileName(defaultName);
    setJustGenerated(true);
    setTimeout(() => setJustGenerated(false), 2200);
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
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(217, 119, 6, 0.15)' }]}>
            <QrCode size={22} color="#d97706" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.qr_title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.qr_desc}
            </Text>
          </View>
        </View>

        {/* Text / URL Input */}
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t.enter_text_or_url}
        </Text>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="https://... or plain text"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: colors.cardSecondary,
              color: colors.text,
              fontSize: 13 * fontScale,
            },
          ]}
        />

        {/* Quick Sample Buttons */}
        <View style={styles.samplesRow}>
          <TouchableOpacity
            onPress={() =>
              handleLoadSample('https://github.com/eyobbegashaw', 'github_profile_qr.png')
            }
            style={[styles.samplePill, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={11} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={[styles.samplePillText, { color: colors.textSecondary }]}>
              GitHub
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              handleLoadSample(
                'WIFI:S:eyoTools_Guest;T:WPA;P:Ethiopia2026;;',
                'wifi_guest_qr.png'
              )
            }
            style={[styles.samplePill, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={11} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={[styles.samplePillText, { color: colors.textSecondary }]}>
              Wi-Fi Config
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              handleLoadSample(
                'mailto:eyobbegashaw21@gmail.com',
                'contact_email_qr.png'
              )
            }
            style={[styles.samplePill, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={11} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={[styles.samplePillText, { color: colors.textSecondary }]}>
              Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Primary Generate QR Code Action Button */}
        <TouchableOpacity
          onPress={handleGenerateQr}
          style={[
            styles.generateBtn,
            {
              backgroundColor: justGenerated ? '#10b981' : colors.primary,
            },
          ]}
          activeOpacity={0.8}
        >
          {justGenerated ? (
            <>
              <CheckCircle2 size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>
                {language === 'am' ? 'QR ኮድ ተፈጥሯል!' : 'QR Code Generated!'}
              </Text>
            </>
          ) : (
            <>
              <QrCode size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>
                {language === 'am' ? 'QR ኮድ አመንጭ' : 'Generate QR Code'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* QR Matrix Preview & Controls */}
      <View
        style={[
          styles.previewCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.previewHeading, { color: colors.text }]}>
          {t.qr_preview}
        </Text>

        <View style={[styles.qrContainer, { backgroundColor: bgColor }]}>
          <QRCode
            value={qrValue || 'eyoTools'}
            size={180}
            color={fgColor}
            backgroundColor={bgColor}
            getRef={(c: any) => (qrRef.current = c)}
            ecl={errorLevel}
          />
        </View>

        {/* Color Palette Presets */}
        <View style={styles.colorPresetsRow}>
          {[
            { name: 'Classic', fg: '#000000', bg: '#ffffff' },
            { name: 'Cyan Dark', fg: '#38bdf8', bg: '#0b1120' },
            { name: 'Emerald', fg: '#059669', bg: '#ecfdf5' },
            { name: 'Indigo', fg: '#4f46e5', bg: '#eef2ff' },
          ].map((theme) => {
            const isSelected = fgColor === theme.fg && bgColor === theme.bg;
            return (
              <TouchableOpacity
                key={theme.name}
                onPress={() => {
                  setFgColor(theme.fg);
                  setBgColor(theme.bg);
                }}
                style={[
                  styles.colorPresetBtn,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: theme.fg }]} />
                <Text style={[styles.presetText, { color: colors.text }]}>
                  {theme.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Error Correction Level Chips */}
        <View style={styles.errorLevelRow}>
          <Text style={[styles.eclLabel, { color: colors.textMuted }]}>
            {language === 'am' ? 'የስህተት ማረሚያ (ECL):' : 'Error Correction:'}
          </Text>
          {(['L', 'M', 'Q', 'H'] as const).map((lvl) => (
            <TouchableOpacity
              key={lvl}
              onPress={() => setErrorLevel(lvl)}
              style={[
                styles.eclChip,
                {
                  backgroundColor:
                    errorLevel === lvl ? colors.primary : colors.cardSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.eclChipText,
                  { color: errorLevel === lvl ? '#fff' : colors.textSecondary },
                ]}
              >
                {lvl}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Editable Output File Name */}
        <View style={styles.exportSection}>
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
              placeholder="eyoTools_qr.png"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.filenameInput,
                { color: colors.text, fontSize: 12 * fontScale },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Action Buttons: Save & Share */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={handleSaveQr}
              disabled={isSaving || isSharing}
              style={[
                styles.saveBtn,
                { backgroundColor: '#10b981', opacity: isSaving ? 0.7 : 1 },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Download size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>
                    {language === 'am' ? 'QR አስቀምጥ' : 'Save QR Image'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShareQr}
              disabled={isSaving || isSharing}
              style={[
                styles.shareBtn,
                { backgroundColor: colors.primary, opacity: isSharing ? 0.7 : 1 },
              ]}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Share2 size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>
                    {language === 'am' ? 'አጋራ' : 'Share QR'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    padding: 14,
    paddingTop: 6,
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
  samplesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  samplePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  samplePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    marginTop: 12,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  previewHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
  },
  qrContainer: {
    padding: 16,
    borderRadius: 16,
    elevation: 3,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
    marginBottom: 16,
  },
  colorPresetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  presetText: {
    fontSize: 10,
    fontWeight: '700',
  },
  errorLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  eclLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginRight: 4,
  },
  eclChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eclChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  exportSection: {
    width: '100%',
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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
