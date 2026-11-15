import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeetingItem } from '@/types';
import { useApp } from '@/context/AppContext';
import { AppCard } from '@/components/AppCard';
import { AppBadge, BadgeType } from '@/components/AppBadge';
import { Spacing, Typography, Radius } from '@/constants/theme';

interface MeetingItemCardProps {
  item: MeetingItem;
  onAddAnswer?: (prefill: {
    sectionLabel: string;
    itemReference: string;
    question?: string;
  }) => void;
  onOpenQuestionDetail?: (questionText: string) => void;
  onViewSectionDetail?: () => void;
}

export const MeetingItemCard: React.FC<MeetingItemCardProps> = ({
  item,
  onAddAnswer,
  onOpenQuestionDetail,
  onViewSectionDetail,
}) => {
  const { colors, fontScaleMultiplier } = useApp();
  const [expanded, setExpanded] = useState<boolean>(false);

  const getBadgeType = (): BadgeType => {
    switch (item.section) {
      case 'treasures':
        return 'treasures';
      case 'ministry':
        return 'ministry';
      case 'living':
        return 'living';
      case 'public_talk':
        return 'publicTalk';
      case 'watchtower':
        return 'watchtower';
      default:
        return 'default';
    }
  };

  const getSectionLabelTamil = (): string => {
    switch (item.section) {
      case 'treasures':
        return 'ஆன்மீகப் புதையல்கள்';
      case 'ministry':
        return 'ஊழியம்';
      case 'living':
        return 'கிறிஸ்தவ வாழ்க்கை';
      case 'public_talk':
        return 'பொதுப் பேச்சு';
      case 'watchtower':
        return 'காவற்கோபுரம்';
      default:
        return 'கூட்டம்';
    }
  };

  return (
    <AppCard style={styles.card} padding="md">
      {/* Top Meta Row */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <AppBadge label={getSectionLabelTamil()} type={getBadgeType()} size="sm" />
          {item.duration && (
            <View style={[styles.durationPill, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text
                style={[
                  styles.durationText,
                  { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                {item.duration}
              </Text>
            </View>
          )}
        </View>

        {item.presenter && (
          <View style={styles.presenterRow}>
            <Ionicons name="person-outline" size={12} color={colors.textMuted} />
            <Text
              style={[
                styles.presenterText,
                { color: colors.textMuted, fontSize: 12 * fontScaleMultiplier },
              ]}>
              {item.presenter}
            </Text>
          </View>
        )}
      </View>

      {/* Main Title */}
      <Text
        style={[
          Typography.bodyBold,
          styles.title,
          {
            color: colors.text,
            fontSize: Typography.bodyBold.fontSize * fontScaleMultiplier,
            lineHeight: Typography.bodyBold.lineHeight * fontScaleMultiplier,
          },
        ]}>
        {item.title}
      </Text>

      {/* Scripture Reference Pill */}
      {item.scripture && (
        <View style={[styles.scriptureBadge, { backgroundColor: colors.surfaceSubtle }]}>
          <Ionicons name="book-outline" size={13} color={colors.primary} />
          <Text
            style={[
              styles.scriptureText,
              { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
            ]}>
            {item.scripture}
          </Text>
        </View>
      )}

      {/* Description */}
      {item.description && (
        <Text
          numberOfLines={expanded ? undefined : 3}
          style={[
            Typography.body,
            styles.description,
            {
              color: colors.textSecondary,
              fontSize: 14 * fontScaleMultiplier,
              lineHeight: 22 * fontScaleMultiplier,
            },
          ]}>
          {item.description}
        </Text>
      )}

      {/* Questions list if any (e.g. gems or congregation study) */}
      {item.questions && item.questions.length > 0 && (
        <View style={[styles.questionsContainer, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.questionsHeaderRow}>
            <Text
              style={[
                Typography.caption,
                styles.questionsHeader,
                { color: colors.text, fontSize: 12 * fontScaleMultiplier },
              ]}>
              ஆராய்ந்து பதிலளிக்க வேண்டிய கேள்விகள் ({item.questions.length}):
            </Text>
          </View>

          {item.questions.map((q, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => {
                if (onOpenQuestionDetail) {
                  onOpenQuestionDetail(q);
                } else {
                  onAddAnswer?.({
                    sectionLabel: getSectionLabelTamil(),
                    itemReference: item.scripture || item.title,
                    question: q,
                  });
                }
              }}
              style={styles.questionItem}>
              <View style={[styles.qDot, { backgroundColor: colors.primary }]} />
              <Text
                style={[
                  Typography.caption,
                  styles.questionText,
                  { color: colors.text, fontSize: 13 * fontScaleMultiplier },
                ]}>
                {q}
              </Text>
              <Ionicons
                name="chevron-forward-circle-outline"
                size={16}
                color={colors.primary}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Study Source */}
      {item.source && (
        <Text
          style={[
            styles.sourceText,
            { color: colors.textMuted, fontSize: 11 * fontScaleMultiplier },
          ]}>
          ஆதாரம்: {item.source}
        </Text>
      )}

      {/* Action Footer */}
      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        {item.description && item.description.length > 120 && (
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={styles.expandButton}>
            <Text
              style={[
                styles.expandText,
                { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              {expanded ? 'சுருக்குக' : 'மேலும் படிக்க'}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}

        <View style={styles.footerActionsRight}>
          {onViewSectionDetail && (
            <TouchableOpacity
              onPress={onViewSectionDetail}
              style={[styles.sectionDetailBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="list-outline" size={13} color={colors.textSecondary} />
              <Text
                style={[
                  styles.sectionDetailText,
                  { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                பகுதி விவரம்
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() =>
              onAddAnswer?.({
                sectionLabel: getSectionLabelTamil(),
                itemReference: item.scripture || item.title,
                question: item.questions ? item.questions[0] : undefined,
              })
            }
            style={[styles.addAnswerButton, { backgroundColor: colors.primarySurface }]}
            activeOpacity={0.7}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
            <Text
              style={[
                styles.addAnswerText,
                { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              பதில் குறிப்பு
            </Text>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 3,
  },
  durationText: {
    fontWeight: '600',
  },
  presenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  presenterText: {
    fontWeight: '500',
  },
  title: {
    marginBottom: Spacing.xs + 2,
  },
  scriptureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  scriptureText: {
    fontWeight: '600',
  },
  description: {
    marginBottom: Spacing.sm,
  },
  questionsContainer: {
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  questionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  questionsHeader: {
    fontWeight: '700',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs + 2,
    paddingVertical: 4,
  },
  qDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  questionText: {
    flex: 1,
    lineHeight: 19,
    fontWeight: '500',
  },
  sourceText: {
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  expandText: {
    fontWeight: '600',
  },
  footerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginLeft: 'auto',
  },
  sectionDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 3,
  },
  sectionDetailText: {
    fontWeight: '600',
  },
  addAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 4,
  },
  addAnswerText: {
    fontWeight: '600',
  },
});
