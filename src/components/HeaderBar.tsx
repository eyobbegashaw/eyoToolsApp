import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { ArrowLeft, Moon, Sun, Globe } from 'lucide-react-native';
import { ScreenId } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface HeaderBarProps {
  currentScreen: ScreenId;
  onBack: () => void;
  title?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ currentScreen, onBack, title }) => {
  const { colors, isDark, language, setThemeMode, setLanguage, fontScale } = useTheme();

  const isMainTab = ['home', 'tools', 'history', 'settings'].includes(currentScreen);

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'am' : 'en');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.leftRow}>
        {!isMainTab ? (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            style={[styles.iconBtn, { backgroundColor: colors.cardSecondary }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={18} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoBadgeText}>CS</Text>
          </View>
        )}

        <View style={styles.titleWrap}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: 16 * fontScale,
              },
            ]}
          >
            {title || (language === 'am' ? 'ኢዮ መሳሪያዎች' : 'eyoTools')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {language === 'am' ? 'ለተማሪዎች' : 'For Student Edition'}
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Language Switcher */}
        <TouchableOpacity
          onPress={toggleLanguage}
          activeOpacity={0.7}
          style={[styles.actionBtn, { backgroundColor: colors.cardSecondary }]}
        >
          <Globe size={13} color={colors.primaryLight} style={{ marginRight: 4 }} />
          <Text style={[styles.langText, { color: colors.text }]}>
            {language === 'en' ? 'አማርኛ' : 'EN'}
          </Text>
        </TouchableOpacity>

        {/* Theme Switcher */}
        <TouchableOpacity
          onPress={toggleTheme}
          activeOpacity={0.7}
          style={[styles.iconBtn, { backgroundColor: colors.cardSecondary }]}
        >
          {isDark ? (
            <Sun size={16} color={colors.amber} />
          ) : (
            <Moon size={16} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 10,
    marginTop: -1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
