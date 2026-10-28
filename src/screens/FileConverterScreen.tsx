import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowRightLeft,
  FileText,
  Presentation,
  FileCode,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react-native';
import {
  DocumentConverterService,
  ConversionDirection,
  ConversionResult,
} from '../services/documentConverterService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

type TabMode = 'doc' | 'ppt' | 'md';

export const FileConverterScreen: React.FC = () => {
  const { colors, t, fontScale } = useTheme();

  const [activeTab, setActiveTab] = useState<TabMode>('doc');
  const [isReversed, setIsReversed] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileUri, setSelectedFileUri] = useState<string>('');
  const [selectedFileSize, setSelectedFileSize] = useState<string>('');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  const getDirection = (): ConversionDirection => {
    if (activeTab === 'doc') {
      return isReversed ? 'pdf_to_doc' : 'doc_to_pdf';
    } else if (activeTab === 'ppt') {
      return isReversed ? 'pdf_to_ppt' : 'ppt_to_pdf';
    } else {
      return isReversed ? 'pdf_to_md' : 'md_to_pdf';
    }
  };

  const getSourceBadge = (): string => {
    const dir = getDirection();
    switch (dir) {
      case 'doc_to_pdf':
        return 'WORD (DOCX)';
      case 'pdf_to_doc':
        return 'PDF';
      case 'ppt_to_pdf':
        return 'POWERPOINT (PPTX)';
      case 'pdf_to_ppt':
        return 'PDF';
      case 'md_to_pdf':
        return 'MARKDOWN (.MD)';
      case 'pdf_to_md':
        return 'PDF';
    }
  };

  const getTargetBadge = (): string => {
    const dir = getDirection();
    switch (dir) {
      case 'doc_to_pdf':
        return 'PDF';
      case 'pdf_to_doc':
        return 'WORD (DOCX)';
      case 'ppt_to_pdf':
        return 'PDF (LANDSCAPE)';
      case 'pdf_to_ppt':
        return 'POWERPOINT (PPTX)';
      case 'md_to_pdf':
        return 'PDF DOCUMENT';
      case 'pdf_to_md':
        return 'MARKDOWN (.MD)';
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFileName(file.name);
        setSelectedFileUri(file.uri);
        setSelectedFileSize(
          file.size ? (file.size / 1024).toFixed(1) + ' KB' : 'Document'
        );
        setConversionResult(null);
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to select document');
    }
  };

  const handleLoadSample = async () => {
    const dir = getDirection();
    let sampleType: 'docx' | 'pptx' | 'pdf' | 'md' = 'docx';
    if (dir === 'doc_to_pdf') sampleType = 'docx';
    else if (dir === 'ppt_to_pdf') sampleType = 'pptx';
    else if (dir === 'md_to_pdf') sampleType = 'md';
    else sampleType = 'pdf';

    const sample = await DocumentConverterService.createSampleDocument(sampleType);
    setSelectedFileName(sample.name);
    setSelectedFileUri(sample.uri);
    setSelectedFileSize((sample.size / 1024).toFixed(1) + ' KB');
    setConversionResult(null);
  };

  const handleConvert = async () => {
    if (!selectedFileUri) return;

    setIsConverting(true);
    const dir = getDirection();

    try {
      let result: ConversionResult;
      if (dir === 'doc_to_pdf') {
        result = await DocumentConverterService.convertDocxToPdf(
          selectedFileUri,
          selectedFileName
        );
      } else if (dir === 'pdf_to_doc') {
        result = await DocumentConverterService.convertPdfToDocx(
          selectedFileUri,
          selectedFileName
        );
      } else if (dir === 'ppt_to_pdf') {
        result = await DocumentConverterService.convertPptxToPdf(
          selectedFileUri,
          selectedFileName
        );
      } else if (dir === 'pdf_to_ppt') {
        result = await DocumentConverterService.convertPdfToPptx(
          selectedFileUri,
          selectedFileName
        );
      } else if (dir === 'md_to_pdf') {
        result = await DocumentConverterService.convertMdToPdf(
          '# Converted Document\n\nGenerated via eyoTools Mobile',
          selectedFileName
        );
      } else {
        result = await DocumentConverterService.convertPdfToMd(
          selectedFileUri,
          selectedFileName
        );
      }

      setConversionResult(result);

      await StorageService.addHistoryItem({
        toolId: 'file_converter',
        title: `${selectedFileName} → ${result.outputFileName}`,
        snippet: result.textPreview || `Converted to ${getTargetBadge()}`,
        fileSize: (result.fileSizeBytes / 1024).toFixed(1) + ' KB',
        fileType: result.outputFileName.split('.').pop()?.toUpperCase() || 'FILE',
      });
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Conversion failed');
    } finally {
      setIsConverting(false);
    }
  };

  const handleShareResult = async () => {
    if (!conversionResult) return;
    await DocumentConverterService.shareResult(conversionResult.outputUri);
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
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
            <ArrowRightLeft size={22} color="#0284c7" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t.file_converter_title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.file_converter_desc}
            </Text>
          </View>
        </View>

        {/* Tab switchers: Word <-> PDF | PPT <-> PDF | MD <-> PDF */}
        <View style={[styles.tabsRow, { backgroundColor: colors.cardSecondary }]}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('doc');
              setConversionResult(null);
            }}
            style={[
              styles.tabBtn,
              { backgroundColor: activeTab === 'doc' ? colors.primary : 'transparent' },
            ]}
          >
            <FileText size={13} color={activeTab === 'doc' ? '#fff' : colors.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'doc' ? '#fff' : colors.textSecondary },
              ]}
            >
              Word ↔ PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveTab('ppt');
              setConversionResult(null);
            }}
            style={[
              styles.tabBtn,
              { backgroundColor: activeTab === 'ppt' ? colors.primary : 'transparent' },
            ]}
          >
            <Presentation size={13} color={activeTab === 'ppt' ? '#fff' : colors.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'ppt' ? '#fff' : colors.textSecondary },
              ]}
            >
              PPT ↔ PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveTab('md');
              setConversionResult(null);
            }}
            style={[
              styles.tabBtn,
              { backgroundColor: activeTab === 'md' ? colors.primary : 'transparent' },
            ]}
          >
            <FileCode size={13} color={activeTab === 'md' ? '#fff' : colors.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'md' ? '#fff' : colors.textSecondary },
              ]}
            >
              MD ↔ PDF
            </Text>
          </TouchableOpacity>
        </View>

        {/* Direction Indicator Pill & Swap Action */}
        <View style={[styles.directionRow, { backgroundColor: colors.cardSecondary }]}>
          <View style={styles.directionBadges}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {getSourceBadge()}
            </Text>
            <Text style={[styles.arrowText, { color: colors.textMuted }]}>➔</Text>
            <Text style={[styles.badgeText, { color: '#10b981' }]}>
              {getTargetBadge()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setIsReversed((prev) => !prev);
              setConversionResult(null);
            }}
            style={[styles.swapBtn, { backgroundColor: colors.card }]}
          >
            <RefreshCw size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.swapText, { color: colors.text }]}>Swap</Text>
          </TouchableOpacity>
        </View>

        {/* File Picker Zone */}
        <TouchableOpacity
          onPress={handlePickFile}
          style={[
            styles.pickDropZone,
            {
              backgroundColor: colors.cardSecondary,
              borderColor: selectedFileUri ? '#0284c7' : colors.cardBorder,
            },
          ]}
        >
          {selectedFileName ? (
            <View style={styles.selectedBox}>
              <FileText size={28} color="#0284c7" />
              <Text numberOfLines={1} style={[styles.selectedName, { color: colors.text }]}>
                {selectedFileName}
              </Text>
              <Text style={[styles.selectedSize, { color: colors.textMuted }]}>
                {selectedFileSize} • Ready to convert
              </Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Upload size={28} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t.select_file_to_convert}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Tap to pick from device storage
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Actions: Convert or Load Sample */}
        <View style={styles.actionsRow}>
          {selectedFileUri && !conversionResult && (
            <TouchableOpacity
              onPress={handleConvert}
              disabled={isConverting}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              {isConverting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t.convert_action}</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleLoadSample}
            style={[styles.sampleBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={[styles.sampleBtnText, { color: colors.textSecondary }]}>
              {t.test_sample_file}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversion Result Card */}
      {conversionResult && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.resultHeader}>
            <CheckCircle2 size={18} color="#10b981" style={{ marginRight: 6 }} />
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {t.conversion_success}
            </Text>
          </View>

          <View style={[styles.resultInfoBox, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.outputName, { color: colors.text }]}>
              {conversionResult.outputFileName}
            </Text>
            <Text style={[styles.outputMeta, { color: colors.textMuted }]}>
              Size: {(conversionResult.fileSizeBytes / 1024).toFixed(1)} KB
              {conversionResult.pageCount ? ` • ${conversionResult.pageCount} Pages` : ''}
              {conversionResult.slideCount ? ` • ${conversionResult.slideCount} Slides` : ''}
            </Text>
          </View>

          {conversionResult.textPreview && (
            <ScrollView style={styles.previewBox} nestedScrollEnabled>
              <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                {conversionResult.textPreview}
              </Text>
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={handleShareResult}
            style={[styles.shareBtn, { backgroundColor: '#10b981' }]}
          >
            <Download size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.shareBtnText}>{t.download_converted}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Notice */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
        ]}
      >
        <Info size={15} color={colors.cyan} style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          100% On-Device Document Engine. No cloud uploads. Your private documents, assignments, and slides remain securely on your device.
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
  tabsRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  directionBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  arrowText: {
    fontSize: 12,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  swapText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pickDropZone: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  selectedBox: {
    alignItems: 'center',
    gap: 4,
  },
  selectedName: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedSize: {
    fontSize: 11,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 11,
  },
  actionsRow: {
    gap: 8,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
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
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultInfoBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  outputName: {
    fontSize: 13,
    fontWeight: '700',
  },
  outputMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  previewBox: {
    maxHeight: 120,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 12,
  },
  previewText: {
    fontSize: 11,
    lineHeight: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 13,
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
