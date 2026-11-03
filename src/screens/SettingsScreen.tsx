import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import {
  Moon,
  Sun,
  Smartphone,
  Globe,
  Type,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Code,
  Sparkles,
  Info,
  Check,
  Palette,
  ChevronRight,
} from 'lucide-react-native';
import { ThemeMode, Language, FontSize } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { StorageService } from '../services/storageService';

interface SettingsScreenProps {
  onReplaySplash: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onReplaySplash }) => {
  const {
    colors,
    t,
    themeMode,
    isDark,
    language,
    fontSize,
    setThemeMode,
    setLanguage,
    setFontSize,
    fontScale,
    fonts,
  } = useTheme();

  const [storageUsage, setStorageUsage] = useState<string>('0 KB');
  const [isAboutExpanded, setIsAboutExpanded] = useState<boolean>(false);

  useEffect(() => {
    StorageService.getStorageEstimate().then(setStorageUsage);
  }, []);

  const handleClearCache = async () => {
    Alert.alert(t.clear_cache, 'Reset local temporary files and cache?', [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.clear,
        style: 'destructive',
        onPress: async () => {
          await StorageService.clearHistory();
          setStorageUsage('0 KB');
          Alert.alert(t.success, t.cache_cleared);
        },
      },
    ]);
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.warn('Cannot open URL', err)
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Appearance & Display */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Palette size={14} color={colors.cyan} />
          <Text style={[styles.sectionHeading, { color: colors.cyan, fontFamily: fonts.bold }]}>
            Appearance & Typography
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Theme Mode */}
          <Text style={[styles.label, { color: colors.text, fontFamily: fonts.bold }]}>
            Color Theme
          </Text>
          <View style={styles.segmentRow}>
            {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => {
              const active = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  activeOpacity={0.7}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.cardSecondary,
                    },
                  ]}
                >
                  {mode === 'dark' ? (
                    <Moon size={13} color={active ? '#fff' : colors.textMuted} />
                  ) : mode === 'light' ? (
                    <Sun size={13} color={active ? '#fff' : colors.textMuted} />
                  ) : (
                    <Smartphone size={13} color={active ? '#fff' : colors.textMuted} />
                  )}
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: active ? '#fff' : colors.textSecondary,
                        fontFamily: active ? fonts.bold : fonts.medium,
                      },
                    ]}
                  >
                    {mode === 'dark' ? t.dark_mode : mode === 'light' ? t.light_mode : t.system_mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Language Selection */}
          <View style={styles.divider} />
          <Text style={[styles.label, { color: colors.text, fontFamily: fonts.bold }]}>
            {t.language}
          </Text>
          <View style={styles.segmentRow}>
            {(['en', 'am'] as Language[]).map((lang) => {
              const active = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  activeOpacity={0.7}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.cardSecondary,
                    },
                  ]}
                >
                  <Globe size={13} color={active ? '#fff' : colors.textMuted} />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: active ? '#fff' : colors.textSecondary,
                        fontFamily: active ? fonts.bold : fonts.medium,
                      },
                    ]}
                  >
                    {lang === 'en' ? 'English' : 'አማርኛ'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Font Size */}
          <View style={styles.divider} />
          <Text style={[styles.label, { color: colors.text, fontFamily: fonts.bold }]}>
            {t.font_size}
          </Text>
          <View style={styles.segmentRow}>
            {(['small', 'normal', 'large'] as FontSize[]).map((size) => {
              const active = fontSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  onPress={() => setFontSize(size)}
                  activeOpacity={0.7}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.cardSecondary,
                    },
                  ]}
                >
                  <Type size={13} color={active ? '#fff' : colors.textMuted} />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: active ? '#fff' : colors.textSecondary,
                        fontFamily: active ? fonts.bold : fonts.medium,
                      },
                    ]}
                  >
                    {size === 'small' ? t.font_size_small : size === 'normal' ? t.font_size_medium : t.font_size_large}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* 2. Storage & Privacy */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ShieldCheck size={14} color={colors.cyan} />
          <Text style={[styles.sectionHeading, { color: colors.cyan, fontFamily: fonts.bold }]}>
            Storage & Local Engine
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.infoRow}>
            <View>
              <Text style={[styles.infoLabel, { color: colors.text, fontFamily: fonts.bold }]}>
                {t.storage_usage}
              </Text>
              <Text style={[styles.infoSub, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                Offline-first client storage & history
              </Text>
            </View>
            <View style={[styles.storageBadge, { backgroundColor: colors.cardSecondary }]}>
              <Text style={[styles.infoBadge, { color: colors.cyan, fontFamily: fonts.bold }]}>
                {storageUsage}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleClearCache}
            activeOpacity={0.7}
            style={[styles.outlineBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
          >
            <Trash2 size={13} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={[styles.outlineBtnText, { fontFamily: fonts.bold }]}>{t.clear_cache}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Developer & Project Information */}
      <View style={styles.section}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Collapsible Header Row with > button */}
          <TouchableOpacity
            onPress={() => setIsAboutExpanded((prev) => !prev)}
            activeOpacity={0.7}
            style={styles.aboutHeaderBtn}
          >
            <View style={styles.aboutHeaderLeft}>
              <View style={[styles.aboutIconWrap, { backgroundColor: colors.cardSecondary }]}>
                <Info size={16} color={colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aboutTitle, { color: colors.text, fontFamily: fonts.bold }]}>
                  {t.about}
                </Text>
                <Text style={[styles.aboutSub, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                  {t.about_dev_name} • {t.version}
                </Text>
              </View>
            </View>

            <View style={[styles.chevronWrap, { backgroundColor: colors.cardSecondary, transform: [{ rotate: isAboutExpanded ? "90deg" : "0deg" }] }]}>
              <ChevronRight size={18} color={isAboutExpanded ? colors.cyan : colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Details visible when expanded */}
          {isAboutExpanded && (
            <View style={styles.aboutDetails}>
              <View style={styles.divider} />

              <View style={styles.devHeader}>
                <View style={[styles.devAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.devAvatarText, { fontFamily: fonts.bold }]}>EB</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.devName, { color: colors.text, fontFamily: fonts.bold }]}>
                    {t.about_dev_name}
                  </Text>
                  <Text style={[styles.devRole, { color: colors.cyan, fontFamily: fonts.medium }]}>
                    {t.about_dev_role}
                  </Text>
                  <Text style={[styles.devCountry, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                    {t.about_dev_ethiopia}
                  </Text>
                </View>
              </View>

              <Text style={[styles.devBio, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {t.about_dev_bio}
              </Text>

              {/* Social / Portfolio Links */}
              <TouchableOpacity
                onPress={() => openUrl('https://github.com/eyobbegashaw')}
                activeOpacity={0.7}
                style={[styles.linkRow, { borderColor: colors.cardBorder }]}
              >
                <Code size={14} color={colors.text} />
                <Text style={[styles.linkText, { color: colors.text, fontFamily: fonts.medium }]}>
                  GitHub: github.com/eyobbegashaw
                </Text>
                <ExternalLink size={13} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onReplaySplash}
                activeOpacity={0.7}
                style={[styles.splashReplayBtn, { backgroundColor: colors.cardSecondary }]}
              >
                <Sparkles size={13} color={colors.amber} style={{ marginRight: 6 }} />
                <Text style={[styles.splashReplayText, { color: colors.text, fontFamily: fonts.bold }]}>
                  Replay Startup Animation
                </Text>
              </TouchableOpacity>

              <View style={styles.versionContainer}>
                <Text style={[styles.versionText, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                  {t.version}
                </Text>
              </View>
            </View>
          )}
        </View>
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
  section: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    marginLeft: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 4,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoSub: {
    fontSize: 10,
    marginTop: 1,
  },
  storageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  infoBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  aboutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aboutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aboutIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  aboutSub: {
    fontSize: 11,
    marginTop: 1,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  aboutDetails: {
    marginTop: 2,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  devAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devAvatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  devName: {
    fontSize: 14,
    fontWeight: '800',
  },
  devRole: {
    fontSize: 11,
    fontWeight: '600',
  },
  devCountry: {
    fontSize: 10,
  },
  devBio: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  splashReplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  splashReplayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  versionContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.12)',
  },
  versionText: {
    fontSize: 10,
    textAlign: 'center',
  },
});
