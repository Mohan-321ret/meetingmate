import React, { useState, useEffect } from 'react';
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
import { useApp } from '@/context/AppContext';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { QuestionListItem } from '@/components/QuestionListItem';
import { AnswerModal } from '@/components/AnswerModal';
import { getSectionDetail } from '@/data/meetingService';
import { Spacing, Typography, Radius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SavedAnswer } from '@/types';

type SectionTab = 'questions' | 'parts';

export default function MeetingSectionScreen() {
  const insets = useSafeAreaInsets();
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const { colors, fontScaleMultiplier } = useApp();

  const [activeTab, setActiveTab] = useState<SectionTab>('questions');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<Partial<SavedAnswer> | null>(null);

  const section = getSectionDetail(sectionId || 'treasures');

  // Handle safe back navigation for Android
  const handleBack = React.useCallback(() => {
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

  if (!section) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>பகுதி</Text>
        </View>
        <EmptyState
          title="பகுதி கிடைக்கவில்லை"
          description="கோரப்பட்ட கூட்டப் பகுதி தகவல்கள் கிடைக்கவில்லை."
          buttonTitle="திரும்பிச் செல்க"
          onButtonPress={handleBack}
        />
      </View>
    );
  }

  const handleOpenAnswer = (prefill: {
    sectionLabel: string;
    itemReference: string;
    question?: string;
  }) => {
    setModalPrefill({
      meetingType: section.meetingType,
      sectionLabel: prefill.sectionLabel,
      itemReference: prefill.itemReference,
      question: prefill.question || '',
    });
    setModalVisible(true);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* App Bar Header */}
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
            {section.title}
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
            {section.timing}
          </Text>
        </View>

        <View style={[styles.iconTag, { backgroundColor: colors.primarySurface }]}>
          <Ionicons
            name={section.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={colors.primary}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Section Theme Banner */}
        <AppCard variant="elevated" padding="md" style={styles.bannerCard}>
          <View style={styles.bannerTop}>
            <View style={[styles.accentPill, { backgroundColor: section.accentColor }]}>
              <Text style={styles.accentPillText}>
                {section.meetingType === 'midweek' ? 'நடுவாரம்' : 'வார இறுதி'}
              </Text>
            </View>
            <Text
              style={[
                styles.timingText,
                { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              {section.timing}
            </Text>
          </View>

          <Text
            style={[
              Typography.h2,
              styles.sectionTitle,
              {
                color: colors.text,
                fontSize: 19 * fontScaleMultiplier,
                lineHeight: 27 * fontScaleMultiplier,
              },
            ]}>
            {section.title}
          </Text>

          <Text
            style={[
              Typography.body,
              styles.subtitleText,
              {
                color: colors.textSecondary,
                fontSize: 14 * fontScaleMultiplier,
                lineHeight: 21 * fontScaleMultiplier,
              },
            ]}>
            {section.subtitle}
          </Text>

          {section.theme && (
            <View style={[styles.themeQuoteBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text
                style={[
                  styles.themeQuoteText,
                  { color: colors.primary, fontSize: 13 * fontScaleMultiplier },
                ]}>
                &ldquo;{section.theme}&rdquo;
              </Text>
            </View>
          )}
        </AppCard>

        {/* Segmented Switcher */}
        <View style={styles.tabSwitcherRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('questions')}
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === 'questions' ? colors.primary : colors.surface,
                borderColor:
                  activeTab === 'questions' ? colors.primary : colors.border,
              },
            ]}>
            <Ionicons
              name="help-circle-outline"
              size={16}
              color={activeTab === 'questions' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'questions' ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 13 * fontScaleMultiplier,
                  fontWeight: activeTab === 'questions' ? '700' : '500',
                },
              ]}>
              கேள்விகள் பட்டியல் ({section.allQuestions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('parts')}
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === 'parts' ? colors.primary : colors.surface,
                borderColor:
                  activeTab === 'parts' ? colors.primary : colors.border,
              },
            ]}>
            <Ionicons
              name="list-outline"
              size={16}
              color={activeTab === 'parts' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'parts' ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 13 * fontScaleMultiplier,
                  fontWeight: activeTab === 'parts' ? '700' : '500',
                },
              ]}>
              பகுதி விவரங்கள் ({section.parts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: QUESTIONS LIST */}
        {activeTab === 'questions' && (
          <View style={styles.tabContent}>
            {section.allQuestions.length > 0 ? (
              section.allQuestions.map(q => (
                <QuestionListItem
                  key={q.id}
                  question={q}
                  onPress={() =>
                    router.push({
                      pathname: '/question-detail',
                      params: { questionId: q.id },
                    })
                  }
                  onPrepareAnswer={() =>
                    handleOpenAnswer({
                      sectionLabel: section.title,
                      itemReference: q.questionNumberLabel,
                      question: q.questionText,
                    })
                  }
                />
              ))
            ) : (
              <EmptyState
                icon="document-text-outline"
                title="கேள்விகள் எதுவும் இல்லை"
                description="இந்த பகுதியில் தற்போது கேள்விகள் பட்டியலிடப்படவில்லை."
              />
            )}
          </View>
        )}

        {/* TAB 2: SECTION PARTS DETAIL */}
        {activeTab === 'parts' && (
          <View style={styles.tabContent}>
            {section.parts.map(part => (
              <AppCard key={part.id} padding="md" style={styles.partCard}>
                <View style={styles.partHeaderRow}>
                  <Text
                    style={[
                      Typography.bodyBold,
                      styles.partTitle,
                      {
                        color: colors.text,
                        fontSize: 16 * fontScaleMultiplier,
                        flex: 1,
                      },
                    ]}>
                    {part.title}
                  </Text>
                  {part.duration && (
                    <View style={[styles.durationBadge, { backgroundColor: colors.surfaceSubtle }]}>
                      <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.durationBadgeText,
                          { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
                        ]}>
                        {part.duration}
                      </Text>
                    </View>
                  )}
                </View>

                {part.presenter && (
                  <View style={styles.presenterRow}>
                    <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                    <Text
                      style={[
                        styles.presenterText,
                        { color: colors.textMuted, fontSize: 12 * fontScaleMultiplier },
                      ]}>
                      {part.presenter}
                    </Text>
                  </View>
                )}

                {part.scripture && (
                  <View style={[styles.scripturePill, { backgroundColor: colors.surfaceSubtle }]}>
                    <Ionicons name="book-outline" size={12} color={colors.primary} />
                    <Text
                      style={[
                        styles.scripturePillText,
                        { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                      ]}>
                      {part.scripture}
                    </Text>
                  </View>
                )}

                {part.paragraphContent && (
                  <Text
                    style={[
                      Typography.body,
                      styles.paragraphText,
                      {
                        color: colors.textSecondary,
                        fontSize: 14 * fontScaleMultiplier,
                        lineHeight: 22 * fontScaleMultiplier,
                      },
                    ]}>
                    {part.paragraphContent}
                  </Text>
                )}

                {part.source && (
                  <Text
                    style={[
                      styles.sourceText,
                      { color: colors.textMuted, fontSize: 11 * fontScaleMultiplier },
                    ]}>
                    ஆதாரம்: {part.source}
                  </Text>
                )}

                <View style={[styles.partFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => setActiveTab('questions')}
                    style={[styles.viewQuestionsBtn, { backgroundColor: colors.primarySurface }]}>
                    <Ionicons name="help-circle-outline" size={14} color={colors.primary} />
                    <Text
                      style={[
                        styles.viewQuestionsText,
                        { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                      ]}>
                      இந்த பகுதியின் கேள்விகள்
                    </Text>
                  </TouchableOpacity>
                </View>
              </AppCard>
            ))}
          </View>
        )}
      </ScrollView>

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
  iconTag: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.huge + 20,
  },
  bannerCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
  },
  accentPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  accentPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  timingText: {
    fontWeight: '500',
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  subtitleText: {
    marginBottom: Spacing.sm,
  },
  themeQuoteBox: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  themeQuoteText: {
    fontWeight: '600',
    fontStyle: 'italic',
  },
  tabSwitcherRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  tabBtnText: {
    fontWeight: '600',
  },
  tabContent: {
    marginTop: Spacing.xs,
  },
  partCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  partHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  partTitle: {
    marginRight: Spacing.sm,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 3,
  },
  durationBadgeText: {
    fontWeight: '600',
  },
  presenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  presenterText: {
    fontWeight: '500',
  },
  scripturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  scripturePillText: {
    fontWeight: '600',
  },
  paragraphText: {
    marginBottom: Spacing.sm,
  },
  sourceText: {
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  partFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewQuestionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 5,
  },
  viewQuestionsText: {
    fontWeight: '600',
  },
});

