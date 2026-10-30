import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  FileCode,
  Eye,
  Columns,
  Download,
  Copy,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Code,
  Quote,
  Clock,
} from 'lucide-react-native';
import { MarkdownService, MarkdownStats, MarkdownTemplate } from '../services/markdownService';
import { DocumentConverterService } from '../services/documentConverterService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';
import { MarkdownView } from '../components/MarkdownView';

type ViewMode = 'edit' | 'preview' | 'split';

export const MarkdownEditorScreen: React.FC = () => {
  const { colors, t, fontScale } = useTheme();

  const templates = MarkdownService.getTemplates();
  const [markdownText, setMarkdownText] = useState<string>(templates[0].content);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [stats, setStats] = useState<MarkdownStats>({
    words: 0,
    chars: 0,
    lines: 0,
    paragraphs: 0,
    readTimeMinutes: 1,
  });
  const [fileName, setFileName] = useState<string>('cs_notes.md');
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setStats(MarkdownService.calculateStats(markdownText));
  }, [markdownText]);

  const insertSyntax = (prefix: string, suffix = '') => {
    setMarkdownText((prev) => prev + '\n' + prefix + 'text' + suffix);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMd = async () => {
    try {
      const exportName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
      await MarkdownService.exportMarkdown(markdownText, exportName);

      StorageService.addHistoryItem({
        toolId: 'md_editor',
        title: exportName,
        snippet: markdownText.slice(0, 100) + '...',
        fileSize: (markdownText.length / 1024).toFixed(1) + ' KB',
        fileType: 'MD',
      });
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to export markdown');
    }
  };

  const handleExportPdf = async () => {
    try {
      const exportName = fileName.replace(/\.[^/.]+$/, '') + '.pdf';
      const result = await DocumentConverterService.convertMdToPdf(markdownText, exportName);
      await DocumentConverterService.shareResult(result.outputUri);

      await StorageService.addHistoryItem({
        toolId: 'md_editor',
        title: exportName,
        snippet: markdownText.slice(0, 100) + '...',
        fileSize: (result.fileSizeBytes / 1024).toFixed(1) + ' KB',
        fileType: 'PDF',
      });
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Failed to export PDF');
    }
  };

  const handleSelectTemplate = (tpl: MarkdownTemplate) => {
    setMarkdownText(tpl.content);
    setFileName(`${tpl.id}.md`);
    setShowTemplateModal(false);
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
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <FileCode size={22} color="#8b5cf6" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]}>{t.md_editor_title}</Text>
            <View style={styles.statsRow}>
              <Clock size={11} color={colors.textMuted} />
              <Text style={[styles.statsText, { color: colors.textMuted }]}>
                ~{stats.readTimeMinutes} min • {stats.words} words • {stats.lines} lines
              </Text>
            </View>
          </View>
        </View>

        {/* View Mode Switcher: Edit | Preview | Split */}
        <View style={[styles.viewModeRow, { backgroundColor: colors.cardSecondary }]}>
          <TouchableOpacity
            onPress={() => setViewMode('edit')}
            style={[
              styles.viewModeBtn,
              { backgroundColor: viewMode === 'edit' ? colors.primary : 'transparent' },
            ]}
          >
            <FileCode size={13} color={viewMode === 'edit' ? '#fff' : colors.textSecondary} />
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'edit' ? '#fff' : colors.textSecondary },
              ]}
            >
              {t.edit_tab}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode('preview')}
            style={[
              styles.viewModeBtn,
              { backgroundColor: viewMode === 'preview' ? colors.primary : 'transparent' },
            ]}
          >
            <Eye size={13} color={viewMode === 'preview' ? '#fff' : colors.textSecondary} />
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'preview' ? '#fff' : colors.textSecondary },
              ]}
            >
              {t.preview_tab}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode('split')}
            style={[
              styles.viewModeBtn,
              { backgroundColor: viewMode === 'split' ? colors.primary : 'transparent' },
            ]}
          >
            <Columns size={13} color={viewMode === 'split' ? '#fff' : colors.textSecondary} />
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'split' ? '#fff' : colors.textSecondary },
              ]}
            >
              {t.split_tab}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formatting Quick-Action Bar */}
        {viewMode !== 'preview' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.toolbarScroll}
            contentContainerStyle={styles.toolbarContainer}
          >
            <TouchableOpacity
              onPress={() => insertSyntax('# ')}
              style={[styles.toolBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <Heading1 size={14} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => insertSyntax('## ')}
              style={[styles.toolBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <Heading2 size={14} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => insertSyntax('**', '**')}
              style={[styles.toolBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <Bold size={14} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => insertSyntax('*', '*')}
              style={[styles.toolBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <Italic size={14} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => insertSyntax('- ')}
              style={[styles.toolBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <List size={14} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => insertSyntax('`', '`')}
              style={[styles.toolBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <Code size={14} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => insertSyntax('> ')}
              style={[styles.toolBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <Quote size={14} color={colors.text} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Template Button */}
        <TouchableOpacity
          onPress={() => setShowTemplateModal(true)}
          style={[styles.templateBtn, { backgroundColor: colors.cardSecondary }]}
        >
          <Sparkles size={14} color="#8b5cf6" style={{ marginRight: 6 }} />
          <Text style={[styles.templateBtnText, { color: colors.text }]}>
            {t.load_cs_template}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Editor Area */}
      {(viewMode === 'edit' || viewMode === 'split') && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TextInput
            multiline
            value={markdownText}
            onChangeText={setMarkdownText}
            placeholder="# Enter Markdown text or code..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.editorInput,
              {
                color: colors.text,
                fontSize: 12 * fontScale,
                height: viewMode === 'split' ? 140 : 240,
              },
            ]}
          />
        </View>
      )}

      {/* Preview Area */}
      {(viewMode === 'preview' || viewMode === 'split') && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.previewHeaderRow}>
            <Text style={[styles.previewHeading, { color: colors.textSecondary }]}>
              {viewMode === 'split' ? 'Live Split Preview' : 'Document Preview'}
            </Text>
            <View style={[styles.liveBadge, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <View style={[styles.liveDot, { backgroundColor: '#8b5cf6' }]} />
              <Text style={[styles.liveBadgeText, { color: '#8b5cf6' }]}>LIVE</Text>
            </View>
          </View>
          <ScrollView
            style={[
              styles.previewScrollView,
              {
                maxHeight: viewMode === 'split' ? 240 : undefined,
                minHeight: viewMode === 'split' ? 160 : 360,
              },
            ]}
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
          >
            <MarkdownView content={markdownText} />
          </ScrollView>
        </View>
      )}

      {/* Export Action Buttons */}
      <View style={styles.exportRow}>
        <TouchableOpacity
          onPress={handleExportMd}
          style={[styles.halfBtn, { backgroundColor: colors.cardSecondary }]}
        >
          <Download size={15} color="#8b5cf6" style={{ marginRight: 6 }} />
          <Text style={[styles.halfBtnText, { color: colors.text }]}>
            {t.export_md}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExportPdf}
          style={[styles.halfBtn, { backgroundColor: '#8b5cf6' }]}
        >
          <Download size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={[styles.halfBtnText, { color: '#fff' }]}>
            Export PDF
          </Text>
        </TouchableOpacity>
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
            <Text style={[styles.copyBtnText, { color: colors.text }]}>
              Copy Raw Markdown Source
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* CS Template Selector Modal */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.modalHeader}>
              <BookOpen size={18} color="#8b5cf6" style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select CS Template
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {templates.map((tpl) => (
                <TouchableOpacity
                  key={tpl.id}
                  onPress={() => handleSelectTemplate(tpl)}
                  style={[styles.templateItem, { backgroundColor: colors.cardSecondary }]}
                >
                  <Text style={[styles.templateItemTitle, { color: colors.text }]}>
                    {tpl.title}
                  </Text>
                  <Text style={[styles.templateItemDesc, { color: colors.textMuted }]}>
                    {tpl.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowTemplateModal(false)}
              style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}
            >
              <Text style={[styles.closeBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statsText: {
    fontSize: 10,
  },
  viewModeRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    marginBottom: 10,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 5,
  },
  viewModeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toolbarScroll: {
    marginBottom: 10,
  },
  toolbarContainer: {
    gap: 6,
  },
  toolBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 12,
  },
  templateBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  editorInput: {
    fontFamily: 'monospace',
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewScrollView: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  previewBody: {
    lineHeight: 18,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  templateItem: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  templateItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  templateItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
    marginTop: 8,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
