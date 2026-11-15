import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AppCard } from '@/components/AppCard';
import { AppBadge } from '@/components/AppBadge';
import { AppButton } from '@/components/AppButton';
import { answerService } from '@/services/answerService';
import { AnswerPresentation } from '@/types/answer';
import { Spacing, Typography, Radius, Palette } from '@/constants/theme';

type PresentationMode = 'short' | 'detailed' | 'both';

export default function AnswerDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ questionId: string; forceError?: string }>();
  const { colors, fontScaleMultiplier, savedAnswers, addAnswer, deleteAnswer } = useApp();

  const [loading, setLoading] = useState<boolean>(true);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<AnswerPresentation | null>(null);
  const [displayMode, setDisplayMode] = useState<PresentationMode>('short');

  const questionId = params.questionId || 'wt-q-1';

  // Load answer presentation from mock service
  const fetchPresentation = useCallback(async (simulateError: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await answerService.getAnswerByQuestionId(questionId, simulateError);
      setPresentation(data);
    } catch (err: any) {
      setError(err?.message || 'பதில் விவரங்களை ஏற்றுவதில் பிழை ஏற்பட்டது.');
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    const shouldError = params.forceError === 'true';
    let cancelled = false;

    const run = async () => {
      try {
        const data = await answerService.getAnswerByQuestionId(questionId, shouldError);
        if (!cancelled) {
          setPresentation(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'பதில் விவரங்களை ஏற்றுவதில் பிழை ஏற்பட்டது.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [questionId, params.forceError]);

  // Check if answer is saved in AppContext
  const matchingSavedAnswer = useMemo(() => {
    if (!presentation) return null;
    return savedAnswers.find(
      a =>
        a.question.trim().toLowerCase() === presentation.questionText.trim().toLowerCase() ||
        (a.itemReference && a.itemReference.includes(presentation.questionNumberLabel))
    );
  }, [presentation, savedAnswers]);

  const isSaved = Boolean(matchingSavedAnswer);

  // Handle Answer Regeneration
  const handleRegenerate = async () => {
    if (!presentation) return;
    setRegenerating(true);
    try {
      const updated = await answerService.regenerateAnswer(
        presentation.questionId,
        presentation.activeVariantIndex
      );
      setPresentation(updated);
    } catch {
      Alert.alert('பிழை', 'மாற்று பதில் உருவாக்குவதில் பிழை ஏற்பட்டது.');
    } finally {
      setRegenerating(false);
    }
  };

  // Handle Save / Unsave
  const handleToggleSave = () => {
    if (!presentation) return;

    if (isSaved && matchingSavedAnswer) {
      deleteAnswer(matchingSavedAnswer.id);
      Alert.alert('நீக்கப்பட்டது', 'சேமிக்கப்பட்ட பதில்களிலிருந்து நீக்கப்பட்டது.');
    } else {
      const activeVariant = presentation.variants[presentation.activeVariantIndex];
      const answerContent =
        displayMode === 'detailed'
          ? activeVariant.detailedAnswer
          : activeVariant.shortAnswer;

      addAnswer({
        meetingType: presentation.meetingType,
        sectionLabel: presentation.sectionTitle,
        itemReference: presentation.questionNumberLabel,
        question: presentation.questionText,
        answerText: answerContent,
        scripture:
          presentation.scriptures.length > 0
            ? presentation.scriptures[0].citation
            : undefined,
        isFavorite: true,
      });

      Alert.alert(
        'சேமிக்கப்பட்டது ✓',
        'உங்கள் பதில் குறிப்பு "சேமிக்கப்பட்ட பதில்கள்" பகுதியில் வெற்றிகரமாக சேமிக்கப்பட்டது.',
        [
          { text: 'சரி' },
          {
            text: 'பதில்கள் பகுதிக்குச் செல்க',
            onPress: () => router.push('/saved-answers'),
          },
        ]
      );
    }
  };

  // Safe back navigation for Android
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
    return true;
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  // Copy helpers using expo-clipboard
  const handleCopyShort = async () => {
    if (!presentation) return;
    const active = presentation.variants[presentation.activeVariantIndex];
    try {
      await Clipboard.setStringAsync(active.shortAnswer);
      Alert.alert('நகலெடுக்கப்பட்டது ✓', `சுருக்கமான பதில் நகலெடுக்கப்பட்டது:\n\n"${active.shortAnswer}"`);
    } catch {
      Alert.alert('பிழை', 'நகலெடுக்க முடியவில்லை.');
    }
  };

  const handleCopyDetailed = async () => {
    if (!presentation) return;
    const active = presentation.variants[presentation.activeVariantIndex];
    try {
      await Clipboard.setStringAsync(active.detailedAnswer);
      Alert.alert('நகலெடுக்கப்பட்டது ✓', `விரிவான விளக்கம் நகலெடுக்கப்பட்டது:\n\n"${active.detailedAnswer}"`);
    } catch {
      Alert.alert('பிழை', 'நகலெடுக்க முடியவில்லை.');
    }
  };

  const handleCopyFull = async () => {
    if (!presentation) return;
    const active = presentation.variants[presentation.activeVariantIndex];
    const scrips = presentation.scriptures
      .map(s => `• ${s.citation}: "${s.verseText}"`)
      .join('\n');

    const fullText = `[${presentation.sectionTitle} - ${presentation.questionNumberLabel}]\nகேள்வி: ${presentation.questionText}\n\nசுருக்கமான பதில்:\n${active.shortAnswer}\n\nவிரிவான விளக்கம்:\n${active.detailedAnswer}\n\nவேத வசனங்கள்:\n${scrips}\n\nஆதாரம்: ${presentation.sourceReference}`;

    try {
      await Clipboard.setStringAsync(fullText);
      Alert.alert('முழு விவரம் நகலெடுக்கப்பட்டது ✓', 'கேள்வி, சுருக்கமான பதில், விரிவான விளக்கம் மற்றும் வேத வசனங்கள் கிளிப்போர்டில் நகலெடுக்கப்பட்டன.');
    } catch {
      Alert.alert('பிழை', 'நகலெடுக்க முடியவில்லை.');
    }
  };

  // ================= 1. LOADING STATE =================
  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, 12),
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>பதில் தயாரிப்பு</Text>
        </View>

        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCircle, { backgroundColor: colors.primarySurface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text
            style={[
              Typography.h3,
              styles.loadingTitle,
              { color: colors.text, fontSize: 16 * fontScaleMultiplier },
            ]}>
            ஆவிக்குரிய பதில் தயாரிக்கப்படுகிறது...
          </Text>
          <Text
            style={[
              Typography.caption,
              styles.loadingSubtitle,
              { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
            ]}>
            வேத வசனங்கள் மற்றும் காவற்கோபுர குறிப்புகள் தொகுக்கப்படுகின்றன.
          </Text>
        </View>
      </View>
    );
  }

  // ================= 2. ERROR STATE =================
  if (error || !presentation) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, 12),
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>பதில் விவரம்</Text>
        </View>

        <View style={styles.errorContainer}>
          <View style={[styles.errorCircle, { backgroundColor: Palette.dangerSurface }]}>
            <Ionicons name="alert-circle-outline" size={44} color={Palette.danger} />
          </View>

          <Text
            style={[
              Typography.h2,
              styles.errorTitle,
              { color: colors.text, fontSize: 18 * fontScaleMultiplier },
            ]}>
            பதில் ஏற்றுவதில் பிழை ஏற்பட்டது
          </Text>

          <Text
            style={[
              Typography.body,
              styles.errorDescription,
              { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier },
            ]}>
            {error || 'கோரப்பட்ட கேள்விக்கான பதில் தகவல்கள் கிடைக்கவில்லை.'}
          </Text>

          <AppButton
            title="மீண்டும் முயற்சிக்கவும்"
            icon="reload-outline"
            onPress={() => fetchPresentation(false)}
            style={styles.retryBtn}
          />
        </View>
      </View>
    );
  }

  const activeVariant = presentation.variants[presentation.activeVariantIndex];

  // ================= 3. LOADED PRESENTATION SCREEN =================
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Top Header */}
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
            பதில் தயாரிப்பு
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
            {presentation.questionNumberLabel} • {presentation.sectionTitle}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleToggleSave}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.headerIconBtn, { backgroundColor: isSaved ? colors.primarySurface : colors.surfaceSubtle }]}
            accessibilityLabel={isSaved ? 'சேமிக்கப்பட்டது' : 'சேமிக்க'}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCopyFull}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.headerIconBtn, { backgroundColor: colors.surfaceSubtle }]}
            accessibilityLabel="முழுவதும் நகலெடு">
            <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Question Card */}
        <AppCard variant="elevated" padding="md" style={styles.questionCard}>
          <View style={styles.questionMetaRow}>
            <AppBadge
              label={presentation.questionNumberLabel}
              type={presentation.meetingType === 'midweek' ? 'treasures' : 'watchtower'}
              size="sm"
            />
            <Text
              numberOfLines={1}
              style={[
                Typography.caption,
                styles.partTitleText,
                { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
              ]}>
              {presentation.partTitle}
            </Text>
          </View>

          <Text
            style={[
              Typography.h2,
              styles.questionText,
              {
                color: colors.text,
                fontSize: 17 * fontScaleMultiplier,
                lineHeight: 25 * fontScaleMultiplier,
              },
            ]}>
            {presentation.questionText}
          </Text>
        </AppCard>

        {/* Source Reference Card */}
        <AppCard variant="flat" padding="sm" style={styles.sourceCard}>
          <View style={styles.sourceRow}>
            <View style={[styles.sourceIconBox, { backgroundColor: colors.primarySurface }]}>
              <Ionicons name="newspaper-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.sourceTextWrap}>
              <Text
                style={[
                  Typography.caption,
                  styles.sourceLabel,
                  { color: colors.textMuted, fontSize: 10 * fontScaleMultiplier },
                ]}>
                ஆதார வெளியீடு:
              </Text>
              <Text
                style={[
                  Typography.bodyBold,
                  styles.sourceValue,
                  { color: colors.text, fontSize: 13 * fontScaleMultiplier },
                ]}>
                {presentation.sourceReference}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Presentation Format Switcher */}
        <View style={styles.formatSwitcherRow}>
          <TouchableOpacity
            onPress={() => setDisplayMode('short')}
            style={[
              styles.formatBtn,
              {
                backgroundColor: displayMode === 'short' ? colors.primary : colors.surface,
                borderColor: displayMode === 'short' ? colors.primary : colors.border,
              },
            ]}>
            <Ionicons
              name="flash-outline"
              size={14}
              color={displayMode === 'short' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.formatBtnText,
                {
                  color: displayMode === 'short' ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 12 * fontScaleMultiplier,
                  fontWeight: displayMode === 'short' ? '700' : '500',
                },
              ]}>
              சுருக்கமான பதில் (~30 வினாடி)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDisplayMode('detailed')}
            style={[
              styles.formatBtn,
              {
                backgroundColor: displayMode === 'detailed' ? colors.primary : colors.surface,
                borderColor: displayMode === 'detailed' ? colors.primary : colors.border,
              },
            ]}>
            <Ionicons
              name="document-text-outline"
              size={14}
              color={displayMode === 'detailed' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.formatBtnText,
                {
                  color: displayMode === 'detailed' ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 12 * fontScaleMultiplier,
                  fontWeight: displayMode === 'detailed' ? '700' : '500',
                },
              ]}>
              விரிவான விளக்கம் (~1 நிமி)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDisplayMode('both')}
            style={[
              styles.formatBtnSmall,
              {
                backgroundColor: displayMode === 'both' ? colors.primary : colors.surface,
                borderColor: displayMode === 'both' ? colors.primary : colors.border,
              },
            ]}>
            <Text
              style={[
                styles.formatBtnText,
                {
                  color: displayMode === 'both' ? '#FFFFFF' : colors.textSecondary,
                  fontSize: 11 * fontScaleMultiplier,
                  fontWeight: displayMode === 'both' ? '700' : '500',
                },
              ]}>
              இரண்டும்
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= SHORT ANSWER CARD ================= */}
        {(displayMode === 'short' || displayMode === 'both') && (
          <AppCard variant="elevated" padding="md" style={styles.answerCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.modeIndicator, { backgroundColor: '#16A34A' }]}>
                  <Ionicons name="mic-outline" size={13} color="#FFFFFF" />
                </View>
                <Text
                  style={[
                    Typography.bodyBold,
                    { color: colors.text, fontSize: 14 * fontScaleMultiplier },
                  ]}>
                  சுருக்கமான நேரடி பதில்
                </Text>
                <View style={[styles.durationBadge, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text
                    style={[
                      styles.durationText,
                      { color: colors.textSecondary, fontSize: 10 * fontScaleMultiplier },
                    ]}>
                    30 வினாடி
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCopyShort}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.miniCopyBtn, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons name="copy-outline" size={14} color={colors.primary} />
                <Text
                  style={[
                    styles.miniCopyText,
                    { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                  ]}>
                  நகலெடு
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.quoteBox, { borderLeftColor: '#16A34A', backgroundColor: colors.surfaceSubtle }]}>
              <Text
                style={[
                  Typography.body,
                  styles.answerContentText,
                  {
                    color: colors.text,
                    fontSize: 15 * fontScaleMultiplier,
                    lineHeight: 24 * fontScaleMultiplier,
                  },
                ]}>
                &ldquo;{activeVariant.shortAnswer}&rdquo;
              </Text>
            </View>
          </AppCard>
        )}

        {/* ================= DETAILED ANSWER CARD ================= */}
        {(displayMode === 'detailed' || displayMode === 'both') && (
          <AppCard variant="elevated" padding="md" style={styles.answerCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.modeIndicator, { backgroundColor: colors.primary }]}>
                  <Ionicons name="reader-outline" size={13} color="#FFFFFF" />
                </View>
                <Text
                  style={[
                    Typography.bodyBold,
                    { color: colors.text, fontSize: 14 * fontScaleMultiplier },
                  ]}>
                  விரிவான ஆன்மீக விளக்கம்
                </Text>
                <View style={[styles.durationBadge, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text
                    style={[
                      styles.durationText,
                      { color: colors.textSecondary, fontSize: 10 * fontScaleMultiplier },
                    ]}>
                    60-90 வினாடி
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCopyDetailed}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.miniCopyBtn, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons name="copy-outline" size={14} color={colors.primary} />
                <Text
                  style={[
                    styles.miniCopyText,
                    { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                  ]}>
                  நகலெடு
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.quoteBox, { borderLeftColor: colors.primary, backgroundColor: colors.surfaceSubtle }]}>
              <Text
                style={[
                  Typography.body,
                  styles.answerContentText,
                  {
                    color: colors.text,
                    fontSize: 15 * fontScaleMultiplier,
                    lineHeight: 24 * fontScaleMultiplier,
                  },
                ]}>
                {activeVariant.detailedAnswer}
              </Text>
            </View>

            {/* Key takeaway */}
            {activeVariant.keyApplication && (
              <View style={[styles.keyApplicationBox, { backgroundColor: colors.primarySurface }]}>
                <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                <Text
                  style={[
                    styles.keyApplicationText,
                    { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
                  ]}>
                  முக்கிய குறிப்பு: {activeVariant.keyApplication}
                </Text>
              </View>
            )}
          </AppCard>
        )}

        {/* ================= REGENERATE MOCK ANSWER CARD ================= */}
        <AppCard padding="md" style={styles.regenerateCard}>
          <View style={styles.regenerateHeader}>
            <View>
              <Text
                style={[
                  Typography.bodyBold,
                  { color: colors.text, fontSize: 14 * fontScaleMultiplier },
                ]}>
                மாற்று பார்வையில் பதில்
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
                ]}>
                நடப்பு: {activeVariant.label}
              </Text>
            </View>

            <View style={[styles.variantCountPill, { backgroundColor: colors.primarySurface }]}>
              <Text
                style={[
                  styles.variantCountText,
                  { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                {presentation.activeVariantIndex + 1} / {presentation.variants.length}
              </Text>
            </View>
          </View>

          <AppButton
            title={regenerating ? 'தயாரிக்கப்படுகிறது...' : 'பதிலை மாற்றி அமை (மாற்று கருத்து)'}
            icon={regenerating ? undefined : 'reload-outline'}
            loading={regenerating}
            variant="outline"
            size="sm"
            onPress={handleRegenerate}
            style={{ marginTop: Spacing.sm }}
          />
        </AppCard>

        {/* ================= RELATED SCRIPTURES SECTION ================= */}
        {presentation.scriptures.length > 0 && (
          <View style={styles.scripturesSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="book-outline" size={16} color={colors.primary} />
              <Text
                style={[
                  Typography.h3,
                  styles.sectionHeaderTitle,
                  { color: colors.text, fontSize: 15 * fontScaleMultiplier },
                ]}>
                தொடர்புடைய வேத வசனங்கள் & குறிப்புகள்
              </Text>
            </View>

            {presentation.scriptures.map((scrip, idx) => (
              <AppCard key={idx} padding="md" style={styles.scriptureCard}>
                <View style={styles.scriptureTop}>
                  <View style={styles.citationWrap}>
                    <Ionicons name="bookmark" size={14} color={colors.primary} />
                    <Text
                      style={[
                        Typography.bodyBold,
                        styles.citationText,
                        { color: colors.primary, fontSize: 14 * fontScaleMultiplier },
                      ]}>
                      {scrip.citation}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(
                        'வசனம் நகலெடுக்கப்பட்டது',
                        `"${scrip.verseText}"\n— ${scrip.citation}`
                      )
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[styles.miniCopyBtn, { backgroundColor: colors.surfaceSubtle }]}>
                    <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    Typography.body,
                    styles.verseQuoteText,
                    {
                      color: colors.text,
                      fontSize: 14 * fontScaleMultiplier,
                      lineHeight: 22 * fontScaleMultiplier,
                    },
                  ]}>
                  &ldquo;{scrip.verseText}&rdquo;
                </Text>

                {scrip.howToApply && (
                  <View style={[styles.howToApplyBox, { backgroundColor: colors.surfaceSubtle }]}>
                    <Ionicons name="chatbubbles-outline" size={13} color={colors.primary} />
                    <Text
                      style={[
                        styles.howToApplyText,
                        { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
                      ]}>
                      கூட்டத்தில் பேசுவது எப்படி: {scrip.howToApply}
                    </Text>
                  </View>
                )}
              </AppCard>
            ))}
          </View>
        )}

        {/* Bottom Save Action Button */}
        <View style={styles.saveActionBottom}>
          <AppButton
            title={isSaved ? 'சேமிக்கப்பட்டது ✓ (நீக்க தட்டவும்)' : 'சேமிக்கப்பட்ட பதில்களில் சேர்க்க'}
            variant={isSaved ? 'secondary' : 'primary'}
            icon={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
            onPress={handleToggleSave}
            style={styles.mainSaveBtn}
          />
        </View>
      </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  headerIconBtn: {
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
    paddingBottom: Spacing.huge + 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  loadingCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  loadingTitle: {
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  loadingSubtitle: {
    textAlign: 'center',
    lineHeight: 19,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  errorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: Spacing.xs + 2,
  },
  errorDescription: {
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    minWidth: 180,
  },
  questionCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs + 2,
  },
  partTitleText: {
    fontWeight: '500',
    flex: 1,
  },
  questionText: {
    fontWeight: '700',
  },
  sourceCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sourceIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTextWrap: {
    flex: 1,
  },
  sourceLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sourceValue: {
    marginTop: 1,
  },
  formatSwitcherRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs + 2,
    marginBottom: Spacing.md,
  },
  formatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: Spacing.xs + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 4,
  },
  formatBtnSmall: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatBtnText: {
    textAlign: 'center',
  },
  answerCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  modeIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  durationText: {
    fontWeight: '600',
  },
  miniCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 3,
  },
  miniCopyText: {
    fontWeight: '600',
  },
  quoteBox: {
    borderLeftWidth: 3.5,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 2,
  },
  answerContentText: {
    fontWeight: '400',
  },
  keyApplicationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  keyApplicationText: {
    fontWeight: '600',
    flex: 1,
  },
  regenerateCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  regenerateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  variantCountPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  variantCountText: {
    fontWeight: '700',
  },
  scripturesSection: {
    marginTop: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  sectionHeaderTitle: {
    fontWeight: '700',
  },
  scriptureCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  scriptureTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
  },
  citationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  citationText: {
    fontWeight: '700',
  },
  verseQuoteText: {
    fontStyle: 'italic',
    marginBottom: Spacing.xs + 2,
  },
  howToApplyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    gap: 6,
    marginTop: Spacing.xs,
  },
  howToApplyText: {
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  saveActionBottom: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  mainSaveBtn: {
    width: '100%',
  },
});

