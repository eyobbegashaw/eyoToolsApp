import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import {
  QrCode,
  Share2,
  Sparkles,
  Palette,
  Check,
} from 'lucide-react-native';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export const QrGeneratorScreen: React.FC = () => {
  const { colors, t, fontScale } = useTheme();
  const qrRef = useRef<any>(null);

  const [qrValue, setQrValue] = useState<string>('https://github.com/eyobbegashaw');
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [fgColor, setFgColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [copied, setCopied] = useState<boolean>(false);

  const handleShareQr = () => {
    if (!qrRef.current) return;

    qrRef.current.toDataURL(async (data: string) => {
      try {
        const fileUri = `${FileSystem.cacheDirectory}eyoTools_qr_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(fileUri, data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: 'Share QR Code',
          });
        }

        StorageService.addHistoryItem({
          toolId: 'qr',
          title: `QR: ${qrValue.slice(0, 30)}...`,
          snippet: qrValue,
          fileSize: '12 KB',
          fileType: 'QR',
        });
      } catch (e: any) {
        Alert.alert(t.error, e.message || 'Failed to share QR image');
      }
    });
  };

  const handleLoadSample = (sample: string) => {
    setQrValue(sample);
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

        {/* Input */}
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t.enter_text_or_url}
        </Text>
        <TextInput
          value={qrValue}
          onChangeText={setQrValue}
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
            onPress={() => handleLoadSample('https://github.com/eyobbegashaw')}
            style={[styles.samplePill, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={11} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={[styles.samplePillText, { color: colors.textSecondary }]}>
              GitHub
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleLoadSample('WIFI:S:eyoTools_Guest;T:WPA;P:Ethiopia2026;;')}
            style={[styles.samplePill, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={11} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={[styles.samplePillText, { color: colors.textSecondary }]}>
              Wi-Fi Config
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleLoadSample('mailto:eyobbegashaw21@gmail.com')}
            style={[styles.samplePill, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={11} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={[styles.samplePillText, { color: colors.textSecondary }]}>
              Email
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Matrix Preview */}
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
            getRef={(c) => (qrRef.current = c)}
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

        {/* Share Button */}
        <TouchableOpacity
          onPress={handleShareQr}
          style={[styles.shareBtn, { backgroundColor: colors.primary }]}
        >
          <Share2 size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.shareBtnText}>Share & Save QR Image</Text>
        </TouchableOpacity>
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
    marginBottom: 18,
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
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 44,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
