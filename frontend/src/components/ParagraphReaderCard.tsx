import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '@/context/AppContext';
import { AppCard } from '@/components/AppCard';
import { Spacing, Typography, Radius } from '@/constants/theme';

interface ParagraphReaderCardProps {
  title?: string;
  sourceReference?: string;
  paragraphText: string;
}

export const ParagraphReaderCard: React.FC<ParagraphReaderCardProps> = ({
  title = 'பாரா வாசிப்பு பகுதி',
  sourceReference,
  paragraphText,
}) => {
  const { colors, fontScaleMultiplier } = useApp();

  const handleCopy = async () => {
    try {
      const copyPayload = sourceReference
        ? `${paragraphText}\n\n[ஆதாரம்: ${sourceReference}]`
        : paragraphText;
      await Clipboard.setStringAsync(copyPayload);
      Alert.alert('நகலெடுக்கப்பட்டது ✓', 'பாரா உள்ளடக்கம் கிளிப்போர்டில் நகலெடுக்கப்பட்டது.');
    } catch {
      Alert.alert('பிழை', 'பாரா உள்ளடக்கத்தை நகலெடுக்க முடியவில்லை.');
    }
  };

  return (
    <AppCard style={styles.card} padding="md">
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
          <Text
            style={[
              Typography.caption,
              styles.headerTitle,
              { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
            ]}>
            {title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCopy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.copyBtn, { backgroundColor: colors.surfaceSubtle }]}>
          <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.textContainer, { borderLeftColor: colors.primary }]}>
        <Text
          style={[
            Typography.body,
            styles.paragraphText,
            {
              color: colors.text,
              fontSize: 15 * fontScaleMultiplier,
              lineHeight: 24 * fontScaleMultiplier,
            },
          ]}>
          {paragraphText}
        </Text>
      </View>

      {sourceReference && (
        <View style={styles.sourceRow}>
          <Text
            style={[
              styles.sourceText,
              { color: colors.textMuted, fontSize: 11 * fontScaleMultiplier },
            ]}>
            ஆதாரம்: {sourceReference}
          </Text>
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  copyBtn: {
    padding: 6,
    borderRadius: Radius.full,
  },
  textContainer: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  paragraphText: {
    fontWeight: '400',
  },
  sourceRow: {
    marginTop: Spacing.xs + 2,
    paddingTop: Spacing.xs,
  },
  sourceText: {
    fontStyle: 'italic',
  },
});

