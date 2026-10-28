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
  } = useTheme();

  const [storageUsage, setStorageUsage] = useState<string>('0 KB');

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
      {/* 1. Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeading, { color: colors.cyan }]}>
          Appearance & Display
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Theme Mode */}
          <Text style={[styles.label, { color: colors.text }]}>Color Theme</Text>
          <View style={styles.segmentRow}>
            {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => {
              const active = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.cardSecondary,
                    },
                  ]}
                >
                  {mode === 'dark' ? (
                    <Moon size={14} color={active ? '#fff' : colors.textMuted} />
                  ) : mode === 'light' ? (
                    <Sun size={14} color={active ? '#fff' : colors.textMuted} />
                  ) : (
                    <Smartphone size={14} color={active ? '#fff' : colors.textMuted} />
                  )}
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#fff' : colors.textSecondary },
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
          <Text style={[styles.label, { color: colors.text }]}>{t.language}</Text>
          <View style={styles.segmentRow}>
            {(['en', 'am'] as Language[]).map((lang) => {
              const active = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.cardSecondary,
                    },
                  ]}
                >
                  <Globe size={14} color={active ? '#fff' : colors.textMuted} />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {lang === 'en' ? 'English' : 'አማርኛ (Amharic)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Font Size */}
          <View style={styles.divider} />
          <Text style={[styles.label, { color: colors.text }]}>{t.font_size}</Text>
          <View style={styles.segmentRow}>
            {(['small', 'normal', 'large'] as FontSize[]).map((size) => {
              const active = fontSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  onPress={() => setFontSize(size)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.cardSecondary,
                    },
                  ]}
                >
                  <Type size={14} color={active ? '#fff' : colors.textMuted} />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#fff' : colors.textSecondary },
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
        <Text style={[styles.sectionHeading, { color: colors.cyan }]}>
          Storage & Privacy
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.infoRow}>
            <View>
              <Text style={[styles.infoLabel, { color: colors.text }]}>
                {t.storage_usage}
              </Text>
              <Text style={[styles.infoSub, { color: colors.textMuted }]}>
                All document tools operate offline
              </Text>
            </View>
            <Text style={[styles.infoBadge, { color: colors.cyan }]}>
              {storageUsage}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClearCache}
            style={[styles.outlineBtn, { borderColor: colors.cardBorder }]}
          >
            <Trash2 size={14} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.outlineBtnText}>{t.clear_cache}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Developer & Project Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeading, { color: colors.cyan }]}>
          {t.about}
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.devHeader}>
            <View style={[styles.devAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.devAvatarText}>EB</Text>
            </View>
            <View>
              <Text style={[styles.devName, { color: colors.text }]}>
                {t.about_dev_name}
              </Text>
              <Text style={[styles.devRole, { color: colors.cyan }]}>
                {t.about_dev_role}
              </Text>
              <Text style={[styles.devCountry, { color: colors.textMuted }]}>
                {t.about_dev_ethiopia}
              </Text>
            </View>
          </View>

          <Text style={[styles.devBio, { color: colors.textSecondary }]}>
            {t.about_dev_bio}
          </Text>

          {/* Social / Portfolio Links */}
          <TouchableOpacity
            onPress={() => openUrl('https://github.com/eyobbegashaw')}
            style={[styles.linkRow, { borderColor: colors.cardBorder }]}
          >
            <Code size={15} color={colors.text} />
            <Text style={[styles.linkText, { color: colors.text }]}>GitHub Profile</Text>
            <ExternalLink size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onReplaySplash}
            style={[styles.splashReplayBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <Sparkles size={14} color={colors.amber} style={{ marginRight: 6 }} />
            <Text style={[styles.splashReplayText, { color: colors.text }]}>
              Show Startup Splash Screen
            </Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            {t.version} • {t.version_code}
          </Text>
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
    padding: 16,
    paddingBottom: 28,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
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
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 4,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoSub: {
    fontSize: 11,
    marginTop: 1,
  },
  infoBadge: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  outlineBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  devAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devAvatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  devName: {
    fontSize: 15,
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
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  splashReplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 10,
  },
  splashReplayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
  },
});
