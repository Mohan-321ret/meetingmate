import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '@/context/AppContext';
import { Spacing, Typography, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  duration?: string;
  accentColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  actionLabel?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  duration,
  accentColor,
  icon,
  onPress,
  actionLabel,
}) => {
  const { colors, fontScaleMultiplier } = useApp();
  const barColor = accentColor || colors.primary;

  const content = (
    <View style={styles.topRow}>
      <View style={styles.titleWrap}>
        <View style={[styles.accentBar, { backgroundColor: barColor }]} />
        {icon && (
          <Ionicons
            name={icon}
            size={18 * fontScaleMultiplier}
            color={barColor}
            style={{ marginRight: Spacing.xs + 2 }}
          />
        )}
        <Text
          style={[
            Typography.h3,
            {
              color: colors.text,
              fontSize: Typography.h3.fontSize * fontScaleMultiplier,
              lineHeight: Typography.h3.lineHeight * fontScaleMultiplier,
            },
          ]}>
          {title}
        </Text>
      </View>

      <View style={styles.rightCluster}>
        {duration && (
          <View style={[styles.durationBadge, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text
              style={[
                styles.durationText,
                {
                  color: colors.textSecondary,
                  fontSize: 11 * fontScaleMultiplier,
                },
              ]}>
              {duration}
            </Text>
          </View>
        )}

        {onPress && (
          <View style={styles.actionArrowWrap}>
            {actionLabel && (
              <Text
                style={[
                  styles.actionLabelText,
                  { color: barColor, fontSize: 11 * fontScaleMultiplier },
                ]}>
                {actionLabel}
              </Text>
            )}
            <Ionicons name="chevron-forward" size={16} color={barColor} />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityLabel={`${title} பகுதி விவரம்`}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}

      {subtitle && (
        <Text
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
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 4,
  },
  durationText: {
    fontWeight: '600',
  },
  actionArrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionLabelText: {
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 4,
    marginLeft: Spacing.md,
  },
});
