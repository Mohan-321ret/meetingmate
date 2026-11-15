import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { SavedAnswer } from '@/types';
import { useApp } from '@/context/AppContext';
import { AppCard } from '@/components/AppCard';
import { AppBadge } from '@/components/AppBadge';
import { Spacing, Typography, Radius } from '@/constants/theme';

interface AnswerCardProps {
  answer: SavedAnswer;
  onEdit: (answer: SavedAnswer) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onViewDetail?: (answer: SavedAnswer) => void;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({
  answer,
  onEdit,
  onDelete,
  onToggleFavorite,
  onViewDetail,
}) => {
  const { colors, fontScaleMultiplier } = useApp();

  const handleConfirmDelete = () => {
    Alert.alert(
      'பதிலை நீக்கவா?',
      'இந்த சேமிக்கப்பட்ட பதிலை நிச்சயமாக நீக்க விரும்புகிறீர்களா?',
      [
        { text: 'ரத்து செய்', style: 'cancel' },
        {
          text: 'நீக்கு',
          style: 'destructive',
          onPress: () => onDelete(answer.id),
        },
      ]
    );
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(answer.answerText);
      Alert.alert(
        'நகலெடுக்கப்பட்டது ✓',
        'பதில் குறிப்பு கிளிப்போர்டில் வெற்றிகரமாக நகலெடுக்கப்பட்டது.'
      );
    } catch {
      Alert.alert('பிழை', 'நகலெடுக்க முடியவில்லை.');
    }
  };

  return (
    <AppCard
      style={styles.card}
      padding="md"
      onPress={onViewDetail ? () => onViewDetail(answer) : undefined}>
      {/* Top Meta Bar */}
      <View style={styles.headerRow}>
        <View style={styles.tagWrap}>
          <AppBadge
            label={answer.sectionLabel}
            type={
              answer.sectionLabel.includes('காவற்கோபுரம்')
                ? 'watchtower'
                : answer.sectionLabel.includes('புதையல்கள்')
                ? 'treasures'
                : answer.sectionLabel.includes('ஊழியம்')
                ? 'ministry'
                : answer.sectionLabel.includes('பொதுப் பேச்சு')
                ? 'publicTalk'
                : 'living'
            }
            size="sm"
          />
          <View style={[styles.refBadge, { backgroundColor: colors.surfaceSubtle }]}>
            <Text
              style={[
                styles.refText,
                { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
              ]}>
              {answer.itemReference}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => onToggleFavorite(answer.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.favoriteButton}>
          <Ionicons
            name={answer.isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={answer.isFavorite ? '#EAB308' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Question */}
      {answer.question ? (
        <View style={styles.questionBlock}>
          <Text
            style={[
              Typography.caption,
              styles.questionLabel,
              { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
            ]}>
            கேள்வி:
          </Text>
          <Text
            style={[
              Typography.bodyBold,
              styles.questionText,
              {
                color: colors.text,
                fontSize: 14 * fontScaleMultiplier,
                lineHeight: 21 * fontScaleMultiplier,
              },
            ]}>
            {answer.question}
          </Text>
        </View>
      ) : null}

      {/* Answer Body */}
      <View style={[styles.answerBlock, { backgroundColor: colors.surfaceSubtle }]}>
        <Text
          style={[
            Typography.caption,
            styles.answerLabel,
            { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
          ]}>
          தயாரிக்கப்பட்ட பதில்:
        </Text>
        <Text
          style={[
            Typography.body,
            styles.answerText,
            {
              color: colors.text,
              fontSize: 15 * fontScaleMultiplier,
              lineHeight: 23 * fontScaleMultiplier,
            },
          ]}>
          {answer.answerText}
        </Text>
      </View>

      {/* Scripture Reference */}
      {answer.scripture ? (
        <View style={styles.scriptureRow}>
          <Ionicons name="book-outline" size={13} color={colors.primary} />
          <Text
            style={[
              styles.scriptureText,
              { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
            ]}>
            {answer.scripture}
          </Text>
        </View>
      ) : null}

      {/* Footer Info & Actions */}
      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <Text
          style={[
            styles.dateText,
            { color: colors.textMuted, fontSize: 11 * fontScaleMultiplier },
          ]}>
          {answer.updatedAt}
        </Text>

        <View style={styles.actionButtons}>
          {onViewDetail && (
            <TouchableOpacity
              onPress={() => onViewDetail(answer)}
              style={[styles.actionIconBtn, { backgroundColor: colors.primarySurface }]}
              accessibilityLabel="முழு பதில் விவரம்">
              <Ionicons name="chatbubbles-outline" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleCopy}
            style={[styles.actionIconBtn, { backgroundColor: colors.surfaceSubtle }]}
            accessibilityLabel="நகலெடு">
            <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onEdit(answer)}
            style={[styles.actionIconBtn, { backgroundColor: colors.surfaceSubtle }]}
            accessibilityLabel="திருத்து">
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirmDelete}
            style={[styles.actionIconBtn, { backgroundColor: colors.surfaceSubtle }]}
            accessibilityLabel="நீக்கு">
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    flex: 1,
  },
  refBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  refText: {
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 4,
  },
  questionBlock: {
    marginBottom: Spacing.sm,
  },
  questionLabel: {
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  questionText: {
    fontWeight: '600',
  },
  answerBlock: {
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  answerLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  answerText: {
    fontWeight: '400',
  },
  scriptureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  scriptureText: {
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dateText: {
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
