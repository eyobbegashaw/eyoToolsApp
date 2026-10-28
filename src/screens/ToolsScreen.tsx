import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
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
} from 'lucide-react-native';
import { ScreenId, ToolId } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { ToolCard } from '../components/ToolCard';

interface ToolsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({ onNavigate }) => {
  const { colors, t, fontScale } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const toolCategories = [
    {
      category: 'Document & Audio',
      items: [
        {
          id: 'pdf_extract' as ToolId,
          screen: 'pdf_extract' as ScreenId,
          title: t.pdf_extract,
          description: t.pdf_extract_desc,
          icon: FileText,
          color: '#059669',
          badge: '100% Offline',
        },
        {
          id: 'file_converter' as ToolId,
          screen: 'file_converter' as ScreenId,
          title: t.file_converter,
          description: t.file_converter_desc,
          icon: ArrowRightLeft,
          color: '#0284c7',
          badge: 'DOC•PPT•MD',
        },
        {
          id: 'md_editor' as ToolId,
          screen: 'md_editor' as ScreenId,
          title: t.md_editor,
          description: t.md_editor_desc,
          icon: FileCode,
          color: '#8b5cf6',
          badge: 'Studio & PDF',
        },
        {
          id: 'pdf_audio' as ToolId,
          screen: 'pdf_audio' as ScreenId,
          title: t.pdf_audio,
          description: t.pdf_audio_desc,
          icon: Volume2,
          color: '#7c3aed',
          badge: 'TTS Voice',
        },
      ],
    },
    {
      category: 'Vision & OCR',
      items: [
        {
          id: 'ocr' as ToolId,
          screen: 'ocr' as ScreenId,
          title: t.ocr,
          description: t.ocr_desc,
          icon: ScanText,
          color: '#2563eb',
          badge: 'Amharic + Eng',
        },
        {
          id: 'bg_remover' as ToolId,
          screen: 'bg_remover' as ScreenId,
          title: t.bg_remover,
          description: t.bg_remover_desc,
          icon: Scissors,
          color: '#e11d48',
          badge: 'Alpha Mask',
        },
      ],
    },
    {
      category: 'Security & Network Utilities',
      items: [
        {
          id: 'steganography' as ToolId,
          screen: 'steganography' as ScreenId,
          title: t.steganography,
          description: t.steganography_desc,
          icon: ShieldCheck,
          color: '#4f46e5',
          badge: '16-bit LSB',
        },
        {
          id: 'qr' as ToolId,
          screen: 'qr' as ScreenId,
          title: t.qr,
          description: t.qr_desc,
          icon: QrCode,
          color: '#d97706',
          badge: 'Generator',
        },
        {
          id: 'qr_reader' as ToolId,
          screen: 'qr_reader' as ScreenId,
          title: t.qr_reader,
          description: t.qr_reader_desc,
          icon: Scan,
          color: '#0d9488',
          badge: 'Scanner',
        },
        {
          id: 'youtube' as ToolId,
          screen: 'youtube_dl' as ScreenId,
          title: t.youtube,
          description: t.youtube_desc,
          icon: Video,
          color: '#dc2626',
          badge: 'Media Stream',
        },
      ],
    },
  ];

  const filteredCategories = toolCategories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (tool) =>
          tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Search Bar */}
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
          placeholder="Search all tools and utilities..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text, fontSize: 13 * fontScale }]}
        />
      </View>

      {/* Categorized Lists */}
      {filteredCategories.map((group) => (
        <View key={group.category} style={styles.categoryWrap}>
          <Text
            style={[
              styles.categoryTitle,
              {
                color: colors.cyan,
                fontSize: 12 * fontScale,
              },
            ]}
          >
            {group.category}
          </Text>

          {group.items.map((item) => (
            <ToolCard
              key={item.id}
              title={item.title}
              description={item.description}
              icon={item.icon}
              color={item.color}
              badge={item.badge}
              onPress={() => onNavigate(item.screen)}
            />
          ))}
        </View>
      ))}

      {filteredCategories.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No tools found matching "{searchQuery}".
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
    padding: 16,
    paddingBottom: 28,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  categoryWrap: {
    marginBottom: 12,
  },
  categoryTitle: {
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
  },
});
