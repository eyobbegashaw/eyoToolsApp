import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Home, LayoutGrid, Clock, Settings } from 'lucide-react-native';
import { ScreenId } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface BottomNavigationProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  historyCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
  historyCount = 0,
}) => {
  const { colors, t, fontScale } = useTheme();

  const tabs: { id: ScreenId; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'tools', label: t.tools, icon: LayoutGrid },
    { id: 'history', label: t.history, icon: Clock },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.navBg,
          borderTopColor: colors.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.id;
        const IconComponent = tab.icon;
        const iconColor = isActive ? colors.cyan : colors.textMuted;

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onNavigate(tab.id)}
            activeOpacity={0.7}
            style={styles.tabItem}
          >
            <View style={styles.iconContainer}>
              <IconComponent size={20} color={iconColor} />
              {tab.id === 'history' && historyCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.cyan }]}>
                  <Text style={styles.badgeText}>
                    {historyCount > 99 ? '99+' : historyCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.cyan : colors.textMuted,
                  fontWeight: isActive ? '700' : '500',
                  fontSize: 10 * fontScale,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'ios' ? 70 : 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 14 : 4,
    paddingTop: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
});
