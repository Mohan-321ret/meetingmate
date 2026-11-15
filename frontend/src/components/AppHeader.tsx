import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Spacing, Typography, Radius } from '@/constants/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  secondaryAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  tag?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  rightAction,
  secondaryAction,
  tag,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, fontScaleMultiplier } = useApp();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12),
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}>
      <View style={styles.contentRow}>
        <View style={styles.titleColumn}>
          {tag && (
            <View style={[styles.tagBadge, { backgroundColor: colors.primarySurface }]}>
              <Text
                style={[
                  styles.tagText,
                  { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                {tag}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={[
              Typography.h2,
              {
                color: colors.text,
                fontSize: Typography.h2.fontSize * fontScaleMultiplier,
                lineHeight: Typography.h2.lineHeight * fontScaleMultiplier,
              },
            ]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              numberOfLines={1}
              style={[
                Typography.caption,
                styles.subtitle,
                {
                  color: colors.textSecondary,
                  fontSize: Typography.caption.fontSize * fontScaleMultiplier,
                },
              ]}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.actionsRow}>
          {secondaryAction && (
            <TouchableOpacity
              onPress={secondaryAction.onPress}
              accessibilityLabel={secondaryAction.accessibilityLabel}
              style={[styles.iconButton, { backgroundColor: colors.surfaceSubtle }]}
              activeOpacity={0.7}>
              <Ionicons name={secondaryAction.icon} size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          {rightAction && (
            <TouchableOpacity
              onPress={rightAction.onPress}
              accessibilityLabel={rightAction.accessibilityLabel}
              style={[styles.iconButton, { backgroundColor: colors.surfaceSubtle }]}
              activeOpacity={0.7}>
              <Ionicons name={rightAction.icon} size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  titleColumn: {
    flex: 1,
    marginRight: Spacing.md,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginBottom: 4,
  },
  tagText: {
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
