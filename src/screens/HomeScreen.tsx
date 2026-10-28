import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
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
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { ScreenId, ToolId, HistoryItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { ToolCard } from '../components/ToolCard';

interface HomeScreenProps {
  onNavigate: (screen: ScreenId) => void;
  recentHistory: HistoryItem[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, recentHistory }) => {
  const { colors, t, language, fontScale } = useTheme();

  const toolsList = [
    {
      id: 'pdf_extract' as ToolId,
      screen: 'pdf_extract' as ScreenId,
      title: t.pdf_extract,
      description: t.pdf_extract_desc,
      icon: FileText,
      color: '#059669', // Emerald
      badge: 'Local',
    },
    {
      id: 'file_converter' as ToolId,
      screen: 'file_converter' as ScreenId,
      title: t.file_converter,
      description: t.file_converter_desc,
      icon: ArrowRightLeft,
      color: '#0284c7', // Blue/Cyan
      badge: 'DOC•PPT•MD',
    },
    {
      id: 'md_editor' as ToolId,
      screen: 'md_editor' as ScreenId,
      title: t.md_editor,
      description: t.md_editor_desc,
      icon: FileCode,
      color: '#8b5cf6', // Purple
      badge: 'Studio & PDF',
    },
    {
      id: 'ocr' as ToolId,
      screen: 'ocr' as ScreenId,
      title: t.ocr,
      description: t.ocr_desc,
      icon: ScanText,
      color: '#2563eb', // Blue
      badge: 'Fidel & Eng',
    },
    {
      id: 'pdf_audio' as ToolId,
      screen: 'pdf_audio' as ScreenId,
      title: t.pdf_audio,
      description: t.pdf_audio_desc,
      icon: Volume2,
      color: '#7c3aed', // Indigo
      badge: 'TTS',
    },
    {
      id: 'qr' as ToolId,
      screen: 'qr' as ScreenId,
      title: t.qr,
      description: t.qr_desc,
      icon: QrCode,
      color: '#d97706', // Amber
      badge: 'Generator',
    },
    {
      id: 'qr_reader' as ToolId,
      screen: 'qr_reader' as ScreenId,
      title: t.qr_reader,
      description: t.qr_reader_desc,
      icon: Scan,
      color: '#0d9488', // Teal
      badge: 'Scanner',
    },
    {
      id: 'steganography' as ToolId,
      screen: 'steganography' as ScreenId,
      title: t.steganography,
      description: t.steganography_desc,
      icon: ShieldCheck,
      color: '#4f46e5', // Deep Indigo
      badge: '16-bit LSB',
    },
    {
      id: 'bg_remover' as ToolId,
      screen: 'bg_remover' as ScreenId,
      title: t.bg_remover,
      description: t.bg_remover_desc,
      icon: Scissors,
      color: '#e11d48', // Rose
      badge: '4-Corner Mask',
    },
    {
      id: 'youtube' as ToolId,
      screen: 'youtube_dl' as ScreenId,
      title: t.youtube,
      description: t.youtube_desc,
      icon: Video,
      color: '#dc2626', // Red
      badge: 'Media Stream',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Welcome Card */}
      <LinearGradient
        colors={['#0284c7', '#0f766e', '#0f172a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.pillBadge}>
            <Text style={styles.pillText}>{t.cs_students}</Text>
          </View>
          <Text style={styles.heroVersion}>v1.0.0</Text>
        </View>

        <Text style={[styles.heroTitle, { fontSize: 20 * fontScale }]}>
          {t.welcome}
        </Text>
        <Text style={styles.heroSub}>{t.welcome_sub}</Text>

        <View style={styles.quoteBox}>
          <Text style={styles.quoteText}>{t.cs_quote}</Text>
        </View>
      </LinearGradient>

      {/* Quick Action Horizontal Pills */}
      <View style={styles.quickActionsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          <TouchableOpacity
            onPress={() => onNavigate('pdf_extract')}
            style={[styles.quickPill, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}
          >
            <FileText size={14} color="#10b981" />
            <Text style={[styles.quickPillText, { color: '#10b981' }]}>Extract PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('file_converter')}
            style={[styles.quickPill, { backgroundColor: 'rgba(2, 132, 199, 0.12)', borderColor: 'rgba(2, 132, 199, 0.3)' }]}
          >
            <ArrowRightLeft size={14} color="#0284c7" />
            <Text style={[styles.quickPillText, { color: '#0284c7' }]}>Convert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('md_editor')}
            style={[styles.quickPill, { backgroundColor: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.3)' }]}
          >
            <FileCode size={14} color="#8b5cf6" />
            <Text style={[styles.quickPillText, { color: '#8b5cf6' }]}>MD Studio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('ocr')}
            style={[styles.quickPill, { backgroundColor: 'rgba(37, 99, 235, 0.12)', borderColor: 'rgba(37, 99, 235, 0.3)' }]}
          >
            <ScanText size={14} color="#2563eb" />
            <Text style={[styles.quickPillText, { color: '#2563eb' }]}>OCR Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('qr_reader')}
            style={[styles.quickPill, { backgroundColor: 'rgba(13, 148, 136, 0.12)', borderColor: 'rgba(13, 148, 136, 0.3)' }]}
          >
            <Scan size={14} color="#0d9488" />
            <Text style={[styles.quickPillText, { color: '#0d9488' }]}>Scan QR</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Featured Tools Section */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t.tools}
          </Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            {t.select_tool}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onNavigate('tools')}
          style={styles.viewAllBtn}
        >
          <Text style={[styles.viewAllText, { color: colors.cyan }]}>
            {t.view_all_tools}
          </Text>
          <ArrowRight size={13} color={colors.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.toolsGrid}>
        {toolsList.map((item) => (
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

      {/* Recent History Preview Section */}
      {recentHistory.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t.recent_activity}
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                {recentHistory.length} items logged
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => onNavigate('history')}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.cyan }]}>
                {t.history}
              </Text>
              <ArrowRight size={13} color={colors.cyan} />
            </TouchableOpacity>
          </View>

          {recentHistory.slice(0, 2).map((item) => (
            <View
              key={item.id}
              style={[
                styles.historyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.historyRow}>
                <Clock size={14} color={colors.cyan} style={{ marginRight: 8 }} />
                <Text
                  numberOfLines={1}
                  style={[styles.historyTitle, { color: colors.text }]}
                >
                  {item.title}
                </Text>
                {item.fileSize && (
                  <Text style={[styles.historySize, { color: colors.textMuted }]}>
                    {item.fileSize}
                  </Text>
                )}
              </View>
              {item.snippet ? (
                <Text
                  numberOfLines={1}
                  style={[styles.historySnippet, { color: colors.textSecondary }]}
                >
                  {item.snippet}
                </Text>
              ) : null}
            </View>
          ))}
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
  heroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pillBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroVersion: {
    color: '#bae6fd',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  heroTitle: {
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  heroSub: {
    color: '#e0f2fe',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  quoteBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  quoteText: {
    color: '#f0f9ff',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  quickActionsWrap: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toolsGrid: {
    gap: 4,
  },
  historySection: {
    marginTop: 16,
  },
  historyCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  historySize: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  historySnippet: {
    fontSize: 11,
    marginTop: 4,
  },
});
