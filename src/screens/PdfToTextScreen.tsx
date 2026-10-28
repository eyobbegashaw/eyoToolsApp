import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import {
  FileText,
  Upload,
  Copy,
  Download,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import { PDFService, PDFExtractionResult } from '../services/pdfService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';
import { ScreenId } from '../types';

interface PdfToTextScreenProps {
  onNavigate?: (screen: ScreenId) => void;
}

export const PdfToTextScreen: React.FC<PdfToTextScreenProps> = ({ onNavigate }) => {
  const { colors, t, fontScale } = useTheme();

  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileSize, setSelectedFileSize] = useState<string>('');
  const [fileUri, setFileUri] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [extractionResult, setExtractionResult] = useState<PDFExtractionResult | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFileName(file.name);
        setSelectedFileSize(
          file.size ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : 'PDF'
        );
        setFileUri(file.uri);
        setExtractionResult(null);
        setProgress(0);
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to select PDF document');
    }
  };

  const handleLoadSample = () => {
    const sampleText = `eyoTools CS Student Edition - Sample PDF Document
Course: Data Structures & Algorithms (CS 204)
Author: Dn Eyob Begashaw
Department of Computer Science

Chapter 1: Asymptotic Analysis and Complexity Classes
1. Big-O notation characterizes functions according to their growth rates:
   - O(1): Constant time complexity
   - O(log n): Logarithmic complexity (e.g., Binary Search)
   - O(n): Linear time complexity (e.g., Linear Scan)
   - O(n log n): Linearithmic (e.g., Merge Sort, QuickSort)
   - O(n^2): Quadratic complexity (e.g., Bubble Sort)

Chapter 2: Abstract Data Types & Memory
Linear collections provide sequential traversal:
1. Singly Linked List: O(1) head insertion, O(n) arbitrary access.
2. Binary Search Tree: O(log n) average lookup in balanced trees.`;

    setSelectedFileName('CS_Algorithms_Lecture_Sample.pdf');
    setSelectedFileSize('184 KB');
    setExtractionResult({
      text: sampleText,
      totalPages: 2,
      wordCount: sampleText.split(/\s+/).length,
      characterCount: sampleText.length,
      isScannedOnly: false,
      hasImages: false,
      pageTexts: [sampleText.slice(0, 300), sampleText.slice(300)],
    });

    StorageService.addHistoryItem({
      toolId: 'pdf_extract',
      title: 'CS_Algorithms_Lecture_Sample.pdf',
      snippet: sampleText.substring(0, 100) + '...',
      fileSize: '184 KB',
      fileType: 'PDF',
    });
  };

  const handleExtract = async () => {
    if (!fileUri) return;

    try {
      setIsProcessing(true);
      setProgress(10);

      const result = await PDFService.extractTextFromUri(fileUri, (p) => {
        setProgress(p);
      });

      setExtractionResult(result);

      await StorageService.addHistoryItem({
        toolId: 'pdf_extract',
        title: selectedFileName,
        snippet: result.text.substring(0, 100) + '...',
        fileSize: selectedFileSize,
        fileType: 'PDF',
      });
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to extract text from PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = async () => {
    if (!extractionResult) return;
    await Clipboard.setStringAsync(extractionResult.text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExportTxt = async () => {
    if (!extractionResult) return;
    const exportName = selectedFileName.replace(/\.[^/.]+$/, '') + '_extracted.txt';
    await PDFService.exportTextFile(extractionResult.text, exportName);
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
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(5, 150, 105, 0.15)' }]}>
            <FileText size={22} color="#059669" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.pdf_extract}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t.pdf_extract_desc}
            </Text>
          </View>
        </View>

        {/* File Picker Box */}
        <TouchableOpacity
          onPress={handlePickDocument}
          activeOpacity={0.7}
          style={[
            styles.dropZone,
            {
              backgroundColor: colors.cardSecondary,
              borderColor: fileUri ? '#059669' : colors.cardBorder,
            },
          ]}
        >
          {selectedFileName ? (
            <View style={styles.selectedFileBox}>
              <FileText size={28} color="#059669" />
              <Text numberOfLines={1} style={[styles.fileName, { color: colors.text }]}>
                {selectedFileName}
              </Text>
              <Text style={[styles.fileSize, { color: colors.textMuted }]}>
                {selectedFileSize} • Ready to extract
              </Text>
            </View>
          ) : (
            <View style={styles.emptyPickerBox}>
              <Upload size={28} color={colors.textMuted} />
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {t.choose_pdf}
              </Text>
              <Text style={[styles.pickerSub, { color: colors.textMuted }]}>
                {t.pdf_drop_zone}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          {fileUri && !extractionResult ? (
            <TouchableOpacity
              onPress={handleExtract}
              disabled={isProcessing}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t.extract_text}</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleLoadSample}
            style={[styles.sampleBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={[styles.sampleBtnText, { color: colors.textSecondary }]}>
              Load CS Sample PDF
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      {isProcessing && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.cardSecondary }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {t.extracting} ({progress}%)
          </Text>
        </View>
      )}

      {/* Extraction Results */}
      {extractionResult && (
        <View
          style={[
            styles.resultCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {extractionResult.isScannedOnly ? (
            <View
              style={[
                styles.scannedContainer,
                { backgroundColor: 'rgba(217, 119, 6, 0.08)', borderColor: '#d97706' },
              ]}
            >
              <View style={styles.scannedHeaderRow}>
                <AlertCircle size={22} color="#d97706" style={{ marginRight: 8 }} />
                <Text style={[styles.scannedTitle, { color: colors.text }]}>
                  Scanned / Image-Only PDF Detected
                </Text>
              </View>
              <Text style={[styles.scannedDescription, { color: colors.textSecondary }]}>
                {t.scanned_pdf_warning}
              </Text>
              <Text style={[styles.scannedInfoTip, { color: colors.textMuted }]}>
                Standard text extraction only works for digital PDFs with embedded font layers. For scanned physical papers, books, or image PDFs, use optical character recognition.
              </Text>
              {onNavigate && (
                <TouchableOpacity
                  onPress={() => onNavigate('ocr')}
                  style={[styles.openOcrBtn, { backgroundColor: colors.primary }]}
                >
                  <Sparkles size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.openOcrBtnText}>Open Image to Text (OCR) Tool</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <View style={styles.resultStatsRow}>
                <Text style={[styles.statsItem, { color: colors.textMuted }]}>
                  {extractionResult.totalPages} Pages • {extractionResult.wordCount} Words
                </Text>

                <View style={styles.resultIconsRow}>
                  <TouchableOpacity onPress={handleCopyText} style={styles.iconAction}>
                    <Copy size={16} color={copySuccess ? '#10b981' : colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleExportTxt} style={styles.iconAction}>
                    <Download size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Bar inside extracted text */}
              <View
                style={[
                  styles.innerSearchBar,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
                ]}
              >
                <Search size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t.search_in_text}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.innerSearchInput, { color: colors.text, fontSize: 12 * fontScale }]}
                />
              </View>

              {/* Text Area Viewer */}
              <ScrollView style={styles.textViewBox} nestedScrollEnabled>
                <Text
                  style={[
                    styles.extractedBody,
                    { color: colors.text, fontSize: 12 * fontScale },
                  ]}
                >
                  {extractionResult.text}
                </Text>
              </ScrollView>

              {/* Export & Copy Action Buttons */}
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity
                  onPress={handleCopyText}
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
            </>
          )}
        </View>
      )}
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
  dropZone: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  selectedFileBox: {
    alignItems: 'center',
    gap: 6,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
  },
  fileSize: {
    fontSize: 11,
  },
  emptyPickerBox: {
    alignItems: 'center',
    gap: 4,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  pickerSub: {
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
  progressContainer: {
    marginBottom: 16,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  warningText: {
    color: '#d97706',
    fontSize: 11,
    flex: 1,
  },
  resultStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsItem: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultIconsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconAction: {
    padding: 4,
  },
  innerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  innerSearchInput: {
    flex: 1,
    height: '100%',
  },
  textViewBox: {
    maxHeight: 220,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 14,
  },
  extractedBody: {
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  exportButtonsRow: {
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
  scannedContainer: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  scannedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scannedTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  scannedDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  scannedInfoTip: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
  },
  openOcrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  openOcrBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
