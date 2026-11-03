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
  X,
  ExternalLink,
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
  const { colors, t, fontScale, fonts } = useTheme();

  const [filterTool, setFilterTool] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getToolMeta = (toolId: ToolId) => {
    switch (toolId) {
      case 'pdf_extract':
        return { icon: <FileText size={15} color="#059669" />, label: 'PDF Text' };
      case 'file_converter':
        return { icon: <ArrowRightLeft size={15} color="#0284c7" />, label: 'Converter' };
      case 'md_editor':
        return { icon: <FileCode size={15} color="#8b5cf6" />, label: 'Markdown' };
      case 'pdf_audio':
        return { icon: <Volume2 size={15} color="#7c3aed" />, label: 'PDF Audio' };
      case 'ocr':
        return { icon: <ScanText size={15} color="#2563eb" />, label: 'OCR' };
      case 'youtube':
        return { icon: <Video size={15} color="#dc2626" />, label: 'Video DL' };
      case 'qr':
        return { icon: <QrCode size={15} color="#d97706" />, label: 'QR Gen' };
      case 'qr_reader':
        return { icon: <Scan size={15} color="#0d9488" />, label: 'QR Scan' };
      case 'steganography':
        return { icon: <ShieldCheck size={15} color="#4f46e5" />, label: 'Steganography' };
      case 'bg_remover':
        return { icon: <Scissors size={15} color="#e11d48" />, label: 'BG Remover' };
      default:
        return { icon: <Clock size={15} color={colors.cyan} />, label: 'Tool' };
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
    { id: 'pdf_audio', label: 'PDF Audio' },
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
        <View style={styles.headerLeft}>
          <Text style={[styles.heading, { color: colors.text, fontFamily: fonts.bold }]}>
            {t.history}
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.badgeText, { color: colors.cyan, fontFamily: fonts.bold }]}>
              {history.length}
            </Text>
          </View>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            style={[styles.clearBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
            activeOpacity={0.7}
          >
            <Trash2 size={13} color="#ef4444" style={{ marginRight: 4 }} />
            <Text style={[styles.clearText, { fontFamily: fonts.medium }]}>{t.clear_history}</Text>
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
            placeholder="Search activity records..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.searchInput,
              {
                color: colors.text,
                fontSize: 13 * fontScale,
                fontFamily: fonts.regular,
              },
            ]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
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
            const count =
              f.id === 'all'
                ? history.length
                : history.filter((h) => h.toolId === f.id).length;
            if (f.id !== 'all' && count === 0) return null;

            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilterTool(f.id)}
                activeOpacity={0.7}
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
                      fontFamily: isSelected ? fonts.bold : fonts.medium,
                    },
                  ]}
                >
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* History Items List */}
      <View style={styles.list}>
        {filteredHistory.map((item) => {
          const meta = getToolMeta(item.toolId);
          return (
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
                <TouchableOpacity
                  style={styles.iconTitleRow}
                  activeOpacity={0.7}
                  onPress={() => onNavigate(item.toolId)}
                >
                  <View style={[styles.toolIconWrap, { backgroundColor: colors.cardSecondary }]}>
                    {meta.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.itemTitle, { color: colors.text, fontFamily: fonts.bold }]}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.toolLabel, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                      {meta.label}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.actionsRow}>
                  {item.snippet ? (
                    <TouchableOpacity
                      onPress={() => handleCopy(item.snippet || '', item.id)}
                      style={[styles.actionIcon, { backgroundColor: colors.cardSecondary }]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      {copiedId === item.id ? (
                        <Check size={13} color="#10b981" />
                      ) : (
                        <Copy size={13} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => onNavigate(item.toolId)}
                    style={[styles.actionIcon, { backgroundColor: colors.cardSecondary }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <ExternalLink size={13} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id)}
                    style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2 size={13} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {item.snippet ? (
                <View style={[styles.snippetContainer, { backgroundColor: colors.background }]}>
                  <Text
                    numberOfLines={2}
                    style={[styles.itemSnippet, { color: colors.textSecondary, fontFamily: fonts.regular }]}
                  >
                    {item.snippet}
                  </Text>
                </View>
              ) : null}

              <View style={styles.itemFooter}>
                <Text style={[styles.timeText, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
                {item.fileSize && (
                  <Text style={[styles.sizeBadge, { color: colors.cyan, fontFamily: fonts.bold }]}>
                    {item.fileSize}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {filteredHistory.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.cardSecondary }]}>
              <Clock size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: fonts.bold }]}>
              {t.no_history_yet}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted, fontFamily: fonts.regular }]}>
              Processed files, conversions and generated outputs appear here.
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
    padding: 14,
    paddingTop: 6,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  clearText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  filterScroll: {
    marginBottom: 10,
    marginHorizontal: -14,
  },
  filterContainer: {
    paddingHorizontal: 14,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 11,
  },
  list: {
    gap: 8,
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
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
  toolIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toolLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snippetContainer: {
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  itemSnippet: {
    fontSize: 11,
    lineHeight: 15,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  timeText: {
    fontSize: 10,
  },
  sizeBadge: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
  },
});
