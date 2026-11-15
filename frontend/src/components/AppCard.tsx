import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
  Platform,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { Spacing, Radius, Shadows } from '@/constants/theme';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'flat';
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  activeOpacity?: number;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  variant = 'outlined',
  onPress,
  padding = 'md',
}) => {
  const { colors, isDark } = useApp();

  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'sm':
        return { padding: Spacing.sm };
      case 'lg':
        return { padding: Spacing.lg };
      case 'md':
      default:
        return { padding: Spacing.md };
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          borderWidth: isDark ? 1 : 0.5,
          borderColor: colors.border,
          ...Shadows.md,
        };
      case 'flat':
        return {
          backgroundColor: colors.surfaceSubtle,
          borderWidth: 0,
        };
      case 'outlined':
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...Shadows.sm,
        };
    }
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={
          Platform.OS === 'android'
            ? { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
            : undefined
        }
        style={({ pressed }) => [
          styles.card,
          getVariantStyle(),
          getPaddingStyle(),
          pressed && { opacity: 0.94 },
          style,
        ]}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, getVariantStyle(), getPaddingStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
});

