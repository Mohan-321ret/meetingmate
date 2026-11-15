import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { AppCard } from '@/components/AppCard';
import { AnswerCard } from '@/components/AnswerCard';
import { AnswerModal } from '@/components/AnswerModal';
import { EmptyState } from '@/components/EmptyState';
import { FilterPills, FilterOption } from '@/components/FilterPills';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { SavedAnswer } from '@/types';
import { BackendSearchResultItem } from '@/types/api';
import { ALL_QUESTIONS } from '@/data/meetingService';

type MainTab = 'saved' | 'history' | 'knowledge';
type CategoryFilter = 'all' | 'watchtower' | 'treasures' | 'bible_study' | 'favorites';

export default function SavedAnswersScreen() {
  const {
    colors,
    fontScaleMultiplier,
    savedAnswers,
    deleteAnswer,
    toggleFavorite,
    syncSavedAnswers,
    searchHistory,
    refreshHistory,
    deleteHistoryItem,
    clearSearchHistory,
    searchKnowledge,
  } = useApp();

  const [activeTab, setActiveTab] = useState<MainTab>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<SavedAnswer | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Knowledge search state
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [isSearchingKnowledge, setIsSearchingKnowledge] = useState(false);
  const [knowledgeResults, setKnowledgeResults] = useState<BackendSearchResultItem[]>([]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'saved') {
        await syncSavedAnswers();
      } else if (activeTab === 'history') {
        await refreshHistory();
      }
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, syncSavedAnswers, refreshHistory]);

  const handleKnowledgeSearch = async () => {
    const q = knowledgeQuery.trim();
    if (!q) {
      Alert.alert('குறிப்பு', 'தயவுசெய்து தேடல் சொல்லை உள்ளிடவும்.');
      return;
    }
    setIsSearchingKnowledge(true);
    try {
      const res = await searchKnowledge(q, { top_k: 8 });
      setKnowledgeResults(res.results || []);
    } catch (err: any) {
      Alert.alert(
        'தேடலில் பிழை',
        err.tamilMessage || 'வெளியீடுகளில் தேடுவதில் பிழை ஏற்பட்டது. Tailscale இணைப்பை சரிபார்க்கவும்.'
      );
    } finally {
      setIsSearchingKnowledge(false);
    }
  };

  const handleClearAllHistory = () => {
    Alert.alert(
      'தேடல் வரலாற்றை அழிக்கவா?',
      'முந்தைய எல்லா AI தேடல் கேள்விகளும் பதில்களும் நிரந்தரமாக அழிக்கப்படும்.',
      [
        { text: 'ரத்து செய்', style: 'cancel' },
        {
          text: 'அழித்துவிடு',
          style: 'destructive',
          onPress: async () => {
            await clearSearchHistory();
            Alert.alert('வெற்றி', 'தேடல் வரலாறு அழிக்கப்பட்டது.');
          },
        },
      ]
    );
  };

  // Compute filter counts
  const favoritesCount = useMemo(
    () => savedAnswers.filter(a => a.isFavorite).length,
    [savedAnswers]
  );
  const wtCount = useMemo(
    () => savedAnswers.filter(a => a.sectionLabel.includes('காவற்கோபுரம்')).length,
    [savedAnswers]
  );
  const gemsCount = useMemo(
    () => savedAnswers.filter(a => a.sectionLabel.includes('புதையல்கள்')).length,
    [savedAnswers]
  );
  const studyCount = useMemo(
    () => savedAnswers.filter(a => a.sectionLabel.includes('படிப்பு')).length,
    [savedAnswers]
  );

  const filterOptions: FilterOption[] = [
    { id: 'all', label: 'அனைத்தும்', count: savedAnswers.length },
    { id: 'favorites', label: 'முக்கியமானவை ★', count: favoritesCount },
    { id: 'watchtower', label: 'காவற்கோபுரம்', count: wtCount },
    { id: 'treasures', label: 'புதையல்கள்', count: gemsCount },
    { id: 'bible_study', label: 'பைபிள் படிப்பு', count: studyCount },
  ];

  // Filtered and searched list
  const filteredAnswers = useMemo(() => {
    return savedAnswers.filter(ans => {
      // Category filter
      if (selectedFilter === 'favorites' && !ans.isFavorite) return false;
      if (
        selectedFilter === 'watchtower' &&
        !ans.sectionLabel.includes('காவற்கோபுரம்')
      )
        return false;
      if (
        selectedFilter === 'treasures' &&
        !ans.sectionLabel.includes('புதையல்கள்')
      )
        return false;
      if (
        selectedFilter === 'bible_study' &&
        !ans.sectionLabel.includes('படிப்பு')
      )
        return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesText = ans.answerText.toLowerCase().includes(q);
        const matchesQuestion = ans.question.toLowerCase().includes(q);
        const matchesRef = ans.itemReference.toLowerCase().includes(q);
        const matchesSection = ans.sectionLabel.toLowerCase().includes(q);
        const matchesScripture =
          ans.scripture && ans.scripture.toLowerCase().includes(q);
        return (
          matchesText ||
          matchesQuestion ||
          matchesRef ||
          matchesSection ||
          Boolean(matchesScripture)
        );
      }

      return true;
    });
  }, [savedAnswers, selectedFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingAnswer(null);
    setModalVisible(true);
  };

  const handleEdit = (answer: SavedAnswer) => {
    setEditingAnswer(answer);
    setModalVisible(true);
  };

  const handleViewDetail = (answer: SavedAnswer) => {
    const matched = ALL_QUESTIONS.find(
      q =>
        q.questionText.trim().toLowerCase() === answer.question.trim().toLowerCase() ||
        (q.questionNumberLabel &&
          answer.itemReference &&
          answer.itemReference.includes(q.questionNumberLabel))
    );
    const qId = matched ? matched.id : 'wt-q-1';
    router.push({
      pathname: '/answer-detail',
      params: { questionId: qId },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="பதில்கள் & ஆராய்ச்சி"
        subtitle="கூட்டங்களுக்கான தயாரிப்பு குறிப்புகள் & தேடல்"
        tag={
          activeTab === 'saved'
            ? `${savedAnswers.length} பதில்கள்`
            : activeTab === 'history'
            ? `${searchHistory.length} கேள்விகள்`
            : 'வெளியீடுகள்'
        }
        rightAction={
          activeTab === 'saved'
            ? {
                icon: 'add',
                onPress: handleOpenAdd,
                accessibilityLabel: 'புதிய பதில் சேர்க்க',
              }
            : activeTab === 'history' && searchHistory.length > 0
            ? {
                icon: 'trash-outline',
                onPress: handleClearAllHistory,
                accessibilityLabel: 'வரலாற்றை அழிக்க',
              }
            : undefined
        }
      />

      {/* Top Segmented Tab Switcher */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('saved')}
          style={[
            styles.segmentBtn,
            activeTab === 'saved' && [styles.segmentBtnActive, { borderBottomColor: colors.primary }],
          ]}>
          <Ionicons
            name="bookmark"
            size={16}
            color={activeTab === 'saved' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: activeTab === 'saved' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'saved' ? '700' : '500',
                fontSize: 13 * fontScaleMultiplier,
              },
            ]}>
            சேமித்தவை ({savedAnswers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={[
            styles.segmentBtn,
            activeTab === 'history' && [styles.segmentBtnActive, { borderBottomColor: colors.primary }],
          ]}>
          <Ionicons
            name="time"
            size={16}
            color={activeTab === 'history' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: activeTab === 'history' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'history' ? '700' : '500',
                fontSize: 13 * fontScaleMultiplier,
              },
            ]}>
            வரலாறு ({searchHistory.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('knowledge')}
          style={[
            styles.segmentBtn,
            activeTab === 'knowledge' && [styles.segmentBtnActive, { borderBottomColor: colors.primary }],
          ]}>
          <Ionicons
            name="library"
            size={16}
            color={activeTab === 'knowledge' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              {
                color: activeTab === 'knowledge' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'knowledge' ? '700' : '500',
                fontSize: 13 * fontScaleMultiplier,
              },
            ]}>
            வெளியீடுகள்
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= TAB 1: SAVED ANSWERS ================= */}
      {activeTab === 'saved' && (
        <>
          {/* Search Input Bar */}
          <View style={[styles.searchBarWrap, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.searchInputContainer,
                { backgroundColor: colors.surfaceSubtle },
              ]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="பதில்கள், கேள்விகள், வசனங்களை தேடுக..."
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.searchInput,
                  {
                    color: colors.text,
                    fontSize: 14 * fontScaleMultiplier,
                  },
                ]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Category Pills */}
          <View style={{ marginTop: Spacing.sm }}>
            <FilterPills
              options={filterOptions}
              selectedId={selectedFilter}
              onSelect={id => setSelectedFilter(id as CategoryFilter)}
            />
          </View>

          {/* List of Saved Answers */}
          <FlatList
            data={filteredAnswers}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <AnswerCard
                answer={item}
                onEdit={handleEdit}
                onDelete={deleteAnswer}
                onToggleFavorite={toggleFavorite}
                onViewDetail={handleViewDetail}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              filteredAnswers.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title={
                  searchQuery
                    ? 'பொருத்தமான பதில்கள் இல்லை'
                    : 'பதில்கள் எதுவும் இல்லை'
                }
                description={
                  searchQuery
                    ? `"${searchQuery}" என்ற தேடலுக்கு பதில்கள் எதுவும் கிடைக்கவில்லை.`
                    : 'கூட்டங்களில் உற்சாகமாக பதிலளிக்க நீங்கள் தயாரித்த குறிப்புகளை இங்கே சேமிக்கலாம்.'
                }
                buttonTitle="புதிய பதில் குறிப்பு சேர்க்க"
                onButtonPress={handleOpenAdd}
              />
            }
          />

          {/* Floating Action Button (FAB) */}
          <TouchableOpacity
            onPress={handleOpenAdd}
            style={[styles.fab, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            accessibilityLabel="புதிய பதில் எழுதுக">
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}

      {/* ================= TAB 2: SEARCH HISTORY ================= */}
      {activeTab === 'history' && (
        <FlatList
          data={searchHistory}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            searchHistory.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="தேடல் வரலாறு காலியாக உள்ளது"
              description="நீங்கள் கேட்கும் AI கேள்விகளும் அதற்கான பதில்களும் இங்கு தானாக பதிவு செய்யப்படும்."
            />
          }
          renderItem={({ item }) => (
            <AppCard padding="md" style={styles.historyCard}>
              <View style={styles.historyHeaderRow}>
                <View style={[styles.historyTypeBadge, { backgroundColor: colors.primarySurface }]}>
                  <Text
                    style={[
                      styles.historyTypeText,
                      { color: colors.primary, fontSize: 10 * fontScaleMultiplier },
                    ]}>
                    {item.answer_type === 'detailed' ? 'விரிவானது' : 'சுருக்கமானது'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => deleteHistoryItem(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  Typography.bodyBold,
                  styles.historyQuery,
                  { color: colors.text, fontSize: 14 * fontScaleMultiplier },
                ]}>
                {item.query}
              </Text>

              <Text
                numberOfLines={3}
                style={[
                  Typography.caption,
                  styles.historyAnswer,
                  { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier, lineHeight: 18 * fontScaleMultiplier },
                ]}>
                {item.answer}
              </Text>

              {item.sources && item.sources.length > 0 && (
                <View style={styles.historySourcesRow}>
                  <Ionicons name="book-outline" size={12} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={[
                      Typography.caption,
                      { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                    ]}>
                    {item.sources[0]?.source_title}
                  </Text>
                </View>
              )}
            </AppCard>
          )}
        />
      )}

      {/* ================= TAB 3: KNOWLEDGE SEARCH ================= */}
      {activeTab === 'knowledge' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBarWrap, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.searchInputContainer,
                { backgroundColor: colors.surfaceSubtle },
              ]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                value={knowledgeQuery}
                onChangeText={setKnowledgeQuery}
                placeholder="சபை வெளியீடுகளில் தேட (எ.கா. ஜெபம், அன்பு)..."
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={handleKnowledgeSearch}
                returnKeyType="search"
                style={[
                  styles.searchInput,
                  {
                    color: colors.text,
                    fontSize: 14 * fontScaleMultiplier,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleKnowledgeSearch}
                style={[styles.knowledgeSearchBtn, { backgroundColor: colors.primary }]}>
                {isSearchingKnowledge ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.knowledgeSearchBtnText}>தேடுக</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={knowledgeResults}
            keyExtractor={(item, idx) => item.chunk_id || `res-${idx}`}
            contentContainerStyle={[
              styles.listContent,
              knowledgeResults.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="library-outline"
                title={
                  knowledgeQuery && !isSearchingKnowledge
                    ? 'முடிவுகள் எதுவும் இல்லை'
                    : 'நம்பகமான வெளியீடுகள் தேடல்'
                }
                description={
                  knowledgeQuery && !isSearchingKnowledge
                    ? `"${knowledgeQuery}" என்ற தலைப்பில் எந்த வெளியீட்டுக் குறிப்பும் கிடைக்கவில்லை.`
                    : 'ChromaDB-ல் உள்ள காவற்கோபுரம், விழிப்பு மற்றும் கூட்ட பணிப்புத்தக கட்டுரைகளை நேரடியாக ஆராயலாம்.'
                }
              />
            }
            renderItem={({ item }) => (
              <AppCard padding="md" style={styles.knowledgeResultCard}>
                <View style={styles.knowledgeResultHeader}>
                  <Text
                    style={[
                      Typography.bodyBold,
                      { color: colors.primary, fontSize: 13 * fontScaleMultiplier, flex: 1 },
                    ]}>
                    {item.source_title}
                  </Text>
                  <View style={[styles.scoreBadge, { backgroundColor: colors.primarySurface }]}>
                    <Text
                      style={[
                        styles.scoreText,
                        { color: colors.primary, fontSize: 10 * fontScaleMultiplier },
                      ]}>
                      பொருத்தம் {Math.round(item.relevance_score * 100)}%
                    </Text>
                  </View>
                </View>

                {item.paragraph_reference && (
                  <Text
                    style={[
                      Typography.caption,
                      { color: colors.textMuted, fontSize: 11 * fontScaleMultiplier, marginBottom: 4 },
                    ]}>
                    குறிப்பு: {item.paragraph_reference}
                  </Text>
                )}

                <Text
                  style={[
                    Typography.body,
                    styles.knowledgeSnippet,
                    { color: colors.text, fontSize: 13 * fontScaleMultiplier, lineHeight: 20 * fontScaleMultiplier },
                  ]}>
                  {item.content}
                </Text>
              </AppCard>
            )}
          />
        </View>
      )}

      {/* Add / Edit Answer Modal */}
      <AnswerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialData={editingAnswer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentBtnActive: {},
  segmentText: {
    letterSpacing: 0.1,
  },
  searchBarWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.huge + 60,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg + 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  historyCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  historyTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  historyTypeText: {
    fontWeight: '700',
  },
  historyQuery: {
    marginBottom: 4,
  },
  historyAnswer: {
    marginBottom: Spacing.xs,
  },
  historySourcesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  knowledgeSearchBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  knowledgeSearchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  knowledgeResultCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  knowledgeResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 8,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  scoreText: {
    fontWeight: '700',
  },
  knowledgeSnippet: {
    marginTop: 2,
  },
});
