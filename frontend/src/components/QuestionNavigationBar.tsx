import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { Spacing, Radius } from '@/constants/theme';

interface QuestionNavigationBarProps {
  currentIndex: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export const QuestionNavigationBar: React.FC<QuestionNavigationBarProps> = ({
  currentIndex,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, fontScaleMultiplier } = useApp();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}>
      {/* Previous Button */}
      <TouchableOpacity
        onPress={onPrevious}
        disabled={!hasPrevious}
        activeOpacity={0.7}
        accessibilityLabel="முந்தைய கேள்வி"
        style={[
          styles.navButton,
          {
            backgroundColor: hasPrevious ? colors.surfaceSubtle : 'transparent',
            opacity: hasPrevious ? 1 : 0.35,
          },
        ]}>
        <Ionicons
          name="chevron-back"
          size={18}
          color={hasPrevious ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.navButtonText,
            {
              color: hasPrevious ? colors.primary : colors.textMuted,
              fontSize: 13 * fontScaleMultiplier,
            },
          ]}>
          முந்தையது
        </Text>
      </TouchableOpacity>

      {/* Index Counter */}
      <View style={[styles.counterPill, { backgroundColor: colors.primarySurface }]}>
        <Text
          style={[
            styles.counterText,
            { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
          ]}>
          கேள்வி {currentIndex} / {total}
        </Text>
      </View>

      {/* Next Button */}
      <TouchableOpacity
        onPress={onNext}
        disabled={!hasNext}
        activeOpacity={0.7}
        accessibilityLabel="அடுத்த கேள்வி"
        style={[
          styles.navButton,
          {
            backgroundColor: hasNext ? colors.primary : 'transparent',
            opacity: hasNext ? 1 : 0.35,
          },
        ]}>
        <Text
          style={[
            styles.navButtonText,
            {
              color: hasNext ? '#FFFFFF' : colors.textMuted,
              fontSize: 13 * fontScaleMultiplier,
            },
          ]}>
          அடுத்தது
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={hasNext ? '#FFFFFF' : colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    gap: 4,
    minHeight: 40,
  },
  navButtonText: {
    fontWeight: '700',
  },
  counterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  counterText: {
    fontWeight: '700',
  },
});

