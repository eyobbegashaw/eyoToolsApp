import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Clock,
  Trash2,
  Copy,
  Search,
  FileText,
  Volume2,
  ScanText,
  Video,
  QrCode,
  ShieldCheck,
  Scissors,
  Scan,
  ArrowRightLeft,
  FileCode,
  Check,
} from 'lucide-react-native';
import { HistoryItem, ToolId, ScreenId } from '../types';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

interface HistoryScreenProps {
  history: HistoryItem[];
  onRefresh: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
  onRefresh,
  onNavigate,
}) => {
  const { colors, t, fontScale } = useTheme();

  const [filterTool, setFilterTool] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getToolIcon = (toolId: ToolId) => {
    switch (toolId) {
      case 'pdf_extract':
        return <FileText size={16} color="#059669" />;
      case 'file_converter':
        return <ArrowRightLeft size={16} color="#0284c7" />;
      case 'md_editor':
        return <FileCode size={16} color="#8b5cf6" />;
      case 'pdf_audio':
        return <Volume2 size={16} color="#7c3aed" />;
      case 'ocr':
        return <ScanText size={16} color="#2563eb" />;
      case 'youtube':
        return <Video size={16} color="#dc2626" />;
      case 'qr':
        return <QrCode size={16} color="#d97706" />;
      case 'qr_reader':
        return <Scan size={16} color="#0d9488" />;
      case 'steganography':
        return <ShieldCheck size={16} color="#4f46e5" />;
      case 'bg_remover':
        return <Scissors size={16} color="#e11d48" />;
      default:
        return <Clock size={16} color={colors.cyan} />;
    }
  };

  const handleDeleteItem = async (id: string) => {
    await StorageService.deleteHistoryItem(id);
    onRefresh();
  };

  const handleClearAll = () => {
    Alert.alert(t.clear_history, t.clear_history_confirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.clear,
        style: 'destructive',
        onPress: async () => {
          await StorageService.clearHistory();
          onRefresh();
        },
      },
    ]);
  };

  const handleCopy = async (snippet: string, id: string) => {
    await Clipboard.setStringAsync(snippet);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'file_converter', label: 'Converter' },
    { id: 'md_editor', label: 'Markdown' },
    { id: 'pdf_extract', label: 'PDF Text' },
    { id: 'ocr', label: 'OCR' },
    { id: 'pdf_audio', label: 'Audio TTS' },
    { id: 'qr', label: 'QR Gen' },
    { id: 'qr_reader', label: 'QR Scan' },
    { id: 'steganography', label: 'Stego' },
    { id: 'bg_remover', label: 'BG Remover' },
  ];

  const filteredHistory = history.filter((item) => {
    const matchesTool = filterTool === 'all' || item.toolId === filterTool;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.snippet && item.snippet.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTool && matchesSearch;
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.heading, { color: colors.text }]}>{t.history}</Text>
          <Text style={[styles.subheading, { color: colors.textMuted }]}>
            {history.length} processed items saved locally
          </Text>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            style={styles.clearBtn}
          >
            <Trash2 size={13} color="#ef4444" style={{ marginRight: 4 }} />
            <Text style={styles.clearText}>{t.clear_history}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input */}
      {history.length > 0 && (
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Search size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search records and snippets..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text, fontSize: 13 * fontScale }]}
          />
        </View>
      )}

      {/* Filter Options */}
      {history.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {filterOptions.map((f) => {
            const isSelected = filterTool === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilterTool(f.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isSelected ? '#ffffff' : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* History Items List */}
      <View style={styles.list}>
        {filteredHistory.map((item) => (
          <View
            key={item.id}
            style={[
              styles.itemCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.itemTopRow}>
              <View style={styles.iconTitleRow}>
                {getToolIcon(item.toolId)}
                <Text
                  numberOfLines={1}
                  style={[styles.itemTitle, { color: colors.text }]}
                >
                  {item.title}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                {item.snippet ? (
                  <TouchableOpacity
                    onPress={() => handleCopy(item.snippet || '', item.id)}
                    style={styles.actionIcon}
                  >
                    {copiedId === item.id ? (
                      <Check size={14} color="#10b981" />
                    ) : (
                      <Copy size={14} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={() => handleDeleteItem(item.id)}
                  style={styles.actionIcon}
                >
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            {item.snippet ? (
              <Text
                numberOfLines={2}
                style={[styles.itemSnippet, { color: colors.textSecondary }]}
              >
                {item.snippet}
              </Text>
            ) : null}

            <View style={styles.itemFooter}>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
              {item.fileSize && (
                <Text style={[styles.sizeBadge, { color: colors.cyan }]}>
                  {item.fileSize}
                </Text>
              )}
            </View>
          </View>
        ))}

        {filteredHistory.length === 0 && (
          <View style={styles.emptyContainer}>
            <Clock size={36} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t.no_history_yet}
            </Text>
          </View>
        )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 11,
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  filterScroll: {
    marginBottom: 14,
    marginHorizontal: -16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 11,
  },
  list: {
    gap: 8,
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    padding: 4,
  },
  itemSnippet: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  timeText: {
    fontSize: 10,
  },
  sizeBadge: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
});
