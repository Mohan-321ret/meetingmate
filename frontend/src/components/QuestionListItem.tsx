import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrowseQuestion } from '@/types/meetingBrowse';
import { useApp } from '@/context/AppContext';
import { AppCard } from '@/components/AppCard';
import { Spacing, Typography, Radius } from '@/constants/theme';

interface QuestionListItemProps {
  question: BrowseQuestion;
  onPress: () => void;
  onPrepareAnswer?: () => void;
}

export const QuestionListItem: React.FC<QuestionListItemProps> = ({
  question,
  onPress,
  onPrepareAnswer,
}) => {
  const { colors, fontScaleMultiplier } = useApp();

  return (
    <AppCard style={styles.card} padding="md" onPress={onPress}>
      {/* Top Meta Row */}
      <View style={styles.topRow}>
        <View style={styles.metaLeft}>
          <View style={[styles.numberPill, { backgroundColor: colors.primarySurface }]}>
            <Text
              style={[
                styles.numberPillText,
                { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
              ]}>
              {question.questionNumberLabel}
            </Text>
          </View>
          {question.subheading && (
            <Text
              numberOfLines={1}
              style={[
                Typography.caption,
                styles.subheading,
                { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
              ]}>
              {question.subheading}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>

      {/* Question Text */}
      <Text
        style={[
          Typography.bodyBold,
          styles.questionText,
          {
            color: colors.text,
            fontSize: 14 * fontScaleMultiplier,
            lineHeight: 22 * fontScaleMultiplier,
          },
        ]}>
        {question.questionText}
      </Text>

      {/* Scriptures and Source Row */}
      <View style={styles.bottomRow}>
        <View style={styles.scripturesRow}>
          {question.scriptures.map((scrip, idx) => (
            <View
              key={idx}
              style={[styles.scripPill, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="book-outline" size={12} color={colors.primary} />
              <Text
                style={[
                  styles.scripText,
                  { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                {scrip.citation}
              </Text>
            </View>
          ))}
        </View>

        {onPrepareAnswer && (
          <TouchableOpacity
            onPress={e => {
              e.stopPropagation();
              onPrepareAnswer();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.answerPrepBtn, { backgroundColor: colors.primarySurface }]}>
            <Ionicons name="create-outline" size={13} color={colors.primary} />
            <Text
              style={[
                styles.answerPrepText,
                { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
              ]}>
              பதில் எழுத
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
    marginBottom: Spacing.xs + 2,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
    gap: Spacing.xs + 2,
  },
  numberPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  numberPillText: {
    fontWeight: '700',
  },
  subheading: {
    fontWeight: '500',
  },
  questionText: {
    marginBottom: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  scripturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    flex: 1,
  },
  scripPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    gap: 3,
  },
  scripText: {
    fontWeight: '600',
  },
  answerPrepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  answerPrepText: {
    fontWeight: '600',
  },
});

