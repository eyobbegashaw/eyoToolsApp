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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Scissors,
  Image as ImageIcon,
  Download,
  Sparkles,
  Info,
  CheckCircle2,
  Eye,
  Layers,
  FileText,
} from 'lucide-react-native';
import { BackgroundRemovalService } from '../services/backgroundRemovalService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export const BackgroundRemoverScreen: React.FC = () => {
  const { colors, t, language, fontScale } = useTheme();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState<number>(28);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState<string>('subject_cutout.png');
  const [previewTab, setPreviewTab] = useState<'cutout' | 'original' | 'compare'>('cutout');
  const [backdropColor, setBackdropColor] = useState<'transparent' | '#ffffff' | '#1e293b' | '#2563eb'>(
    'transparent'
  );
  const [activeEngine, setActiveEngine] = useState<string>('ONNX Runtime (U2Net AI)');

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setResultUri(null);

        const assetName = (asset as any).fileName || (asset.uri ? asset.uri.split('/').pop()?.split('?')[0] : '');
        if (assetName && !assetName.startsWith('data:')) {
          const baseName = assetName.replace(/\.[^/.]+$/, '');
          setOutputFileName(`${baseName}_cutout.png`);
        } else {
          setOutputFileName('subject_cutout.png');
        }
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to select image');
    }
  };

  const handleLoadSample = () => {
    const sample = 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80';
    setImageUri(sample);
    setResultUri(null);
    setOutputFileName('sample_portrait_cutout.png');
  };

  const handleRemoveBackground = async () => {
    if (!imageUri || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await BackgroundRemovalService.removeBackground(imageUri, {
        tolerance,
        feather: 3,
      });

      setResultUri(result.outputUri);
      setActiveEngine(result.engine || 'ONNX Runtime (U2Net AI Neural Model)');
      setPreviewTab('cutout');

      await StorageService.addHistoryItem({
        toolId: 'bg_remover',
        title: outputFileName,
        snippet: `${result.engine || 'U2Net Neural AI'} (Sensitivity: ${tolerance}, Resolution: ${result.width}x${result.height})`,
        fileSize: `${Math.round(result.fileSizeBytes / 1024)} KB`,
        fileType: 'PNG',
      });
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Background removal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPng = async () => {
    if (!resultUri) return;
    try {
      await BackgroundRemovalService.exportPngFile(resultUri, outputFileName);
      Alert.alert(
        language === 'am' ? 'ተጠናቋል' : 'Success',
        language === 'am'
          ? `የተቆረጠው ምስል "${outputFileName}" በተሳካ ሁኔታ ወርዷል`
          : `Transparent cutout "${outputFileName}" saved successfully!`
      );
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to export image');
    }
  };

  const isWeb = Platform.OS === 'web';

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
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(225, 29, 72, 0.15)' }]}>
            <Scissors size={22} color="#e11d48" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.bg_title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.bg_remover_desc}
            </Text>
          </View>
        </View>

        {/* Tolerance Controls */}
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t.bg_threshold}: {tolerance} (Color Matting Sensitivity)
        </Text>
        <View style={styles.toleranceRow}>
          {[15, 25, 35, 50, 65].map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => setTolerance(val)}
              style={[
                styles.toleranceBtn,
                {
                  backgroundColor:
                    tolerance === val ? colors.primary : colors.cardSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.toleranceText,
                  { color: tolerance === val ? '#fff' : colors.textSecondary },
                ]}
              >
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handlePickImage}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          >
            <ImageIcon size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>
              {imageUri ? 'Change Image' : 'Select Image from Gallery'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLoadSample}
            style={[styles.sampleBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={[styles.sampleBtnText, { color: colors.textSecondary }]}>
              Load Sample Subject
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Preview & Processing Card */}
      {imageUri && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Header & Preview Tabs */}
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              {resultUri ? 'Cutout Preview' : t.original_preview}
            </Text>

            {resultUri && (
              <View style={[styles.tabsRow, { backgroundColor: colors.cardSecondary }]}>
                <TouchableOpacity
                  onPress={() => setPreviewTab('cutout')}
                  style={[
                    styles.tabBtn,
                    previewTab === 'cutout' && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: previewTab === 'cutout' ? '#fff' : colors.textMuted },
                    ]}
                  >
                    Cutout
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPreviewTab('original')}
                  style={[
                    styles.tabBtn,
                    previewTab === 'original' && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: previewTab === 'original' ? '#fff' : colors.textMuted },
                    ]}
                  >
                    Original
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPreviewTab('compare')}
                  style={[
                    styles.tabBtn,
                    previewTab === 'compare' && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: previewTab === 'compare' ? '#fff' : colors.textMuted },
                    ]}
                  >
                    Side-by-Side
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Backdrop Color Options when in Cutout View */}
          {resultUri && previewTab === 'cutout' && (
            <View style={styles.backdropPickerRow}>
              <Text style={[styles.backdropPickerLabel, { color: colors.textMuted }]}>
                Preview Backdrop:
              </Text>
              <View style={styles.backdropChips}>
                <TouchableOpacity
                  onPress={() => setBackdropColor('transparent')}
                  style={[
                    styles.backdropChip,
                    backdropColor === 'transparent' && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <Text style={styles.backdropChipText}>🏁 Grid</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setBackdropColor('#ffffff')}
                  style={[
                    styles.backdropChip,
                    { backgroundColor: '#ffffff' },
                    backdropColor === '#ffffff' && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <Text style={[styles.backdropChipText, { color: '#000' }]}>White</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setBackdropColor('#1e293b')}
                  style={[
                    styles.backdropChip,
                    { backgroundColor: '#1e293b' },
                    backdropColor === '#1e293b' && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <Text style={[styles.backdropChipText, { color: '#fff' }]}>Dark</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setBackdropColor('#2563eb')}
                  style={[
                    styles.backdropChip,
                    { backgroundColor: '#2563eb' },
                    backdropColor === '#2563eb' && { borderColor: '#fff', borderWidth: 2 },
                  ]}
                >
                  <Text style={[styles.backdropChipText, { color: '#fff' }]}>Blue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Interactive Preview Viewport */}
          {previewTab === 'compare' && resultUri ? (
            <View style={styles.compareContainer}>
              <View style={styles.compareHalf}>
                <Text style={[styles.compareLabel, { color: colors.textMuted }]}>Original</Text>
                <View style={[styles.compareBox, { backgroundColor: colors.cardSecondary }]}>
                  <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
                </View>
              </View>
              <View style={styles.compareHalf}>
                <Text style={[styles.compareLabel, { color: '#10b981' }]}>Cutout Result</Text>
                <View style={[styles.compareBox, isWeb && styles.checkerboardWeb]}>
                  <Image source={{ uri: resultUri }} style={styles.image} resizeMode="contain" />
                </View>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.imageBox,
                previewTab === 'cutout' && resultUri && backdropColor === 'transparent' && isWeb
                  ? styles.checkerboardWeb
                  : { backgroundColor: backdropColor === 'transparent' ? colors.cardSecondary : backdropColor },
              ]}
            >
              <Image
                source={{ uri: previewTab === 'original' || !resultUri ? imageUri : resultUri }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Status Engine Badge */}
          {resultUri && (
            <View style={styles.engineBadgeRow}>
              <CheckCircle2 size={13} color="#10b981" style={{ marginRight: 5 }} />
              <Text style={styles.engineBadgeText}>
                {activeEngine} • Real Alpha Transparency PNG
              </Text>
            </View>
          )}

          {/* Action Trigger or Output Controls */}
          {!resultUri ? (
            <TouchableOpacity
              onPress={handleRemoveBackground}
              disabled={isProcessing}
              style={[
                styles.removeBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isProcessing ? 0.7 : 1,
                },
              ]}
            >
              {isProcessing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.removeBtnText}>Removing Background Locally...</Text>
                </View>
              ) : (
                <>
                  <Scissors size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.removeBtnText}>{t.remove_bg}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.exportSection}>
              {/* Editable Output File Name */}
              <Text style={[styles.label, { color: colors.textMuted, marginBottom: 5 }]}>
                {language === 'am' ? 'የፋይል ስም (.png)' : 'Output File Name (.png):'}
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
                  placeholder="subject_cutout.png"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.filenameInput,
                    { color: colors.text, fontSize: 12 * fontScale },
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Action Buttons Row */}
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity
                  onPress={handleRemoveBackground}
                  disabled={isProcessing}
                  style={[
                    styles.reprocessBtn,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
                  ]}
                >
                  <Scissors size={14} color={colors.text} style={{ marginRight: 5 }} />
                  <Text style={[styles.reprocessBtnText, { color: colors.text }]}>
                    Re-cut ({tolerance})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleExportPng}
                  style={[styles.exportBtn, { backgroundColor: '#10b981' }]}
                >
                  <Download size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.exportBtnText}>
                    {language === 'am' ? 'PNG አውርድ' : 'Download Cutout PNG'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
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
          {t.bg_algorithm_info}
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
  toleranceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  toleranceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toleranceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
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
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  tabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  backdropPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  backdropPickerLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  backdropChips: {
    flexDirection: 'row',
    gap: 6,
  },
  backdropChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  backdropChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  imageBox: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkerboardWeb: {
    // Standard transparency tile pattern rendered via repeating SVG data URI to avoid multi-value CSS properties
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23e5e7eb'/%3E%3Crect x='8' width='8' height='8' fill='%23ffffff'/%3E%3Crect y='8' width='8' height='8' fill='%23ffffff'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23e5e7eb'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundColor: '#ffffff',
  } as any,
  compareContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  compareHalf: {
    flex: 1,
  },
  compareLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  compareBox: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  engineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  engineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  removeBtnText: {
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
  reprocessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  reprocessBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  exportBtn: {
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
