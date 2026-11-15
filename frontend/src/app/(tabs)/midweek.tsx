import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { MeetingItemCard } from '@/components/MeetingItemCard';
import { AnswerModal } from '@/components/AnswerModal';
import { Spacing, Typography, Palette } from '@/constants/theme';
import { SavedAnswer } from '@/types';
import { MIDWEEK_QUESTIONS } from '@/data/midweekBrowseData';

type SectionFilter = 'all' | 'treasures' | 'ministry' | 'living';

export default function MidweekMeetingScreen() {
  const { colors, fontScaleMultiplier, midweekData, refreshMeetings } = useApp();
  const [selectedSection, setSelectedSection] = useState<SectionFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<Partial<SavedAnswer> | null>(null);
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
    { id: 'all', label: 'அனைத்தும்' },
    { id: 'treasures', label: 'புதையல்கள்', count: midweekData.treasures.length },
    { id: 'ministry', label: 'ஊழியம்', count: midweekData.ministry.length },
    { id: 'living', label: 'கிறிஸ்தவ வாழ்க்கை', count: midweekData.living.length },
  ];

  const handleOpenAddAnswer = (prefill: {
    sectionLabel: string;
    itemReference: string;
    question?: string;
  }) => {
    setModalPrefill({
      meetingType: 'midweek',
      sectionLabel: prefill.sectionLabel,
      itemReference: prefill.itemReference,
      question: prefill.question || '',
    });
    setModalVisible(true);
  };

  const handleOpenQuestionDetail = (questionText: string, sectionId: string) => {
    const matched = MIDWEEK_QUESTIONS.find(
      q => q.questionText.trim().toLowerCase() === questionText.trim().toLowerCase()
    );
    const targetId = matched ? matched.id : 'mid-treasures-q1';
    router.push({
      pathname: '/question-detail',
      params: { questionId: targetId },
    });
  };

  const showTreasures = selectedSection === 'all' || selectedSection === 'treasures';
  const showMinistry = selectedSection === 'all' || selectedSection === 'ministry';
  const showLiving = selectedSection === 'all' || selectedSection === 'living';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="நடுவாரக் கூட்டம்"
        subtitle={`${midweekData.weekDateRange} • ${midweekData.bibleReadingRange}`}
        tag="வாழ்க்கையும் ஊழியமும்"
        rightAction={{
          icon: 'add-circle-outline',
          onPress: () =>
            handleOpenAddAnswer({
              sectionLabel: 'ஆன்மீகப் புதையல்கள்',
              itemReference: midweekData.bibleReadingRange,
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
        {/* Week Info Banner */}
        <AppCard variant="flat" padding="md" style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerIconWrap}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text
                style={[
                  Typography.caption,
                  { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
                ]}>
                வாரம்: {midweekData.weekDateRange}
              </Text>
              <Text
                style={[
                  Typography.bodyBold,
                  { color: colors.text, fontSize: 15 * fontScaleMultiplier },
                ]}>
                பைபிள் வாசிப்பு: {midweekData.bibleReadingRange}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Section Filter Pills */}
        <FilterPills
          options={filterOptions}
          selectedId={selectedSection}
          onSelect={id => setSelectedSection(id as SectionFilter)}
        />

        {/* Opening Song & Prayer */}
        {(selectedSection === 'all' || selectedSection === 'treasures') && (
          <AppCard variant="outlined" padding="sm" style={styles.songCard}>
            <View style={styles.songRow}>
              <AppBadge label="பாடல்" type="song" size="sm" />
              <Text
                style={[
                  Typography.caption,
                  styles.songText,
                  { color: colors.text, fontSize: 13 * fontScaleMultiplier },
                ]}>
                பாடல் {midweekData.openingSong.number}: {midweekData.openingSong.title}
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
        )}

        {/* SECTION 1: TREASURES */}
        {showTreasures && (
          <View style={styles.sectionBlock}>
            <SectionHeader
              title="கடவுளுடைய வார்த்தையிலுள்ள புதையல்கள்"
              subtitle="10:00 - 10:45 • ஆழமான வசன ஆய்வு மற்றும் முத்துக்கள்"
              accentColor={Palette.treasures}
              icon="diamond-outline"
              actionLabel="கேள்விகள் ›"
              onPress={() =>
                router.push({
                  pathname: '/meeting-section',
                  params: { sectionId: 'treasures' },
                })
              }
            />
            {midweekData.treasures.map(item => (
              <MeetingItemCard
                key={item.id}
                item={item}
                onAddAnswer={handleOpenAddAnswer}
                onOpenQuestionDetail={q => handleOpenQuestionDetail(q, 'treasures')}
                onViewSectionDetail={() =>
                  router.push({
                    pathname: '/meeting-section',
                    params: { sectionId: 'treasures' },
                  })
                }
              />
            ))}
          </View>
        )}

        {/* SECTION 2: MINISTRY */}
        {showMinistry && (
          <View style={styles.sectionBlock}>
            <SectionHeader
              title="ஊழியத்தில் திறமையை அதிகரியுங்கள்"
              subtitle="10:45 - 11:00 • நற்செய்தி அறிவிப்பதில் வளர்ச்சி"
              accentColor={Palette.ministry}
              icon="people-outline"
              actionLabel="கேள்விகள் ›"
              onPress={() =>
                router.push({
                  pathname: '/meeting-section',
                  params: { sectionId: 'ministry' },
                })
              }
            />
            {midweekData.ministry.map(item => (
              <MeetingItemCard
                key={item.id}
                item={item}
                onAddAnswer={handleOpenAddAnswer}
                onOpenQuestionDetail={q => handleOpenQuestionDetail(q, 'ministry')}
                onViewSectionDetail={() =>
                  router.push({
                    pathname: '/meeting-section',
                    params: { sectionId: 'ministry' },
                  })
                }
              />
            ))}
          </View>
        )}

        {/* SECTION 3: LIVING AS CHRISTIANS */}
        {showLiving && (
          <View style={styles.sectionBlock}>
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
                  பாடல் {midweekData.livingSong.number}: {midweekData.livingSong.title}
                </Text>
              </View>
            </AppCard>

            <SectionHeader
              title="கிறிஸ்தவ வாழ்க்கை"
              subtitle="11:05 - 11:45 • விசுவாசத்தை செயலில் காட்டுதல்"
              accentColor={Palette.living}
              icon="heart-outline"
              actionLabel="கேள்விகள் ›"
              onPress={() =>
                router.push({
                  pathname: '/meeting-section',
                  params: { sectionId: 'living' },
                })
              }
            />
            {midweekData.living.map(item => (
              <MeetingItemCard
                key={item.id}
                item={item}
                onAddAnswer={handleOpenAddAnswer}
                onOpenQuestionDetail={q => handleOpenQuestionDetail(q, 'living')}
                onViewSectionDetail={() =>
                  router.push({
                    pathname: '/meeting-section',
                    params: { sectionId: 'living' },
                  })
                }
              />
            ))}

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
                  பாடல் {midweekData.concludingSong.number}: {midweekData.concludingSong.title}
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
  bannerIconWrap: {
    marginRight: Spacing.md,
  },
  bannerTextWrap: {
    flex: 1,
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
  sectionBlock: {
    marginTop: Spacing.xs,
  },
});
