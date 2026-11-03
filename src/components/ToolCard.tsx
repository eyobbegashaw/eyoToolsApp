import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export interface ToolCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  color?: string;
  isOffline?: boolean;
  badge?: string;
  mode?: 'grid' | 'list';
  onPress: () => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon: IconComponent,
  color = '#0284c7',
  badge,
  mode = 'grid',
  onPress,
}) => {
  const { colors, fonts, fontScale } = useTheme();

  if (mode === 'grid') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={[
          styles.gridCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View
          style={[
            styles.gridIconWrap,
            {
              backgroundColor: `${color}18`,
              borderColor: `${color}35`,
            },
          ]}
        >
          <IconComponent size={22} color={color} />
        </View>

        <Text
          numberOfLines={2}
          style={[
            styles.gridTitle,
            {
              color: colors.text,
              fontSize: 12.5 * fontScale,
              fontFamily: fonts.bold,
            },
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  // Fallback / standard list mode
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.listCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: color }]}>
          <IconComponent size={20} color="#ffffff" />
        </View>

        {badge && (
          <View style={[styles.badge, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.badgeText, { color: colors.cyan, fontFamily: fonts.medium }]}>
              {badge}
            </Text>
          </View>
        )}
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: 14 * fontScale,
            fontFamily: fonts.bold,
          },
        ]}
      >
        {title}
      </Text>

      {description ? (
        <Text
          numberOfLines={2}
          style={[
            styles.description,
            {
              color: colors.textSecondary,
              fontSize: 11 * fontScale,
              fontFamily: fonts.regular,
            },
          ]}
        >
          {description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 2-Column Grid Tile Style (Icon + Name Only)
  gridCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 104,
    elevation: 2,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridTitle: {
    textAlign: 'center',
    lineHeight: 17,
  },

  // List Style
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
  },
  title: {
    marginBottom: 3,
  },
  description: {
    lineHeight: 16,
  },
});
