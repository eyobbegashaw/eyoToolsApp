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
      color: '#059669',
      badge: 'Local',
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
      badge: 'Studio',
    },
    {
      id: 'ocr' as ToolId,
      screen: 'ocr' as ScreenId,
      title: t.ocr,
      description: t.ocr_desc,
      icon: ScanText,
      color: '#2563eb',
      badge: 'Fidel',
    },
    {
      id: 'pdf_audio' as ToolId,
      screen: 'pdf_audio' as ScreenId,
      title: t.pdf_audio,
      description: t.pdf_audio_desc,
      icon: Volume2,
      color: '#7c3aed',
      badge: 'TTS',
    },
    {
      id: 'qr' as ToolId,
      screen: 'qr' as ScreenId,
      title: t.qr,
      description: t.qr_desc,
      icon: QrCode,
      color: '#d97706',
      badge: 'Gen',
    },
    {
      id: 'qr_reader' as ToolId,
      screen: 'qr_reader' as ScreenId,
      title: t.qr_reader,
      description: t.qr_reader_desc,
      icon: Scan,
      color: '#0d9488',
      badge: 'Scan',
    },
    {
      id: 'steganography' as ToolId,
      screen: 'steganography' as ScreenId,
      title: t.steganography,
      description: t.steganography_desc,
      icon: ShieldCheck,
      color: '#4f46e5',
      badge: 'LSB',
    },
    {
      id: 'bg_remover' as ToolId,
      screen: 'bg_remover' as ScreenId,
      title: t.bg_remover,
      description: t.bg_remover_desc,
      icon: Scissors,
      color: '#e11d48',
      badge: 'Mask',
    },
    {
      id: 'youtube' as ToolId,
      screen: 'youtube_dl' as ScreenId,
      title: t.youtube,
      description: t.youtube_desc,
      icon: Video,
      color: '#dc2626',
      badge: 'Stream',
    },
  ];

  const defaultPopularTools: ToolId[] = ['pdf_extract', 'file_converter', 'qr'];

  const rankedPopularTools = (() => {
    const counts = new Map<ToolId, number>();

    recentHistory.forEach((item) => {
      counts.set(item.toolId, (counts.get(item.toolId) ?? 0) + 1);
    });

    const orderedIds = [...new Set([...counts.keys(), ...defaultPopularTools])]
      .sort((a, b) => {
        const countDiff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
        if (countDiff !== 0) return countDiff;
        return defaultPopularTools.indexOf(a) - defaultPopularTools.indexOf(b);
      })
      .slice(0, 3);

    if (orderedIds.length < 3) {
      defaultPopularTools.forEach((toolId) => {
        if (!orderedIds.includes(toolId)) {
          orderedIds.push(toolId);
        }
      });
    }

    return orderedIds.slice(0, 3);
  })();

  const popularTools = toolsList.filter((tool) => rankedPopularTools.includes(tool.id));

  const defaultHistoryItems: HistoryItem[] = [
    {
      id: 'default-history-1',
      toolId: 'pdf_extract',
      title: 'PDF extraction',
      timestamp: Date.now() - 60000,
      snippet: 'Turn scanned files into editable text quickly',
      fileSize: '1 min ago',
      fileType: 'PDF',
    },
    {
      id: 'default-history-2',
      toolId: 'file_converter',
      title: 'File converter',
      timestamp: Date.now() - 120000,
      snippet: 'Convert docs, slides, and markdown on the go',
      fileSize: '2 min ago',
      fileType: 'DOC',
    },
    {
      id: 'default-history-3',
      toolId: 'qr',
      title: 'QR generator',
      timestamp: Date.now() - 180000,
      snippet: 'Create shareable QR codes for links and text',
      fileSize: '3 min ago',
      fileType: 'QR',
    },
  ];

  const displayHistory = recentHistory.length >= 3 
    ? recentHistory.slice(0, 3)
    : [...recentHistory, ...defaultHistoryItems].slice(0, 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#0f172a', '#0b1120', '#0369a1']}
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

        <Text style={[styles.heroTitle, { fontSize: 20 * fontScale }]}>{t.welcome}</Text>
        <Text style={styles.heroSub}>{t.welcome_sub}</Text>

        <View style={styles.heroMetrics}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{popularTools.length}</Text>
            <Text style={styles.metricLabel}>Smart picks</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{displayHistory.length}</Text>
            <Text style={styles.metricLabel}>Recent</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>3+</Text>
            <Text style={styles.metricLabel}>Quick access</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Most used tools</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            {language === 'am' ? 'በተደጋጋሚ የሚጠቀሙት' : 'Based on your recent activity'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => onNavigate('tools')} style={styles.viewAllBtn}>
          <Text style={[styles.viewAllText, { color: colors.cyan }]}>{t.view_all_tools}</Text>
          <ArrowRight size={13} color={colors.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.smartPicksWrap}>
        {popularTools.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => onNavigate(item.screen)}
              style={[
                styles.smartPickCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={[styles.smartIcon, { backgroundColor: item.color }]}>
                <Icon size={18} color="#fff" />
              </View>
              <Text style={[styles.smartTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.smartDescription, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
              <View style={styles.smartFooter}>
                <Text style={[styles.smartBadge, { color: item.color }]}>{item.badge}</Text>
                <ArrowRight size={12} color={item.color} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.recent_activity}</Text>
            <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
              {recentHistory.length} items logged
            </Text>
          </View>

          <TouchableOpacity onPress={() => onNavigate('history')} style={styles.viewAllBtn}>
            <Text style={[styles.viewAllText, { color: colors.cyan }]}>{t.history}</Text>
            <ArrowRight size={13} color={colors.cyan} />
          </TouchableOpacity>
        </View>

        {displayHistory.map((item) => (
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
              <Text numberOfLines={1} style={[styles.historyTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              {item.fileSize && (
                <Text style={[styles.historySize, { color: colors.textMuted }]}>{item.fileSize}</Text>
              )}
            </View>
            {item.snippet ? (
              <Text numberOfLines={1} style={[styles.historySnippet, { color: colors.textSecondary }]}>
                {item.snippet}
              </Text>
            ) : null}
          </View>
        ))}
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
  heroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    elevation: 4,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.2)',
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
  heroMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#bae6fd',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '700',
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
  smartPicksWrap: {
    gap: 10,
    marginBottom: 8,
  },
  smartPickCard: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    boxShadow: '0px 4px 12px rgba(15, 23, 42, 0.12)',
  },
  smartIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  smartTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  smartDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  smartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smartBadge: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
