import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ScriptureRef } from '@/types/meetingBrowse';
import { useApp } from '@/context/AppContext';
import { AppCard } from '@/components/AppCard';
import { Spacing, Typography, Radius } from '@/constants/theme';

interface ScriptureCardProps {
  scripture: ScriptureRef;
}

export const ScriptureCard: React.FC<ScriptureCardProps> = ({ scripture }) => {
  const { colors, fontScaleMultiplier } = useApp();

  const handleCopy = async () => {
    try {
      const copyPayload = `"${scripture.verseText}" — ${scripture.citation}`;
      await Clipboard.setStringAsync(copyPayload);
      Alert.alert(
        'வசனம் நகலெடுக்கப்பட்டது ✓',
        `${scripture.citation}\n\nவேத வசனம் கிளிப்போர்டில் நகலெடுக்கப்பட்டது.`
      );
    } catch {
      Alert.alert('பிழை', 'வசனத்தை நகலெடுக்க முடியவில்லை.');
    }
  };

  return (
    <AppCard style={styles.card} padding="md">
      <View style={styles.topRow}>
        <View style={styles.citationWrap}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySurface }]}>
            <Ionicons name="book" size={14} color={colors.primary} />
          </View>
          <Text
            style={[
              Typography.bodyBold,
              styles.citationText,
              { color: colors.primary, fontSize: 14 * fontScaleMultiplier },
            ]}>
            {scripture.citation}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCopy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.copyBtn, { backgroundColor: colors.surfaceSubtle }]}>
          <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text
        style={[
          Typography.body,
          styles.verseText,
          {
            color: colors.text,
            fontSize: 14 * fontScaleMultiplier,
            lineHeight: 23 * fontScaleMultiplier,
          },
        ]}>
        &ldquo;{scripture.verseText}&rdquo;
      </Text>

      {scripture.contextNote && (
        <View style={[styles.contextBox, { backgroundColor: colors.surfaceSubtle }]}>
          <Text
            style={[
              Typography.caption,
              styles.contextText,
              { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
            ]}>
            குறிப்பு: {scripture.contextNote}
          </Text>
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  citationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  citationText: {
    fontWeight: '700',
  },
  copyBtn: {
    padding: 6,
    borderRadius: Radius.full,
  },
  verseText: {
    fontStyle: 'italic',
    marginBottom: Spacing.xs + 2,
  },
  contextBox: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  contextText: {
    lineHeight: 18,
  },
});

