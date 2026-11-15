import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export type BadgeType =
  | 'treasures'
  | 'ministry'
  | 'living'
  | 'watchtower'
  | 'publicTalk'
  | 'song'
  | 'prayer'
  | 'bible'
  | 'default';

interface AppBadgeProps {
  label: string;
  type?: BadgeType;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  type = 'default',
  size = 'md',
  style,
  textStyle,
}) => {
  const { isDark, fontScaleMultiplier } = useApp();

  const getColors = (): { bg: string; text: string; border: string } => {
    switch (type) {
      case 'treasures':
        return {
          bg: isDark ? 'rgba(71, 85, 105, 0.35)' : Palette.treasuresLight,
          text: isDark ? Palette.treasuresDark : Palette.treasures,
          border: isDark ? 'rgba(71, 85, 105, 0.6)' : '#CBD5E1',
        };
      case 'ministry':
        return {
          bg: isDark ? 'rgba(217, 119, 6, 0.25)' : Palette.ministryLight,
          text: isDark ? Palette.ministryDark : Palette.ministry,
          border: isDark ? 'rgba(217, 119, 6, 0.5)' : '#FDE68A',
        };
      case 'living':
        return {
          bg: isDark ? 'rgba(185, 28, 28, 0.25)' : Palette.livingLight,
          text: isDark ? Palette.livingDark : Palette.living,
          border: isDark ? 'rgba(185, 28, 28, 0.5)' : '#FECACA',
        };
      case 'watchtower':
        return {
          bg: isDark ? 'rgba(29, 78, 216, 0.25)' : Palette.watchtowerLight,
          text: isDark ? Palette.watchtowerDark : Palette.watchtower,
          border: isDark ? 'rgba(29, 78, 216, 0.5)' : '#BFDBFE',
        };
      case 'publicTalk':
        return {
          bg: isDark ? 'rgba(15, 118, 110, 0.25)' : Palette.publicTalkLight,
          text: isDark ? Palette.publicTalkDark : Palette.publicTalk,
          border: isDark ? 'rgba(15, 118, 110, 0.5)' : '#99F6E4',
        };
      case 'song':
        return {
          bg: isDark ? 'rgba(99, 102, 241, 0.25)' : '#EEF2FF',
          text: isDark ? '#A5B4FC' : '#4338CA',
          border: isDark ? 'rgba(99, 102, 241, 0.5)' : '#C7D2FE',
        };
      case 'prayer':
        return {
          bg: isDark ? 'rgba(147, 51, 234, 0.25)' : '#FAF5FF',
          text: isDark ? '#D8B4FE' : '#7E22CE',
          border: isDark ? 'rgba(147, 51, 234, 0.5)' : '#E9D5FF',
        };
      case 'bible':
        return {
          bg: isDark ? 'rgba(14, 165, 233, 0.25)' : '#F0F9FF',
          text: isDark ? '#7DD3FC' : '#0369A1',
          border: isDark ? 'rgba(14, 165, 233, 0.5)' : '#BAE6FD',
        };
      case 'default':
      default:
        return {
          bg: isDark ? '#1E293B' : '#F1F5F9',
          text: isDark ? '#CBD5E1' : '#475569',
          border: isDark ? '#334155' : '#E2E8F0',
        };
    }
  };

  const colors = getColors();
  const fontSize = (size === 'sm' ? 11 : 12) * fontScaleMultiplier;
  const paddingV = size === 'sm' ? 2 : 4;
  const paddingH = size === 'sm' ? Spacing.sm : Spacing.md;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        style,
      ]}>
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize,
            lineHeight: fontSize * 1.35,
          },
          textStyle,
        ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});

