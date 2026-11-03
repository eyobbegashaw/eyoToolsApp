import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {
  Search,
  FileText,
  Volume2,
  ScanText,
  Scan,
  Video,
  QrCode,
  ShieldCheck,
  Scissors,
  ArrowRightLeft,
  FileCode,
  X,
  Layers,
} from 'lucide-react-native';
import { ScreenId, ToolId } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { ToolCard } from '../components/ToolCard';

interface ToolsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({ onNavigate }) => {
  const { colors, fonts, t, language, fontScale } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const toolCategories = [
    {
      id: 'doc',
      category: language === 'am' ? 'ሰነዶች እና ድምጽ' : 'Document & Audio',
      items: [
        {
          id: 'pdf_extract' as ToolId,
          screen: 'pdf_extract' as ScreenId,
          title: t.pdf_extract,
          icon: FileText,
          color: '#059669',
        },
        {
          id: 'file_converter' as ToolId,
          screen: 'file_converter' as ScreenId,
          title: t.file_converter,
          icon: ArrowRightLeft,
          color: '#0284c7',
        },
        {
          id: 'md_editor' as ToolId,
          screen: 'md_editor' as ScreenId,
          title: t.md_editor,
          icon: FileCode,
          color: '#8b5cf6',
        },
        {
          id: 'pdf_audio' as ToolId,
          screen: 'pdf_audio' as ScreenId,
          title: t.pdf_audio,
          icon: Volume2,
          color: '#7c3aed',
        },
      ],
    },
    {
      id: 'vision',
      category: language === 'am' ? 'ምስል እና ንባብ (OCR)' : 'Vision & OCR',
      items: [
        {
          id: 'ocr' as ToolId,
          screen: 'ocr' as ScreenId,
          title: t.ocr,
          icon: ScanText,
          color: '#2563eb',
        },
        {
          id: 'bg_remover' as ToolId,
          screen: 'bg_remover' as ScreenId,
          title: t.bg_remover,
          icon: Scissors,
          color: '#e11d48',
        },
      ],
    },
    {
      id: 'security',
      category: language === 'am' ? 'ደህንነት እና ጠቃሚ መተግበሪያዎች' : 'Security & Utilities',
      items: [
        {
          id: 'steganography' as ToolId,
          screen: 'steganography' as ScreenId,
          title: t.steganography,
          icon: ShieldCheck,
          color: '#4f46e5',
        },
        {
          id: 'qr' as ToolId,
          screen: 'qr' as ScreenId,
          title: t.qr,
          icon: QrCode,
          color: '#d97706',
        },
        {
          id: 'qr_reader' as ToolId,
          screen: 'qr_reader' as ScreenId,
          title: t.qr_reader,
          icon: Scan,
          color: '#0d9488',
        },
        {
          id: 'youtube' as ToolId,
          screen: 'youtube_dl' as ScreenId,
          title: t.youtube,
          icon: Video,
          color: '#dc2626',
        },
      ],
    },
  ];

  const categoryFilters = [
    { id: 'all', label: language === 'am' ? 'ሁሉም (10)' : 'All Tools (10)' },
    { id: 'doc', label: language === 'am' ? 'ሰነድ' : 'Document' },
    { id: 'vision', label: language === 'am' ? 'ምስል' : 'Vision' },
    { id: 'security', label: language === 'am' ? 'ደህንነት' : 'Security' },
  ];

  const filteredCategories = toolCategories
    .filter((cat) => activeCategory === 'all' || cat.id === activeCategory)
    .map((category) => ({
      ...category,
      items: category.items.filter((tool) =>
        tool.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  const totalVisibleCount = filteredCategories.reduce(
    (acc, cat) => acc + cat.items.length,
    0
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Enterprise Compact Search Bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={language === 'am' ? 'መሳሪያዎችን ይፈልጉ...' : 'Search utilities...'}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.searchInput,
            { color: colors.text, fontSize: 13 * fontScale, fontFamily: fonts.regular },
          ]}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.countPill, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.countPillText, { color: colors.cyan, fontFamily: fonts.bold }]}>
              {totalVisibleCount}
            </Text>
          </View>
        )}
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilterScroll}
        contentContainerStyle={styles.categoryFilterContainer}
      >
        {categoryFilters.map((tab) => {
          const isSelected = activeCategory === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              onPress={() => setActiveCategory(tab.id)}
              style={[
                styles.categoryFilterPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: isSelected ? colors.primary : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  {
                    color: isSelected ? '#ffffff' : colors.textSecondary,
                    fontFamily: isSelected ? fonts.bold : fonts.medium,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 2-Column Tools Grid by Category (Icon + Name Only) */}
      {filteredCategories.map((group) => (
        <View key={group.category} style={styles.categorySection}>
          <View style={styles.categoryHeaderRow}>
            <Text
              style={[
                styles.categoryTitle,
                {
                  color: colors.cyan,
                  fontSize: 12 * fontScale,
                  fontFamily: fonts.bold,
                },
              ]}
            >
              {group.category}
            </Text>
            <View style={[styles.catCountBadge, { backgroundColor: colors.cardSecondary }]}>
              <Text style={[styles.catCountText, { color: colors.textMuted, fontFamily: fonts.medium }]}>
                {group.items.length}
              </Text>
            </View>
          </View>

          {/* 2-Column Grid */}
          <View style={styles.twoColumnGrid}>
            {group.items.map((item) => (
              <ToolCard
                key={item.id}
                title={item.title}
                icon={item.icon}
                color={item.color}
                mode="grid"
                onPress={() => onNavigate(item.screen)}
              />
            ))}
          </View>
        </View>
      ))}

      {filteredCategories.length === 0 && (
        <View style={styles.emptyWrap}>
          <Layers size={36} color={colors.textMuted} style={{ marginBottom: 12, opacity: 0.5 }} />
          <Text
            style={[
              styles.emptyText,
              { color: colors.textMuted, fontFamily: fonts.medium },
            ]}
          >
            {language === 'am'
              ? `"${searchQuery}" የሚል መሳሪያ አልተገኘም`
              : `No utilities found matching "${searchQuery}".`}
          </Text>
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
    padding: 14,
    paddingTop: 6, // Reduced top padding
    paddingBottom: 28,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countPillText: {
    fontSize: 10,
  },
  categoryFilterScroll: {
    marginBottom: 14,
  },
  categoryFilterContainer: {
    gap: 6,
  },
  categoryFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryFilterText: {
    fontSize: 11,
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginLeft: 2,
  },
  categoryTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  catCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  catCountText: {
    fontSize: 10,
  },
  // 2-Column Grid Layout for Tools
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
  },
});
