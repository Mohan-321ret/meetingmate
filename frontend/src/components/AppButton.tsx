import React from 'react';
import {
  Text,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Spacing, Radius, Typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const { colors, fontScaleMultiplier } = useApp();

  const getContainerStyles = (pressed: boolean): ViewStyle => {
    const sizeStyle: ViewStyle =
      size === 'sm'
        ? {
            paddingVertical: Spacing.xs + 2,
            paddingHorizontal: Spacing.md,
            minHeight: 36,
          }
        : size === 'lg'
        ? {
            paddingVertical: Spacing.md + 2,
            paddingHorizontal: Spacing.xxl,
            minHeight: 52,
          }
        : {
            paddingVertical: Spacing.sm + 2,
            paddingHorizontal: Spacing.lg,
            minHeight: 44,
          };

    let variantStyle: ViewStyle;
    switch (variant) {
      case 'secondary':
        variantStyle = {
          backgroundColor: pressed ? colors.surfacePressed : colors.surfaceSubtle,
        };
        break;
      case 'outline':
        variantStyle = {
          backgroundColor: pressed ? colors.surfaceSubtle : 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
        break;
      case 'ghost':
        variantStyle = {
          backgroundColor: pressed ? colors.surfaceSubtle : 'transparent',
        };
        break;
      case 'danger':
        variantStyle = {
          backgroundColor: pressed ? '#B91C1C' : '#DC2626',
        };
        break;
      case 'primary':
      default:
        variantStyle = {
          backgroundColor: pressed ? colors.primaryLight : colors.primary,
        };
        break;
    }

    return {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
      opacity: disabled ? 0.5 : 1,
      ...sizeStyle,
      ...variantStyle,
    };
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.text;
      case 'outline':
      case 'ghost':
        return colors.primary;
      case 'danger':
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  const fontSize =
    (size === 'sm' ? 13 : size === 'lg' ? 16 : 14) * fontScaleMultiplier;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  const textColor = getTextColor();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      android_ripple={
        Platform.OS === 'android'
          ? {
              color: variant === 'primary' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
              borderless: false,
            }
          : undefined
      }
      style={({ pressed }) => [getContainerStyles(pressed), style]}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={textColor}
              style={{ marginRight: Spacing.sm }}
            />
          )}
          <Text
            style={[
              Typography.bodyBold,
              {
                color: textColor,
                fontSize,
                lineHeight: fontSize * 1.4,
              },
              textStyle,
            ]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={textColor}
              style={{ marginLeft: Spacing.sm }}
            />
          )}
        </>
      )}
    </Pressable>
  );
};
