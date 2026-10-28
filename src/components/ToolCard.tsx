import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: string;
  isOffline?: boolean;
  badge?: string;
  onPress: () => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon: IconComponent,
  color = '#0284c7',
  isOffline = true,
  badge,
  onPress,
}) => {
  const { colors, fontScale } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
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
            <Text style={[styles.badgeText, { color: colors.cyan }]}>{badge}</Text>
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
          },
        ]}
      >
        {title}
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.description,
          {
            color: colors.textSecondary,
            fontSize: 11 * fontScale,
          },
        ]}
      >
        {description}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    // Native shadow
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    fontWeight: '700',
  },
  title: {
    fontWeight: '700',
    marginBottom: 3,
  },
  description: {
    lineHeight: 16,
  },
});
