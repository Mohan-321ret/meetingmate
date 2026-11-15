import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { AppCard } from '@/components/AppCard';
import { AppButton } from '@/components/AppButton';
import { AppBadge } from '@/components/AppBadge';
import { AnswerModal } from '@/components/AnswerModal';
import { Spacing, Typography, Radius, Palette } from '@/constants/theme';
import { SavedAnswer } from '@/types';
import { AnswerGenerateResponse } from '@/types/api';
import { ALL_QUESTIONS } from '@/data/meetingService';

export default function HomeScreen() {
  const {
    colors,
    fontScaleMultiplier,
    settings,
    midweekData,
    weekendData,
    savedAnswers,
    recentQuestions,
    toggleFavorite,
    addAnswer,
    isBackendOnline,
    refreshMeetings,
    syncSavedAnswers,
    askIndependentQuestion,
  } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<Partial<SavedAnswer> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Independent question asking state
  const [independentQuery, setIndependentQuery] = useState('');
  const [independentType, setIndependentType] = useState<'short' | 'detailed'>('short');
  const [isAskingIndependent, setIsAskingIndependent] = useState(false);
  const [independentResult, setIndependentResult] = useState<AnswerGenerateResponse | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshMeetings(), syncSavedAnswers()]);
    } catch (err) {
      console.warn('Pull-to-refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshMeetings, syncSavedAnswers]);

  const handleAskIndependentQuestion = async () => {
    const q = independentQuery.trim();
    if (!q) {
      Alert.alert('குறிப்பு', 'தயவுசெய்து ஒரு கேள்வியை உள்ளிடவும்.');
      return;
    }

    setIsAskingIndependent(true);
    setIndependentResult(null);
    try {
      const res = await askIndependentQuestion(q, independentType);
      setIndependentResult(res);
    } catch (err: any) {
      Alert.alert(
        'பதில் பெறுவதில் பிழை',
        err.tamilMessage ||
          'சர்வரிலிருந்து பதில் பெற முடியவில்லை. Tailscale இணைப்பை சரிபார்க்கவும்.'
      );
    } finally {
      setIsAskingIndependent(false);
    }
  };

  const handleSaveIndependentAnswer = () => {
    if (!independentResult) return;
    addAnswer({
      meetingType: 'midweek',
      sectionLabel: 'சுயாதீன கேள்வி',
      itemReference: independentQuery.slice(0, 30),
      question: independentQuery,
      answerText: independentResult.answer,
      scripture:
        independentResult.sources.length > 0
          ? independentResult.sources[0].source_title
          : undefined,
      isFavorite: true,
    });
    Alert.alert(
      'சேமிக்கப்பட்டது ✓',
      'சுயாதீன கேள்விக்கான பதில் சேமிக்கப்பட்ட பதில்களில் சேர்க்கப்பட்டது.'
    );
  };

  const openNewAnswerModal = (prefill?: Partial<SavedAnswer>) => {
    setModalPrefill(prefill || null);
    setModalVisible(true);
  };

  const recentAnswers = savedAnswers.slice(0, 2);
  const highlightQuestions = ALL_QUESTIONS.slice(0, 3);

  const sectionPills = [
    { id: 'treasures', label: 'புதையல்கள்', icon: 'diamond-outline', color: Palette.treasures },
    { id: 'ministry', label: 'ஊழியம்', icon: 'people-outline', color: Palette.ministry },
    { id: 'living', label: 'கிறிஸ்தவ வாழ்க்கை', icon: 'heart-outline', color: Palette.living },
    { id: 'public_talk', label: 'பொதுப் பேச்சு', icon: 'mic-outline', color: Palette.publicTalk },
    { id: 'watchtower', label: 'காவற்கோபுரம்', icon: 'library-outline', color: Palette.watchtower },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="முகப்பு"
        subtitle={settings.congregationName}
        tag="JW கூட்ட உதவியாளர்"
        rightAction={{
          icon: 'add',
          onPress: () => openNewAnswerModal(),
          accessibilityLabel: 'புதிய பதில் சேர்க்க',
        }}
        secondaryAction={{
          icon: 'settings-outline',
          onPress: () => router.push('/settings'),
          accessibilityLabel: 'அமைப்புகள்',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {/* Next Meeting Hero Card */}
        <AppCard
          variant="elevated"
          padding="lg"
          style={styles.nextMeetingCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.livePill, { backgroundColor: colors.primarySurface }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Text
                style={[
                  styles.livePillText,
                  { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                அடுத்த கூட்டம்
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              {isBackendOnline !== null && (
                <View
                  style={[
                    styles.backendStatusPill,
                    {
                      backgroundColor:
                        isBackendOnline ? '#DCFCE7' : '#FEE2E2',
                    },
                  ]}>
                  <View
                    style={[
                      styles.netDot,
                      { backgroundColor: isBackendOnline ? '#16A34A' : '#DC2626' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.netText,
                      { color: isBackendOnline ? '#16A34A' : '#DC2626' },
                    ]}>
                    {isBackendOnline ? 'Tailscale' : 'ஆஃப்லைன்'}
                  </Text>
                </View>
              )}
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text
                style={[
                  styles.scheduleText,
                  { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
                ]}>
                {settings.midweekSchedule}
              </Text>
            </View>
          </View>


          <Text
            style={[
              Typography.h2,
              styles.nextMeetingTitle,
              {
                color: colors.text,
                fontSize: Typography.h2.fontSize * fontScaleMultiplier,
                lineHeight: Typography.h2.lineHeight * fontScaleMultiplier,
              },
            ]}>
            நடுவாரக் கூட்டம்
          </Text>

          <View style={styles.bibleReadPill}>
            <Ionicons name="book-outline" size={14} color={colors.primary} />
            <Text
              style={[
                styles.bibleReadText,
                { color: colors.primary, fontSize: 13 * fontScaleMultiplier },
              ]}>
              பைபிள் வாசிப்பு: {midweekData.bibleReadingRange}
            </Text>
          </View>

          <Text
            numberOfLines={2}
            style={[
              Typography.body,
              styles.themeQuote,
              {
                color: colors.textSecondary,
                fontSize: 14 * fontScaleMultiplier,
                lineHeight: 21 * fontScaleMultiplier,
              },
            ]}>
            &ldquo;{midweekData.theme}&rdquo;
          </Text>

          <View style={styles.heroActionRow}>
            <AppButton
              title="நிகழ்ச்சி நிரல் பார்க்க"
              icon="arrow-forward-outline"
              iconPosition="right"
              size="sm"
              onPress={() => router.push('/midweek')}
              style={{ flex: 1 }}
            />
            <AppButton
              title="பதில் எழுதுக"
              variant="secondary"
              icon="create-outline"
              size="sm"
              onPress={() =>
                openNewAnswerModal({
                  meetingType: 'midweek',
                  sectionLabel: 'ஆன்மீகப் புதையல்கள்',
                  itemReference: midweekData.bibleReadingRange,
                })
              }
              style={{ flex: 1, marginLeft: Spacing.sm }}
            />
          </View>
        </AppCard>

        {/* Section Quick Jump Pills */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              Typography.h3,
              {
                color: colors.text,
                fontSize: Typography.h3.fontSize * fontScaleMultiplier,
              },
            ]}>
            கூட்டப் பகுதிகள்
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionPillsScroll}>
          {sectionPills.map(sp => (
            <TouchableOpacity
              key={sp.id}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/meeting-section',
                  params: { sectionId: sp.id },
                })
              }
              style={[styles.sectionPillBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.pillIconDot, { backgroundColor: sp.color + '20' }]}>
                <Ionicons name={sp.icon as any} size={15} color={sp.color} />
              </View>
              <Text
                style={[
                  styles.sectionPillBtnText,
                  { color: colors.text, fontSize: 12 * fontScaleMultiplier },
                ]}>
                {sp.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick Access to Meetings */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              Typography.h3,
              {
                color: colors.text,
                fontSize: Typography.h3.fontSize * fontScaleMultiplier,
              },
            ]}>
            இந்த வார கூட்டங்கள்
          </Text>
          <Text
            style={[
              Typography.caption,
              { color: colors.textMuted, fontSize: 12 * fontScaleMultiplier },
            ]}>
            {midweekData.weekDateRange}
          </Text>
        </View>

        {/* Midweek Card */}
        <AppCard
          padding="md"
          onPress={() => router.push('/midweek')}
          style={styles.meetingOverviewCard}>
          <View style={styles.cardHeaderRow}>
            <AppBadge label="நடுவாரக் கூட்டம்" type="treasures" size="sm" />
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <Text
            style={[
              Typography.bodyBold,
              styles.meetingCardTitle,
              {
                color: colors.text,
                fontSize: 16 * fontScaleMultiplier,
              },
            ]}>
            கிறிஸ்தவ வாழ்க்கையும் ஊழியமும்
          </Text>
          <Text
            style={[
              styles.subDetailText,
              { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
            ]}>
            பாடல் {midweekData.openingSong.number} • புதையல்கள் • ஊழியம் • கிறிஸ்தவ வாழ்க்கை
          </Text>
        </AppCard>

        {/* Weekend Card */}
        <AppCard
          padding="md"
          onPress={() => router.push('/weekend')}
          style={styles.meetingOverviewCard}>
          <View style={styles.cardHeaderRow}>
            <AppBadge label="வார இறுதி கூட்டம்" type="watchtower" size="sm" />
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <Text
            style={[
              Typography.bodyBold,
              styles.meetingCardTitle,
              {
                color: colors.text,
                fontSize: 16 * fontScaleMultiplier,
              },
            ]}>
            பொதுப் பேச்சு & காவற்கோபுர படிப்பு
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.subDetailText,
              { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
            ]}>
            பேச்சு: {weekendData.publicTalk.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.subDetailText,
              { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
            ]}>
            காவற்கோபுரம்: {weekendData.watchtowerStudy.articleTitle}
          </Text>
        </AppCard>

        {/* ================= INDEPENDENT QUESTION & AI ANSWER ================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text
              style={[
                Typography.h3,
                {
                  color: colors.text,
                  fontSize: Typography.h3.fontSize * fontScaleMultiplier,
                },
              ]}>
              சுயாதீன பைபிள் கேள்வி & AI பதில்
            </Text>
          </View>
        </View>

        <AppCard padding="md" style={styles.independentCard}>
          <Text
            style={[
              Typography.caption,
              { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier, marginBottom: 8 },
            ]}>
            கூட்ட கேள்விக்கு வெளியேயும் வேதாகமம் மற்றும் சபை வெளியீடுகளை அடிப்படையாகக் கொண்டு பதில் பெறலாம்:
          </Text>

          <TextInput
            value={independentQuery}
            onChangeText={setIndependentQuery}
            placeholder="எ.கா. இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              styles.independentInput,
              {
                backgroundColor: colors.surfaceSubtle,
                color: colors.text,
                borderColor: colors.border,
                fontSize: 13 * fontScaleMultiplier,
              },
            ]}
          />

          <View style={styles.independentControlsRow}>
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                onPress={() => setIndependentType('short')}
                style={[
                  styles.typeToggleBtn,
                  independentType === 'short' && {
                    backgroundColor: colors.primarySurface,
                    borderColor: colors.primary,
                  },
                ]}>
                <Text
                  style={[
                    styles.typeToggleText,
                    {
                      color: independentType === 'short' ? colors.primary : colors.textSecondary,
                      fontSize: 11 * fontScaleMultiplier,
                    },
                  ]}>
                  சுருக்கமான பதில் (~30 வினாடி)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIndependentType('detailed')}
                style={[
                  styles.typeToggleBtn,
                  independentType === 'detailed' && {
                    backgroundColor: colors.primarySurface,
                    borderColor: colors.primary,
                  },
                ]}>
                <Text
                  style={[
                    styles.typeToggleText,
                    {
                      color: independentType === 'detailed' ? colors.primary : colors.textSecondary,
                      fontSize: 11 * fontScaleMultiplier,
                    },
                  ]}>
                  விரிவான பதில் (~60 வினாடி)
                </Text>
              </TouchableOpacity>
            </View>

            <AppButton
              title={isAskingIndependent ? 'பதில் பெறுகிறது...' : 'AI பதில் பெறுக'}
              icon="sparkles-outline"
              size="sm"
              onPress={handleAskIndependentQuestion}
              loading={isAskingIndependent}
              style={{ alignSelf: 'flex-end', marginTop: Spacing.xs }}
            />
          </View>

          {independentResult && (
            <View style={[styles.independentResultBox, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={styles.resultHeaderRow}>
                <Text
                  style={[
                    Typography.bodyBold,
                    { color: colors.primary, fontSize: 13 * fontScaleMultiplier },
                  ]}>
                  உருவாக்கப்பட்ட பதில் ({independentResult.answer_type === 'short' ? 'சுருக்கம்' : 'விரிவானது'}):
                </Text>
                <TouchableOpacity
                  onPress={handleSaveIndependentAnswer}
                  style={styles.saveResultBtn}>
                  <Ionicons name="bookmark-outline" size={14} color={colors.primary} />
                  <Text
                    style={[
                      styles.saveResultText,
                      { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                    ]}>
                    பதிலை சேமிக்க
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  Typography.body,
                  styles.resultBodyText,
                  { color: colors.text, fontSize: 13 * fontScaleMultiplier, lineHeight: 21 * fontScaleMultiplier },
                ]}>
                {independentResult.answer}
              </Text>

              {independentResult.sources && independentResult.sources.length > 0 && (
                <View style={styles.resultSourcesWrap}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier, fontWeight: '600' },
                    ]}>
                    ஆதார மேற்கோள்கள் ({independentResult.sources.length}):
                  </Text>
                  {independentResult.sources.slice(0, 2).map((s, idx) => (
                    <Text
                      key={idx}
                      numberOfLines={1}
                      style={[
                        Typography.caption,
                        { color: colors.textMuted, fontSize: 10 * fontScaleMultiplier, marginTop: 2 },
                      ]}>
                      • {s.source_title} {s.paragraph_reference ? `(${s.paragraph_reference})` : ''} - பொருத்தம்: {Math.round(s.relevance_score * 100)}%
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </AppCard>

        {/* Key Study Questions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              Typography.h3,
              {
                color: colors.text,
                fontSize: Typography.h3.fontSize * fontScaleMultiplier,
              },
            ]}>
            இந்த வார முக்கிய ஆய்வுக் கேள்விகள்
          </Text>
        </View>

        {highlightQuestions.map(q => (
          <AppCard
            key={q.id}
            padding="md"
            onPress={() =>
              router.push({
                pathname: '/question-detail',
                params: { questionId: q.id },
              })
            }
            style={styles.highlightQuestionCard}>
            <View style={styles.hqTopRow}>
              <AppBadge
                label={q.sectionTitle}
                type={q.sectionId === 'treasures' ? 'treasures' : 'watchtower'}
                size="sm"
              />
              <Text
                style={[
                  styles.hqRef,
                  { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                {q.questionNumberLabel}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              style={[
                Typography.bodyBold,
                styles.hqQuestionText,
                { color: colors.text, fontSize: 13 * fontScaleMultiplier, lineHeight: 20 * fontScaleMultiplier },
              ]}>
              {q.questionText}
            </Text>
            <View style={styles.hqFooter}>
              <Text
                style={[
                  styles.hqSubheading,
                  { color: colors.textMuted, fontSize: 11 * fontScaleMultiplier },
                ]}>
                {q.subheading || q.partTitle}
              </Text>
              <View style={styles.viewQRow}>
                <Text
                  style={[
                    styles.viewQText,
                    { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                  ]}>
                  பாரா & வசனங்கள் காண்க
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </View>
            </View>
          </AppCard>
        ))}

        {/* Recently Viewed Questions Section */}
        {recentQuestions && recentQuestions.length > 0 && (
          <View style={{ marginTop: Spacing.sm }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text
                  style={[
                    Typography.h3,
                    {
                      color: colors.text,
                      fontSize: Typography.h3.fontSize * fontScaleMultiplier,
                    },
                  ]}>
                  அண்மையில் பார்த்தவை ({recentQuestions.length})
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentQuestionsScroll}>
              {recentQuestions.map(item => (
                <AppCard
                  key={item.id}
                  padding="sm"
                  onPress={() =>
                    router.push({
                      pathname: '/question-detail',
                      params: { questionId: item.id },
                    })
                  }
                  style={styles.recentQuestionCard}>
                  <View style={styles.rqTopRow}>
                    <View style={[styles.rqBadge, { backgroundColor: colors.primarySurface }]}>
                      <Text
                        style={[
                          styles.rqBadgeText,
                          { color: colors.primary, fontSize: 10 * fontScaleMultiplier },
                        ]}>
                        {item.questionNumberLabel}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.rqTimeText,
                        { color: colors.textMuted, fontSize: 10 * fontScaleMultiplier },
                      ]}>
                      {item.viewedAt}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[
                      Typography.bodyBold,
                      styles.rqQuestionText,
                      {
                        color: colors.text,
                        fontSize: 12 * fontScaleMultiplier,
                        lineHeight: 18 * fontScaleMultiplier,
                      },
                    ]}>
                    {item.questionText}
                  </Text>
                </AppCard>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Answers Section */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              Typography.h3,
              {
                color: colors.text,
                fontSize: Typography.h3.fontSize * fontScaleMultiplier,
              },
            ]}>
            தயாரிக்கப்பட்ட பதில்கள் ({savedAnswers.length})
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/saved-answers')}
            style={styles.seeAllBtn}>
            <Text
              style={[
                styles.seeAllText,
                { color: colors.primary, fontSize: 13 * fontScaleMultiplier },
              ]}>
              அனைத்தும் காண்க
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {recentAnswers.length > 0 ? (
          recentAnswers.map(ans => (
            <AppCard
              key={ans.id}
              padding="md"
              onPress={() => router.push('/saved-answers')}
              style={styles.recentAnswerCard}>
              <View style={styles.recentAnsTop}>
                <AppBadge
                  label={ans.sectionLabel}
                  type={ans.meetingType === 'midweek' ? 'treasures' : 'watchtower'}
                  size="sm"
                />
                <Text
                  style={[
                    styles.refTag,
                    { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
                  ]}>
                  {ans.itemReference}
                </Text>
                <TouchableOpacity
                  onPress={() => toggleFavorite(ans.id)}
                  style={{ marginLeft: 'auto' }}>
                  <Ionicons
                    name={ans.isFavorite ? 'star' : 'star-outline'}
                    size={18}
                    color={ans.isFavorite ? '#EAB308' : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {ans.question ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.recentQuestion,
                    { color: colors.text, fontSize: 13 * fontScaleMultiplier },
                  ]}>
                  {ans.question}
                </Text>
              ) : null}

              <Text
                numberOfLines={2}
                style={[
                  styles.recentAnsText,
                  { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
                ]}>
                {ans.answerText}
              </Text>
            </AppCard>
          ))
        ) : (
          <AppCard padding="md" style={styles.emptyRecentCard}>
            <Text
              style={[
                styles.emptyText,
                { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
              ]}>
              இன்னும் பதில் குறிப்புகள் சேர்க்கப்படவில்லை.
            </Text>
            <AppButton
              title="முதல் குறிப்பை எழுதவும்"
              variant="outline"
              size="sm"
              icon="add-outline"
              onPress={() => openNewAnswerModal()}
              style={{ marginTop: Spacing.sm }}
            />
          </AppCard>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.huge + 20,
  },
  nextMeetingCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  livePillText: {
    fontWeight: '700',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontWeight: '500',
  },
  nextMeetingTitle: {
    marginBottom: Spacing.xs,
  },
  bibleReadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.sm,
  },
  bibleReadText: {
    fontWeight: '600',
  },
  themeQuote: {
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionPillsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  sectionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  pillIconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionPillBtnText: {
    fontWeight: '600',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontWeight: '600',
  },
  meetingOverviewCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
  },
  meetingCardTitle: {
    marginBottom: 4,
  },
  subDetailText: {
    lineHeight: 18,
    marginTop: 2,
  },
  highlightQuestionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  hqTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hqRef: {
    fontWeight: '700',
  },
  hqQuestionText: {
    marginBottom: Spacing.xs + 2,
  },
  hqFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  hqSubheading: {
    fontStyle: 'italic',
    flex: 1,
  },
  viewQRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewQText: {
    fontWeight: '600',
  },
  recentAnswerCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  recentAnsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.xs,
  },
  refTag: {
    fontWeight: '600',
  },
  recentQuestion: {
    fontWeight: '600',
    marginBottom: 2,
  },
  recentAnsText: {
    lineHeight: 18,
  },
  emptyRecentCard: {
    marginHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  recentQuestionsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  recentQuestionCard: {
    width: 220,
  },
  rqTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  rqBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  rqBadgeText: {
    fontWeight: '700',
  },
  rqTimeText: {
    fontStyle: 'italic',
  },
  rqQuestionText: {
    fontWeight: '600',
  },
  backendStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: 6,
  },
  netDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  netText: {
    fontSize: 10,
    fontWeight: '700',
  },
  independentCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  independentInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  independentControlsRow: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  typeToggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  typeToggleText: {
    fontWeight: '600',
  },
  independentResultBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  saveResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveResultText: {
    fontWeight: '700',
  },
  resultBodyText: {
    marginTop: 2,
  },
  resultSourcesWrap: {
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
    paddingTop: Spacing.xs,
  },
});
