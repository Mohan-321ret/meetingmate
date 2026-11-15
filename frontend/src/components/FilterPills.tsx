import React from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  View,
  Platform,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { Spacing, Radius, Typography } from '@/constants/theme';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  options,
  selectedId,
  onSelect,
}) => {
  const { colors, fontScaleMultiplier } = useApp();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}>
      {options.map(item => {
        const isSelected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            android_ripple={
              Platform.OS === 'android'
                ? { color: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)' }
                : undefined
            }
            style={[
              styles.pill,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}>
            <Text
              style={[
                Typography.caption,
                {
                  color: isSelected ? '#FFFFFF' : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: Typography.caption.fontSize * fontScaleMultiplier,
                },
              ]}>
              {item.label}
            </Text>
            {typeof item.count === 'number' && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(255,255,255,0.25)'
                      : colors.surfaceSubtle,
                  },
                ]}>
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textMuted,
                      fontSize: 11 * fontScaleMultiplier,
                    },
                  ]}>
                  {item.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  countBadge: {
    marginLeft: Spacing.xs + 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  countText: {
    fontWeight: '700',
  },
});

