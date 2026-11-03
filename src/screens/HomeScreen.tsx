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
  const { colors, fonts, t, language, fontScale } = useTheme();

  const toolsList = [
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
      id: 'ocr' as ToolId,
      screen: 'ocr' as ScreenId,
      title: t.ocr,
      icon: ScanText,
      color: '#2563eb',
    },
    {
      id: 'pdf_audio' as ToolId,
      screen: 'pdf_audio' as ScreenId,
      title: t.pdf_audio,
      icon: Volume2,
      color: '#7c3aed',
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
      id: 'steganography' as ToolId,
      screen: 'steganography' as ScreenId,
      title: t.steganography,
      icon: ShieldCheck,
      color: '#4f46e5',
    },
    {
      id: 'bg_remover' as ToolId,
      screen: 'bg_remover' as ScreenId,
      title: t.bg_remover,
      icon: Scissors,
      color: '#e11d48',
    },
    {
      id: 'youtube' as ToolId,
      screen: 'youtube_dl' as ScreenId,
      title: t.youtube,
      icon: Video,
      color: '#dc2626',
    },
  ];

  const defaultPopularTools: ToolId[] = ['pdf_extract', 'file_converter', 'ocr', 'qr'];

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
      .slice(0, 4);

    if (orderedIds.length < 4) {
      defaultPopularTools.forEach((toolId) => {
        if (!orderedIds.includes(toolId) && orderedIds.length < 4) {
          orderedIds.push(toolId);
        }
      });
    }

    return orderedIds.slice(0, 4);
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

  const displayHistory =
    recentHistory.length >= 3
      ? recentHistory.slice(0, 3)
      : [...recentHistory, ...defaultHistoryItems].slice(0, 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Enterprise Compact Hero Card */}
      <LinearGradient
        colors={['#0b1329', '#0f1f3d', '#0284c7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.pillBadge}>
            <Sparkles size={11} color="#38bdf8" style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, { fontFamily: fonts.bold }]}>
              {t.cs_students}
            </Text>
          </View>
          <Text style={[styles.heroVersion, { fontFamily: fonts.medium }]}>v1.0.0</Text>
        </View>

        <Text
          style={[
            styles.heroTitle,
            { fontSize: 19 * fontScale, fontFamily: fonts.bold },
          ]}
        >
          {t.welcome}
        </Text>
        <Text style={[styles.heroSub, { fontFamily: fonts.regular }]}>
          {t.welcome_sub}
        </Text>

        <View style={styles.heroMetrics}>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { fontFamily: fonts.bold }]}>10</Text>
            <Text style={[styles.metricLabel, { fontFamily: fonts.medium }]}>
              {language === 'am' ? 'መሳሪያዎች' : 'Core Tools'}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { fontFamily: fonts.bold }]}>
              {popularTools.length}
            </Text>
            <Text style={[styles.metricLabel, { fontFamily: fonts.medium }]}>
              {language === 'am' ? 'ምርጥ ምርጫ' : 'Smart Picks'}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { fontFamily: fonts.bold }]}>100%</Text>
            <Text style={[styles.metricLabel, { fontFamily: fonts.medium }]}>
              {language === 'am' ? 'ደህንነቱ የተጠበቀ' : 'Offline Safe'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Most Used Tools Section Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontSize: 14 * fontScale, fontFamily: fonts.bold },
            ]}
          >
            {language === 'am' ? 'በተደጋጋሚ የሚጠቀሙት' : 'Most Used Tools'}
          </Text>
          <Text
            style={[
              styles.sectionSub,
              { color: colors.textMuted, fontSize: 11 * fontScale, fontFamily: fonts.regular },
            ]}
          >
            {language === 'am' ? 'በቅርብ የተጠቀሟቸው ፈጣን መሳሪያዎች' : 'Quick access to your top utilities'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => onNavigate('tools')} style={styles.viewAllBtn}>
          <Text
            style={[
              styles.viewAllText,
              { color: colors.cyan, fontSize: 11.5 * fontScale, fontFamily: fonts.bold },
            ]}
          >
            {t.view_all_tools}
          </Text>
          <ArrowRight size={13} color={colors.cyan} />
        </TouchableOpacity>
      </View>

      {/* 2-Column Most Used Tools Grid (Icon + Name Only) */}
      <View style={styles.twoColumnGrid}>
        {popularTools.map((item) => (
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

      {/* Recent Activity Section */}
      <View style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: 14 * fontScale, fontFamily: fonts.bold },
              ]}
            >
              {t.recent_activity}
            </Text>
            <Text
              style={[
                styles.sectionSub,
                { color: colors.textMuted, fontSize: 11 * fontScale, fontFamily: fonts.regular },
              ]}
            >
              {recentHistory.length} {language === 'am' ? 'የተመዘገቡ ስራዎች' : 'items processed'}
            </Text>
          </View>

          <TouchableOpacity onPress={() => onNavigate('history')} style={styles.viewAllBtn}>
            <Text
              style={[
                styles.viewAllText,
                { color: colors.cyan, fontSize: 11.5 * fontScale, fontFamily: fonts.bold },
              ]}
            >
              {t.history}
            </Text>
            <ArrowRight size={13} color={colors.cyan} />
          </TouchableOpacity>
        </View>

        {displayHistory.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => onNavigate(item.toolId as ScreenId)}
            style={[
              styles.historyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.historyRow}>
              <View style={[styles.historyIconWrap, { backgroundColor: colors.cardSecondary }]}>
                <Clock size={13} color={colors.cyan} />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.historyTitle,
                  { color: colors.text, fontFamily: fonts.bold, fontSize: 13 * fontScale },
                ]}
              >
                {item.title}
              </Text>
              {item.fileType && (
                <View style={[styles.fileTypeBadge, { backgroundColor: colors.cardSecondary }]}>
                  <Text
                    style={[
                      styles.fileTypeText,
                      { color: colors.primaryLight, fontFamily: fonts.bold },
                    ]}
                  >
                    {item.fileType}
                  </Text>
                </View>
              )}
            </View>
            {item.snippet ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.historySnippet,
                  { color: colors.textSecondary, fontFamily: fonts.regular },
                ]}
              >
                {item.snippet}
              </Text>
            ) : null}
          </TouchableOpacity>
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
    padding: 14,
    paddingTop: 6, // Reduced top padding
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.16)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 9.5,
    textTransform: 'uppercase',
  },
  heroVersion: {
    color: '#bae6fd',
    fontSize: 10,
  },
  heroTitle: {
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  heroSub: {
    color: '#e0f2fe',
    fontSize: 11.5,
    lineHeight: 16,
  },
  heroMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 15,
  },
  metricLabel: {
    color: '#bae6fd',
    fontSize: 9.5,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    letterSpacing: 0.2,
  },
  sectionSub: {
    marginTop: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {},
  // 2-Column Grid Layout for Most Used Tools
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  historySection: {
    marginTop: 4,
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.06)',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  historyTitle: {
    flex: 1,
  },
  fileTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  fileTypeText: {
    fontSize: 9.5,
  },
  historySnippet: {
    fontSize: 11,
    lineHeight: 15,
    marginLeft: 32,
  },
});
