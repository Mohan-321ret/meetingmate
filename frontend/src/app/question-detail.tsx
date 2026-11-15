import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ParagraphReaderCard } from '@/components/ParagraphReaderCard';
import { ScriptureCard } from '@/components/ScriptureCard';
import { QuestionNavigationBar } from '@/components/QuestionNavigationBar';
import { AnswerModal } from '@/components/AnswerModal';
import { getQuestionNavigation } from '@/data/meetingService';
import { Spacing, Typography, Radius } from '@/constants/theme';
import { SavedAnswer } from '@/types';

export default function QuestionDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ questionId: string }>();
  const { colors, fontScaleMultiplier, savedAnswers, recordQuestionView } = useApp();

  const [currentId, setCurrentId] = useState<string>(params.questionId || 'wt-q-1');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<Partial<SavedAnswer> | null>(null);

  // Get question & navigation
  const navResult = useMemo(
    () => getQuestionNavigation(currentId, true),
    [currentId]
  );
  const { current, previous, next, currentIndex, total } = navResult;

  // Record question view in local history
  useEffect(() => {
    if (current) {
      recordQuestionView({
        id: current.id,
        questionText: current.questionText,
        questionNumberLabel: current.questionNumberLabel,
        sectionTitle: current.sectionTitle,
      });
    }
  }, [currentId, current, recordQuestionView]);

  // Check if an answer is already saved for this question
  const existingAnswer = useMemo(() => {
    if (!current) return null;
    return savedAnswers.find(
      ans =>
        ans.question.trim().toLowerCase() === current.questionText.trim().toLowerCase() ||
        (ans.itemReference && current.questionNumberLabel && ans.itemReference.includes(current.questionNumberLabel))
    );
  }, [current, savedAnswers]);

  // Handle safe back navigation for Android
  const handleBack = useCallback(() => {
    if (modalVisible) {
      setModalVisible(false);
      return true;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
    return true;
  }, [modalVisible]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  if (!current) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>கேள்வி விவரம்</Text>
        </View>
        <EmptyState
          title="கேள்வி கிடைக்கவில்லை"
          description="கோரப்பட்ட கேள்விக்கான விவரங்கள் கிடைக்கவில்லை."
          buttonTitle="திரும்பிச் செல்க"
          onButtonPress={handleBack}
        />
      </View>
    );
  }

  const handleOpenDraftAnswer = () => {
    setModalPrefill({
      meetingType: current.meetingType,
      sectionLabel: current.sectionTitle,
      itemReference: current.questionNumberLabel,
      question: current.questionText,
      scripture: current.scriptures.length > 0 ? current.scriptures[0].citation : undefined,
      answerText: existingAnswer ? existingAnswer.answerText : '',
      id: existingAnswer ? existingAnswer.id : undefined,
    });
    setModalVisible(true);
  };

  const handleOpenAnswerPresentation = () => {
    router.push({
      pathname: '/answer-detail',
      params: { questionId: current.id },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 12),
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
          accessibilityLabel="பின்னே செல்">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text
            numberOfLines={1}
            style={[
              Typography.h3,
              {
                color: colors.text,
                fontSize: Typography.h3.fontSize * fontScaleMultiplier,
              },
            ]}>
            {current.sectionTitle}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              Typography.caption,
              {
                color: colors.textSecondary,
                fontSize: 11 * fontScaleMultiplier,
              },
            ]}>
            {current.partTitle}
          </Text>
        </View>

        <View style={[styles.counterBadge, { backgroundColor: colors.primarySurface }]}>
          <Text
            style={[
              styles.counterBadgeText,
              { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
            ]}>
            {currentIndex} / {total}
          </Text>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Question Card */}
        <AppCard variant="elevated" padding="lg" style={styles.questionCard}>
          <View style={styles.questionMetaRow}>
            <View style={[styles.qPill, { backgroundColor: colors.primarySurface }]}>
              <Text
                style={[
                  styles.qPillText,
                  { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                ]}>
                {current.questionNumberLabel}
              </Text>
            </View>
            {current.subheading && (
              <Text
                style={[
                  Typography.caption,
                  styles.subheadingText,
                  { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
                ]}>
                {current.subheading}
              </Text>
            )}
          </View>

          <Text
            style={[
              Typography.h2,
              styles.questionMainText,
              {
                color: colors.text,
                fontSize: 18 * fontScaleMultiplier,
                lineHeight: 27 * fontScaleMultiplier,
              },
            ]}>
            {current.questionText}
          </Text>
        </AppCard>

        {/* Featured Answer Presentation CTA Card */}
        <AppCard
          padding="md"
          onPress={handleOpenAnswerPresentation}
          style={styles.answerPresentationCtaCard}>
          <View style={styles.ctaRow}>
            <View style={[styles.ctaIconCircle, { backgroundColor: colors.primarySurface }]}>
              <Ionicons name="chatbubbles" size={20} color={colors.primary} />
            </View>
            <View style={styles.ctaTextWrap}>
              <Text
                style={[
                  Typography.bodyBold,
                  { color: colors.text, fontSize: 14 * fontScaleMultiplier },
                ]}>
                தயாரிக்கப்பட்ட பதில் விளக்கம் காண்க
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
                ]}>
                சுருக்கமான பதில் • விரிவான விளக்கம் • வேத வசனங்கள்
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </AppCard>

        {/* Paragraph Reading Content */}
        {current.paragraphText && (
          <ParagraphReaderCard
            title={`${current.questionNumberLabel} வாசிப்புப் பகுதி`}
            sourceReference={current.sourceReference}
            paragraphText={current.paragraphText}
          />
        )}

        {/* Bible Scripture References */}
        {current.scriptures && current.scriptures.length > 0 && (
          <View style={styles.scripturesSection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="book-outline" size={16} color={colors.primary} />
              <Text
                style={[
                  Typography.h3,
                  styles.sectionTitleText,
                  { color: colors.text, fontSize: 15 * fontScaleMultiplier },
                ]}>
                தொடர்புடைய வேத வசனங்கள் ({current.scriptures.length})
              </Text>
            </View>

            {current.scriptures.map((scrip, idx) => (
              <ScriptureCard key={idx} scripture={scrip} />
            ))}
          </View>
        )}

        {/* Prepared Answer Box */}
        <AppCard padding="md" style={styles.answerPrepCard}>
          <View style={styles.answerCardHeader}>
            <View style={styles.answerCardTitleWrap}>
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color={existingAnswer ? '#15803D' : colors.primary}
              />
              <Text
                style={[
                  Typography.bodyBold,
                  {
                    color: colors.text,
                    fontSize: 14 * fontScaleMultiplier,
                  },
                ]}>
                {existingAnswer
                  ? 'தயாரிக்கப்பட்ட பதில் குறிப்பு ✓'
                  : 'உங்கள் பதில் தயாரிப்பு'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleOpenDraftAnswer}
              style={[
                styles.draftActionBtn,
                { backgroundColor: colors.primarySurface },
              ]}>
              <Ionicons
                name={existingAnswer ? 'pencil-outline' : 'add-outline'}
                size={14}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.draftActionText,
                  { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                ]}>
                {existingAnswer ? 'திருத்துக' : 'பதில் எழுதுக'}
              </Text>
            </TouchableOpacity>
          </View>

          {existingAnswer ? (
            <View
              style={[
                styles.savedAnswerBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}>
              <Text
                style={[
                  Typography.body,
                  styles.savedAnswerText,
                  {
                    color: colors.text,
                    fontSize: 14 * fontScaleMultiplier,
                    lineHeight: 22 * fontScaleMultiplier,
                  },
                ]}>
                {existingAnswer.answerText}
              </Text>
              {existingAnswer.scripture && (
                <Text
                  style={[
                    styles.savedAnswerScripture,
                    { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                  ]}>
                  வசனம்: {existingAnswer.scripture}
                </Text>
              )}
            </View>
          ) : (
            <Text
              style={[
                Typography.caption,
                styles.emptyDraftHint,
                { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
              ]}>
              கூட்டத்தில் உற்சாகமாக பதிலளிக்க இக்கேள்விக்கு ஒரு சுருக்கமான தமிழ் பதிலை நீங்கள் இப்போதே குறித்து வைக்கலாம்.
            </Text>
          )}

          {current.sampleAnswerNotes && !existingAnswer && (
            <View
              style={[
                styles.sampleHintBox,
                { backgroundColor: colors.surfaceSubtle },
              ]}>
              <Text
                style={[
                  Typography.caption,
                  styles.sampleHintLabel,
                  { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                சிந்தனை குறிப்பு:
              </Text>
              <Text
                style={[
                  Typography.body,
                  styles.sampleHintText,
                  { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
                ]}>
                {current.sampleAnswerNotes}
              </Text>
            </View>
          )}
        </AppCard>
      </ScrollView>

      {/* Previous and Next Navigation Bar */}
      <QuestionNavigationBar
        currentIndex={currentIndex}
        total={total}
        hasPrevious={Boolean(previous)}
        hasNext={Boolean(next)}
        onPrevious={() => {
          if (previous) {
            setCurrentId(previous.id);
          }
        }}
        onNext={() => {
          if (next) {
            setCurrentId(next.id);
          }
        }}
      />

      {/* Answer Modal */}
      <AnswerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialData={modalPrefill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  counterBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  counterBadgeText: {
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.huge,
  },
  questionCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  qPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  qPillText: {
    fontWeight: '700',
  },
  subheadingText: {
    fontWeight: '600',
  },
  questionMainText: {
    fontWeight: '700',
  },
  answerPresentationCtaCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ctaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextWrap: {
    flex: 1,
  },
  scripturesSection: {
    marginTop: Spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  sectionTitleText: {
    fontWeight: '700',
  },
  answerPrepCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  answerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  answerCardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  draftActionText: {
    fontWeight: '600',
  },
  savedAnswerBox: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  savedAnswerText: {
    marginBottom: 4,
  },
  savedAnswerScripture: {
    fontWeight: '600',
  },
  emptyDraftHint: {
    lineHeight: 19,
  },
  sampleHintBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  sampleHintLabel: {
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  sampleHintText: {
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
