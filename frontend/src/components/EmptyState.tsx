import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Spacing, Typography, Radius } from '@/constants/theme';
import { AppButton } from '@/components/AppButton';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  buttonTitle?: string;
  onButtonPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'document-text-outline',
  title,
  description,
  buttonTitle,
  onButtonPress,
}) => {
  const { colors, fontScaleMultiplier } = useApp();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSubtle }]}>
        <Ionicons name={icon} size={42} color={colors.primary} />
      </View>

      <Text
        style={[
          Typography.h3,
          styles.title,
          {
            color: colors.text,
            fontSize: Typography.h3.fontSize * fontScaleMultiplier,
            lineHeight: Typography.h3.lineHeight * fontScaleMultiplier,
          },
        ]}>
        {title}
      </Text>

      <Text
        style={[
          Typography.body,
          styles.description,
          {
            color: colors.textSecondary,
            fontSize: 14 * fontScaleMultiplier,
            lineHeight: 22 * fontScaleMultiplier,
          },
        ]}>
        {description}
      </Text>

      {buttonTitle && onButtonPress && (
        <AppButton
          title={buttonTitle}
          onPress={onButtonPress}
          variant="primary"
          icon="add-outline"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.huge,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs + 2,
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    marginTop: Spacing.xs,
  },
});

