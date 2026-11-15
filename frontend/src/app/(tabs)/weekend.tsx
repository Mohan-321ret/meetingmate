import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { AppCard } from '@/components/AppCard';
import { AppBadge } from '@/components/AppBadge';
import { FilterPills, FilterOption } from '@/components/FilterPills';
import { SectionHeader } from '@/components/SectionHeader';
import { AnswerModal } from '@/components/AnswerModal';
import { Spacing, Typography, Radius, Palette } from '@/constants/theme';
import { SavedAnswer } from '@/types';

type WeekendFilter = 'all' | 'public_talk' | 'watchtower';

export default function WeekendMeetingScreen() {
  const { colors, fontScaleMultiplier, weekendData, refreshMeetings } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<WeekendFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<Partial<SavedAnswer> | null>(null);
  const [expandedSampleAnswers, setExpandedSampleAnswers] = useState<Record<number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMeetings();
    } finally {
      setRefreshing(false);
    }
  }, [refreshMeetings]);

  const filterOptions: FilterOption[] = [
    { id: 'all', label: 'முழு கூட்டம்' },
    { id: 'public_talk', label: 'பொதுப் பேச்சு' },
    {
      id: 'watchtower',
      label: 'காவற்கோபுரம்',
      count: weekendData.watchtowerStudy.paragraphs.length,
    },
  ];

  const toggleSampleAnswer = (paragraphNum: number) => {
    setExpandedSampleAnswers(prev => ({
      ...prev,
      [paragraphNum]: !prev[paragraphNum],
    }));
  };

  const handleOpenAddAnswer = (prefill: {
    sectionLabel: string;
    itemReference: string;
    question?: string;
    scripture?: string;
  }) => {
    setModalPrefill({
      meetingType: 'weekend',
      sectionLabel: prefill.sectionLabel,
      itemReference: prefill.itemReference,
      question: prefill.question || '',
      scripture: prefill.scripture || '',
    });
    setModalVisible(true);
  };

  const handleOpenQuestionDetail = (paragraphNumber: number) => {
    router.push({
      pathname: '/question-detail',
      params: { questionId: `wt-q-${paragraphNumber}` },
    });
  };

  const showPublicTalk = selectedFilter === 'all' || selectedFilter === 'public_talk';
  const showWatchtower = selectedFilter === 'all' || selectedFilter === 'watchtower';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="வார இறுதி கூட்டம்"
        subtitle={weekendData.meetingDate}
        tag="பொதுப் பேச்சு & காவற்கோபுரம்"
        rightAction={{
          icon: 'add-circle-outline',
          onPress: () =>
            handleOpenAddAnswer({
              sectionLabel: 'காவற்கோபுர படிப்பு',
              itemReference: 'பாரா 1',
            }),
          accessibilityLabel: 'பதில் சேர்க்க',
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
        {/* Date Banner */}
        <AppCard variant="flat" padding="md" style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text
              style={[
                Typography.bodyBold,
                { color: colors.text, marginLeft: Spacing.sm, fontSize: 14 * fontScaleMultiplier },
              ]}>
              {weekendData.meetingDate}
            </Text>
          </View>
        </AppCard>

        {/* Filter Pills */}
        <FilterPills
          options={filterOptions}
          selectedId={selectedFilter}
          onSelect={id => setSelectedFilter(id as WeekendFilter)}
        />

        {/* ================= SECTION 1: PUBLIC TALK ================= */}
        {showPublicTalk && (
          <View style={styles.sectionWrap}>
            {/* Opening Song */}
            <AppCard variant="outlined" padding="sm" style={styles.songCard}>
              <View style={styles.songRow}>
                <AppBadge label="பாடல்" type="song" size="sm" />
                <Text
                  style={[
                    Typography.caption,
                    styles.songText,
                    { color: colors.text, fontSize: 13 * fontScaleMultiplier },
                  ]}>
                  பாடல் {weekendData.publicTalk.song.number}: {weekendData.publicTalk.song.title}
                </Text>
                <Text
                  style={[
                    styles.prayerText,
                    { color: colors.textMuted, fontSize: 11 * fontScaleMultiplier },
                  ]}>
                  ஆரம்ப ஜெபம்
                </Text>
              </View>
            </AppCard>

            <SectionHeader
              title="பொதுப் பேச்சு"
              subtitle="30 நிமிடங்கள் • பைபிள் போதனை"
              accentColor={Palette.publicTalk}
              icon="mic-outline"
              actionLabel="கேள்விகள் ›"
              onPress={() =>
                router.push({
                  pathname: '/meeting-section',
                  params: { sectionId: 'public_talk' },
                })
              }
            />

            <AppCard padding="md" style={styles.publicTalkCard}>
              <View style={styles.talkBadgeRow}>
                <AppBadge label="30 நிமிடம்" type="publicTalk" size="sm" />
                <Text
                  style={[
                    styles.speakerName,
                    { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
                  ]}>
                  {weekendData.publicTalk.speaker}
                </Text>
              </View>

              <Text
                style={[
                  Typography.h3,
                  styles.talkTitle,
                  {
                    color: colors.text,
                    fontSize: Typography.h3.fontSize * fontScaleMultiplier,
                    lineHeight: Typography.h3.lineHeight * fontScaleMultiplier,
                  },
                ]}>
                {weekendData.publicTalk.title}
              </Text>

              <Text
                style={[
                  styles.congregationText,
                  { color: colors.textMuted, fontSize: 12 * fontScaleMultiplier },
                ]}>
                {weekendData.publicTalk.congregation}
              </Text>

              {/* Scriptures */}
              <View style={styles.scriptureListRow}>
                {weekendData.publicTalk.scriptures.map((scrip, idx) => (
                  <View
                    key={idx}
                    style={[styles.scripturePill, { backgroundColor: colors.surfaceSubtle }]}>
                    <Ionicons name="book-outline" size={12} color={colors.primary} />
                    <Text
                      style={[
                        styles.scripturePillText,
                        { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                      ]}>
                      {scrip}
                    </Text>
                  </View>
                ))}
              </View>

              <Text
                style={[
                  Typography.body,
                  styles.talkSummary,
                  {
                    color: colors.textSecondary,
                    fontSize: 14 * fontScaleMultiplier,
                    lineHeight: 22 * fontScaleMultiplier,
                  },
                ]}>
                {weekendData.publicTalk.summary}
              </Text>

              <View style={styles.talkActionFooter}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/meeting-section',
                      params: { sectionId: 'public_talk' },
                    })
                  }
                  style={[styles.sectionBtn, { backgroundColor: colors.surfaceSubtle }]}>
                  <Ionicons name="list-outline" size={14} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.sectionBtnText,
                      { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
                    ]}>
                    பேச்சு சிந்தனைகள் ({2})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleOpenAddAnswer({
                      sectionLabel: 'பொதுப் பேச்சு குறிப்புகள்',
                      itemReference: weekendData.publicTalk.title,
                      question: 'இந்த பேச்சிலிருந்து நான் கற்றுக்கொண்ட முக்கிய பாடம் என்ன?',
                    })
                  }
                  style={[styles.noteButton, { backgroundColor: colors.primarySurface }]}
                  activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={14} color={colors.primary} />
                  <Text
                    style={[
                      styles.noteButtonText,
                      { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                    ]}>
                    குறிப்பு சேர்க்க
                  </Text>
                </TouchableOpacity>
              </View>
            </AppCard>
          </View>
        )}

        {/* ================= SECTION 2: WATCHTOWER STUDY ================= */}
        {showWatchtower && (
          <View style={styles.sectionWrap}>
            {/* Middle Song */}
            <AppCard variant="outlined" padding="sm" style={styles.songCard}>
              <View style={styles.songRow}>
                <AppBadge label="பாடல்" type="song" size="sm" />
                <Text
                  style={[
                    Typography.caption,
                    styles.songText,
                    { color: colors.text, fontSize: 13 * fontScaleMultiplier },
                  ]}>
                  பாடல் {weekendData.watchtowerStudy.song.number}:{' '}
                  {weekendData.watchtowerStudy.song.title}
                </Text>
              </View>
            </AppCard>

            <SectionHeader
              title="காவற்கோபுர படிப்பு"
              subtitle="60 நிமிடங்கள் • வாராந்திர ஆய்வு கட்டுரை"
              accentColor={Palette.watchtower}
              icon="library-outline"
              actionLabel="கேள்விகள் பட்டியல் ›"
              onPress={() =>
                router.push({
                  pathname: '/meeting-section',
                  params: { sectionId: 'watchtower' },
                })
              }
            />

            {/* Article Hero Card */}
            <AppCard
              variant="elevated"
              padding="md"
              style={styles.articleHeroCard}
              onPress={() =>
                router.push({
                  pathname: '/meeting-section',
                  params: { sectionId: 'watchtower' },
                })
              }>
              <View style={styles.articleTopRow}>
                <AppBadge label="ஆய்வுக் கட்டுரை" type="watchtower" size="sm" />
                <View style={styles.allQuestionsBadge}>
                  <Text
                    style={[
                      styles.allQuestionsBadgeText,
                      { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                    ]}>
                    8 கேள்விகள் காண்க ›
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  Typography.h2,
                  styles.articleTitle,
                  {
                    color: colors.text,
                    fontSize: 18 * fontScaleMultiplier,
                    lineHeight: 26 * fontScaleMultiplier,
                  },
                ]}>
                {weekendData.watchtowerStudy.articleTitle}
              </Text>
              <View style={[styles.themeBox, { backgroundColor: colors.surfaceSubtle }]}>
                <Text
                  style={[
                    styles.themeScriptureText,
                    { color: colors.primary, fontSize: 13 * fontScaleMultiplier },
                  ]}>
                  {weekendData.watchtowerStudy.themeScripture}
                </Text>
              </View>
            </AppCard>

            {/* Paragraphs List */}
            {weekendData.watchtowerStudy.paragraphs.map(para => {
              const isSampleOpen = Boolean(expandedSampleAnswers[para.paragraphNumber]);
              return (
                <AppCard
                  key={para.paragraphNumber}
                  padding="md"
                  style={styles.paragraphCard}>
                  {para.subheading && (
                    <Text
                      style={[
                        Typography.micro,
                        styles.subheadingText,
                        { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                      ]}>
                      {para.subheading}
                    </Text>
                  )}

                  <View style={styles.paraTopRow}>
                    <View style={[styles.paraNumberBadge, { backgroundColor: colors.primarySurface }]}>
                      <Text
                        style={[
                          styles.paraNumberText,
                          { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                        ]}>
                        பாரா {para.paragraphNumber}
                      </Text>
                    </View>

                    {para.scripture && (
                      <View style={styles.paraScripturePill}>
                        <Ionicons name="book-outline" size={12} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.paraScriptureText,
                            { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
                          ]}>
                          {para.scripture}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleOpenQuestionDetail(para.paragraphNumber)}>
                    <Text
                      style={[
                        Typography.bodyBold,
                        styles.paraQuestion,
                        {
                          color: colors.text,
                          fontSize: 14 * fontScaleMultiplier,
                          lineHeight: 22 * fontScaleMultiplier,
                        },
                      ]}>
                      {para.question}
                    </Text>
                  </TouchableOpacity>

                  {/* Sample Answer Toggle */}
                  {para.sampleAnswer && (
                    <View style={styles.sampleSection}>
                      <TouchableOpacity
                        onPress={() => toggleSampleAnswer(para.paragraphNumber)}
                        style={styles.sampleToggleBtn}>
                        <Ionicons
                          name={isSampleOpen ? 'chevron-up-circle' : 'bulb-outline'}
                          size={15}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.sampleToggleText,
                            { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                          ]}>
                          {isSampleOpen ? 'மாதிரி குறிப்பை மறைக்க' : 'மாதிரி குறிப்பை பார்க்க'}
                        </Text>
                      </TouchableOpacity>

                      {isSampleOpen && (
                        <View
                          style={[
                            styles.sampleAnswerBox,
                            { backgroundColor: colors.surfaceSubtle },
                          ]}>
                          <Text
                            style={[
                              Typography.body,
                              styles.sampleAnswerText,
                              {
                                color: colors.textSecondary,
                                fontSize: 13 * fontScaleMultiplier,
                                lineHeight: 20 * fontScaleMultiplier,
                              },
                            ]}>
                            {para.sampleAnswer}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Comment prep button and Detail link */}
                  <View style={[styles.paraActionFooter, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      onPress={() => handleOpenQuestionDetail(para.paragraphNumber)}
                      style={[styles.readDetailBtn, { backgroundColor: colors.surfaceSubtle }]}>
                      <Ionicons name="reader-outline" size={13} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.readDetailBtnText,
                          { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
                        ]}>
                        பாரா வாசிக்க & வசனங்கள்
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        handleOpenAddAnswer({
                          sectionLabel: 'காவற்கோபுர படிப்பு',
                          itemReference: `பாரா ${para.paragraphNumber}`,
                          question: para.question,
                          scripture: para.scripture,
                        })
                      }
                      style={[styles.writeAnswerBtn, { backgroundColor: colors.primarySurface }]}
                      activeOpacity={0.7}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={13}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.writeAnswerBtnText,
                          { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                        ]}>
                        பதில் எழுத
                      </Text>
                    </TouchableOpacity>
                  </View>
                </AppCard>
              );
            })}

            {/* Concluding Song & Prayer */}
            <AppCard variant="outlined" padding="sm" style={styles.songCard}>
              <View style={styles.songRow}>
                <AppBadge label="முடிவு" type="song" size="sm" />
                <Text
                  style={[
                    Typography.caption,
                    styles.songText,
                    { color: colors.text, fontSize: 13 * fontScaleMultiplier },
                  ]}>
                  பாடல் {weekendData.watchtowerStudy.concludingSong.number}:{' '}
                  {weekendData.watchtowerStudy.concludingSong.title}
                </Text>
                <Text
                  style={[
                    styles.prayerText,
                    { color: colors.textMuted, fontSize: 11 * fontScaleMultiplier },
                  ]}>
                  முடிவு ஜெபம்
                </Text>
              </View>
            </AppCard>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.huge + 24,
  },
  bannerCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionWrap: {
    marginTop: Spacing.xs,
  },
  songCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  songText: {
    flex: 1,
    fontWeight: '600',
  },
  prayerText: {
    fontStyle: 'italic',
  },
  publicTalkCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  talkBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
  },
  speakerName: {
    fontWeight: '600',
  },
  talkTitle: {
    marginBottom: 4,
  },
  congregationText: {
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  scriptureListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  scripturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 4,
  },
  scripturePillText: {
    fontWeight: '600',
  },
  talkSummary: {
    marginBottom: Spacing.md,
  },
  talkActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
  },
  sectionBtnText: {
    fontWeight: '600',
  },
  noteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 6,
  },
  noteButtonText: {
    fontWeight: '600',
  },
  articleHeroCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  articleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allQuestionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allQuestionsBadgeText: {
    fontWeight: '700',
  },
  articleTitle: {
    marginTop: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  themeBox: {
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  themeScriptureText: {
    fontWeight: '600',
    fontStyle: 'italic',
  },
  paragraphCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  subheadingText: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  paraTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
  },
  paraNumberBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  paraNumberText: {
    fontWeight: '700',
  },
  paraScripturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paraScriptureText: {
    fontWeight: '500',
  },
  paraQuestion: {
    marginBottom: Spacing.sm,
  },
  sampleSection: {
    marginBottom: Spacing.sm,
  },
  sampleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  sampleToggleText: {
    fontWeight: '600',
  },
  sampleAnswerBox: {
    marginTop: Spacing.xs + 2,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  sampleAnswerText: {
    fontStyle: 'italic',
  },
  paraActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  readDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 4,
  },
  readDetailBtnText: {
    fontWeight: '600',
  },
  writeAnswerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 4,
  },
  writeAnswerBtnText: {
    fontWeight: '600',
  },
});
