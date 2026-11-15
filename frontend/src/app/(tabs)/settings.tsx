import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { AppCard } from '@/components/AppCard';
import { AppButton } from '@/components/AppButton';
import { Spacing, Typography, Radius } from '@/constants/theme';
import { ThemePreference, FontScalePreference, LanguagePreference } from '@/types';

import { DEFAULT_API_URL } from '@/services/api/apiClient';

export default function SettingsScreen() {
  const {
    colors,
    fontScaleMultiplier,
    settings,
    updateSettings,
    savedAnswers,
    recentQuestions,
    clearRecentQuestions,
    clearAllData,
    isBackendOnline,
    backendLatencyMs,
    backendError,
    testBackendConnection,
    syncSavedAnswers,
    refreshMeetings,
  } = useApp();

  const [congregationName, setCongregationName] = useState(settings.congregationName);
  const [midweekSchedule, setMidweekSchedule] = useState(settings.midweekSchedule);
  const [weekendSchedule, setWeekendSchedule] = useState(settings.weekendSchedule);
  const [apiUrl, setApiUrl] = useState(settings.apiUrl || DEFAULT_API_URL);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestMessage(null);
    try {
      const result = await testBackendConnection();
      if (result.isOnline) {
        setTestMessage(`இணைக்கப்பட்டது (${result.latencyMs} ms) ✓`);
        Alert.alert(
          'இணைப்பு வெற்றி',
          `Tailscale பிரைவேட் சர்வர் வெற்றிகரமாக இணைக்கப்பட்டுள்ளது.\nமறுமொழி நேரம்: ${result.latencyMs} ms`
        );
      } else {
        setTestMessage('இணைக்க முடியவில்லை ✗');
        Alert.alert(
          'இணைப்பு தோல்வி',
          result.error ||
            'Tailscale சர்வரை அணுக முடியவில்லை. VPN இயங்குகிறதா மற்றும் IP முகவரி சரியானதா என்பதை உறுதிப்படுத்தவும்.'
        );
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveApiUrl = () => {
    const trimmed = apiUrl.trim();
    if (!trimmed) {
      Alert.alert('பிழை', 'சரியான சர்வர் URL முகவரியை உள்ளிடவும்.');
      return;
    }
    updateSettings({ apiUrl: trimmed });
    Alert.alert('சேமிக்கப்பட்டது', 'சர்வர் URL சேமிக்கப்பட்டது. இணைப்பு சோதிக்கப்படுகிறது...');
    handleTestConnection();
  };

  const handleSyncBackend = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([syncSavedAnswers(), refreshMeetings()]);
      Alert.alert(
        'வெற்றி',
        'கூட்டங்கள் மற்றும் சேமிக்கப்பட்ட பதில்கள் சர்வரிலிருந்து வெற்றிகரமாக ஒத்திசைக்கப்பட்டன.'
      );
    } catch {
      Alert.alert('பிழை', 'சர்வர் ஒத்திசைவில் பிழை ஏற்பட்டது.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCongregationInfo = () => {
    updateSettings({
      congregationName: congregationName.trim() || 'என் சபை',
      midweekSchedule: midweekSchedule.trim() || 'வியாழன் மாலை 7:00',
      weekendSchedule: weekendSchedule.trim() || 'ஞாயிறு காலை 10:00',
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    Alert.alert('வெற்றி', 'சபை விவரங்கள் உள்ளூர் சேமிப்பகத்தில் வெற்றிகரமாக சேமிக்கப்பட்டன.');
  };

  const handleClearRecents = () => {
    Alert.alert(
      'வரலாற்றை அழிக்கவா?',
      'அண்மையில் பார்த்த கேள்விகளின் பட்டியலை நிச்சயமாக அழிக்க விரும்புகிறீர்களா?',
      [
        { text: 'ரத்து செய்', style: 'cancel' },
        {
          text: 'அழித்துவிடு',
          style: 'destructive',
          onPress: () => {
            clearRecentQuestions();
            Alert.alert('அழிக்கப்பட்டது', 'அண்மையில் பார்த்த கேள்விகள் அழிக்கப்பட்டன.');
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'எல்லா தரவுகளையும் அழிக்கவா?',
      'சேமிக்கப்பட்ட எல்லா பதில்களும் மற்றும் தனிப்பயன் அமைப்புகளும் அழிக்கப்பட்டு ஆரம்ப நிலைக்கு திரும்பும். இதனை திரும்பப் பெற முடியாது.',
      [
        { text: 'ரத்து செய்', style: 'cancel' },
        {
          text: 'ஆம், அனைத்தையும் அழி',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            setCongregationName('சென்னை மத்திய சபை');
            setMidweekSchedule('வியாழக்கிழமை மாலை 7:00');
            setWeekendSchedule('ஞாயிற்றுக்கிழமை காலை 10:00');
            Alert.alert('வெற்றி', 'உள்ளூர் சேமிப்பகம் வெற்றிகரமாக அழிக்கப்பட்டது.');
          },
        },
      ]
    );
  };

  const themeOptions: { id: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'system', label: 'சாதனம்', icon: 'phone-portrait-outline' },
    { id: 'light', label: 'ஒளி முறை', icon: 'sunny-outline' },
    { id: 'dark', label: 'இருள் முறை', icon: 'moon-outline' },
  ];

  const fontOptions: { id: FontScalePreference; label: string; scale: string }[] = [
    { id: 'normal', label: 'இயல்பானது', scale: '100%' },
    { id: 'large', label: 'பெரியது', scale: '115%' },
    { id: 'extraLarge', label: 'கூடுதல் பெரியது', scale: '130%' },
  ];

  const languageOptions: { id: LanguagePreference; label: string; desc: string }[] = [
    { id: 'tamil_only', label: 'முழுமையான தமிழ்', desc: 'தூய தமிழ் இடைமுகம் மற்றும் தலைப்புகள்' },
    { id: 'tamil_english', label: 'தமிழ் + ஆங்கிலம்', desc: 'தமிழ் முதன்மை மற்றும் ஆங்கில துணைத் தலைப்புகள்' },
  ];

  const favoritesCount = savedAnswers.filter(a => a.isFavorite).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="அமைப்புகள்"
        subtitle="தனிப்பயனாக்கம் மற்றும் உள்ளூர் சேமிப்பகம்"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ================= THEME PREFERENCE ================= */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
          <Text
            style={[
              Typography.h3,
              styles.sectionTitle,
              { color: colors.text, fontSize: Typography.h3.fontSize * fontScaleMultiplier },
            ]}>
            தோற்றம் (Theme)
          </Text>
        </View>

        <AppCard padding="md" style={styles.card}>
          <View style={styles.optionsRow}>
            {themeOptions.map(opt => {
              const isSelected = settings.theme === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => updateSettings({ theme: opt.id })}
                  style={[
                    styles.themeOptionBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primarySurface
                        : colors.surfaceSubtle,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}>
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                        fontSize: 12 * fontScaleMultiplier,
                      },
                    ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </AppCard>

        {/* ================= LANGUAGE PREFERENCE ================= */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="language-outline" size={18} color={colors.primary} />
          <Text
            style={[
              Typography.h3,
              styles.sectionTitle,
              { color: colors.text, fontSize: Typography.h3.fontSize * fontScaleMultiplier },
            ]}>
            மொழி நடை (Language Mode)
          </Text>
        </View>

        <AppCard padding="md" style={styles.card}>
          {languageOptions.map(lOpt => {
            const isSelected = settings.language === lOpt.id;
            return (
              <TouchableOpacity
                key={lOpt.id}
                onPress={() => updateSettings({ language: lOpt.id })}
                style={[
                  styles.languageOptionRow,
                  {
                    backgroundColor: isSelected ? colors.primarySurface : colors.surfaceSubtle,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}>
                <View style={[styles.radioCircle, { borderColor: isSelected ? colors.primary : colors.textMuted }]}>
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={styles.languageTextWrap}>
                  <Text
                    style={[
                      styles.languageLabel,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontSize: 14 * fontScaleMultiplier,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}>
                    {lOpt.label}
                  </Text>
                  <Text
                    style={[
                      styles.languageDesc,
                      {
                        color: colors.textSecondary,
                        fontSize: 12 * fontScaleMultiplier,
                      },
                    ]}>
                    {lOpt.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </AppCard>

        {/* ================= FONT SCALE PREFERENCE ================= */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="text-outline" size={18} color={colors.primary} />
          <Text
            style={[
              Typography.h3,
              styles.sectionTitle,
              { color: colors.text, fontSize: Typography.h3.fontSize * fontScaleMultiplier },
            ]}>
            எழுத்து அளவு (Font Size)
          </Text>
        </View>

        <AppCard padding="md" style={styles.card}>
          <Text
            style={[
              Typography.caption,
              styles.helperText,
              { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
            ]}>
            கூட்டங்களில் வசதியாக வாசிப்பதற்கு ஏற்ப தமிழ் எழுத்துக்களின் அளவை மாற்றலாம்:
          </Text>

          <View style={styles.optionsRow}>
            {fontOptions.map(opt => {
              const isSelected = settings.fontScale === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => updateSettings({ fontScale: opt.id })}
                  style={[
                    styles.themeOptionBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primarySurface
                        : colors.surfaceSubtle,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.fontScalePreview,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontSize: opt.id === 'extraLarge' ? 20 : opt.id === 'large' ? 17 : 14,
                      },
                    ]}>
                    அ
                  </Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                        fontSize: 11 * fontScaleMultiplier,
                      },
                    ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Live Preview Box */}
          <View style={[styles.previewBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Text
              style={[
                styles.previewLabel,
                { color: colors.primary, fontSize: 11 * fontScaleMultiplier },
              ]}>
              நேரடி வாசிப்பு மாதிரி:
            </Text>
            <Text
              style={[
                Typography.body,
                {
                  color: colors.text,
                  fontSize: 15 * fontScaleMultiplier,
                  lineHeight: 23 * fontScaleMultiplier,
                },
              ]}>
              &ldquo;உன் பாதைகளுக்கு என் வார்த்தையே தீபம், என் பாதைக்கு வெளிச்சம்.&rdquo; — சங்கீதம் 119:105
            </Text>
          </View>
        </AppCard>

        {/* ================= CONGREGATION DETAILS ================= */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="home-outline" size={18} color={colors.primary} />
          <Text
            style={[
              Typography.h3,
              styles.sectionTitle,
              { color: colors.text, fontSize: Typography.h3.fontSize * fontScaleMultiplier },
            ]}>
            உங்கள் சபை விவரங்கள்
          </Text>
        </View>

        <AppCard padding="md" style={styles.card}>
          <Text
            style={[
              Typography.caption,
              styles.inputLabel,
              { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
            ]}>
            சபையின் பெயர்:
          </Text>
          <TextInput
            value={congregationName}
            onChangeText={setCongregationName}
            placeholder="எ.கா. சென்னை மத்திய சபை"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceSubtle,
                color: colors.text,
                borderColor: colors.border,
                fontSize: 14 * fontScaleMultiplier,
              },
            ]}
          />

          <Text
            style={[
              Typography.caption,
              styles.inputLabel,
              { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
            ]}>
            நடுவாரக் கூட்டம் நாள் & நேரம்:
          </Text>
          <TextInput
            value={midweekSchedule}
            onChangeText={setMidweekSchedule}
            placeholder="எ.கா. வியாழக்கிழமை மாலை 7:00"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceSubtle,
                color: colors.text,
                borderColor: colors.border,
                fontSize: 14 * fontScaleMultiplier,
              },
            ]}
          />

          <Text
            style={[
              Typography.caption,
              styles.inputLabel,
              { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
            ]}>
            வார இறுதி கூட்டம் நாள் & நேரம்:
          </Text>
          <TextInput
            value={weekendSchedule}
            onChangeText={setWeekendSchedule}
            placeholder="எ.கா. ஞாயிற்றுக்கிழமை காலை 10:00"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceSubtle,
                color: colors.text,
                borderColor: colors.border,
                fontSize: 14 * fontScaleMultiplier,
              },
            ]}
          />

          <AppButton
            title={savedSuccess ? 'சேமிக்கப்பட்டது ✓' : 'விவரங்களை சேமிக்க'}
            icon="checkmark-outline"
            onPress={handleSaveCongregationInfo}
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>

        {/* ================= PRIVATE NETWORK & TAILSCALE ================= */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text
            style={[
              Typography.h3,
              styles.sectionTitle,
              { color: colors.text, fontSize: Typography.h3.fontSize * fontScaleMultiplier },
            ]}>
            பிரைவேட் நெட்வொர்க் (Tailscale Server)
          </Text>
        </View>

        <AppCard padding="md" style={styles.card}>
          <View style={styles.backendStatusRow}>
            <View style={styles.backendStatusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      isBackendOnline === true
                        ? '#22C55E'
                        : isBackendOnline === false
                        ? '#EF4444'
                        : '#EAB308',
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      isBackendOnline === true
                        ? '#22C55E'
                        : isBackendOnline === false
                        ? '#EF4444'
                        : colors.textSecondary,
                    fontSize: 13 * fontScaleMultiplier,
                    fontWeight: '600',
                  },
                ]}>
                {isBackendOnline === true
                  ? `இணைக்கப்பட்டுள்ளது • Tailscale (${backendLatencyMs || 0} ms)`
                  : isBackendOnline === false
                  ? 'ஆஃப்லைன் / துண்டிக்கப்பட்டது'
                  : 'இணைப்பு சரிபார்க்கப்படுகிறது...'}
              </Text>
            </View>

            {isBackendOnline === false && backendError && !testMessage && (
              <Text
                style={[
                  Typography.caption,
                  { color: '#EF4444', fontSize: 11 * fontScaleMultiplier, marginTop: 4 },
                ]}>
                {backendError}
              </Text>
            )}

            {testMessage && (
              <Text
                style={[
                  Typography.caption,
                  {
                    color: testMessage.includes('✓') ? '#22C55E' : '#EF4444',
                    fontSize: 11 * fontScaleMultiplier,
                    marginTop: 4,
                  },
                ]}>
                {testMessage}
              </Text>
            )}
          </View>

          <Text
            style={[
              Typography.caption,
              styles.helperText,
              { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
            ]}>
            குடும்ப பயன்பாட்டிற்கான Tailscale பிரைவேட் பேக்கெண்ட் முகவரி (IP / URL):
          </Text>

          <TextInput
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="எ.கா. http://100.x.x.x:8000/api/v1"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceSubtle,
                color: colors.text,
                borderColor: colors.border,
                fontSize: 13 * fontScaleMultiplier,
              },
            ]}
          />

          <View style={styles.networkButtonsRow}>
            <View style={{ flex: 1 }}>
              <AppButton
                title={isTesting ? 'சோதிக்கிறது...' : 'இணைப்பைச் சோதிக்க'}
                variant="outline"
                size="sm"
                icon="radio-outline"
                onPress={handleTestConnection}
                loading={isTesting}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                title="முகவரி சேமிக்க"
                variant="primary"
                size="sm"
                icon="save-outline"
                onPress={handleSaveApiUrl}
              />
            </View>
          </View>

          <AppButton
            title={isSyncing ? 'ஒத்திசைக்கிறது...' : 'சர்வர் தரவை ஒத்திசைக்க (Sync)'}
            variant="outline"
            size="sm"
            icon="sync-outline"
            onPress={handleSyncBackend}
            loading={isSyncing}
            style={{ marginTop: Spacing.sm }}
          />

          <View style={[styles.privacyNotice, { backgroundColor: colors.surfaceSubtle, marginTop: Spacing.sm }]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
            <Text
              style={[
                styles.privacyText,
                { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
              ]}>
              பாதுகாப்பான பிரைவேட் நெட்வொர்க்: உங்கள் வீட்டு சர்வர் Tailscale மூலம் மட்டுமே அணுகப்படுகிறது. இணையத்தில் எங்கும் வெளிப்படையாக பகிரப்படாது.
            </Text>
          </View>
        </AppCard>

        {/* ================= LOCAL STORAGE & DATA MANAGEMENT ================= */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="server-outline" size={18} color={colors.primary} />
          <Text
            style={[
              Typography.h3,
              styles.sectionTitle,
              { color: colors.text, fontSize: Typography.h3.fontSize * fontScaleMultiplier },
            ]}>
            உள்ளூர் சேமிப்பகம் (AsyncStorage)
          </Text>
        </View>

        <AppCard padding="md" style={styles.card}>
          <View style={styles.storageStatsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text
                style={[
                  styles.statNum,
                  { color: colors.primary, fontSize: 18 * fontScaleMultiplier },
                ]}>
                {savedAnswers.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                சேமித்த பதில்கள்
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text
                style={[
                  styles.statNum,
                  { color: '#EAB308', fontSize: 18 * fontScaleMultiplier },
                ]}>
                {favoritesCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                விருப்பமானவை
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text
                style={[
                  styles.statNum,
                  { color: colors.primary, fontSize: 18 * fontScaleMultiplier },
                ]}>
                {recentQuestions.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.textSecondary, fontSize: 11 * fontScaleMultiplier },
                ]}>
                பார்த்தவை
              </Text>
            </View>
          </View>

          {recentQuestions.length > 0 && (
            <AppButton
              title="அண்மையில் பார்த்த கேள்விகளை அழிக்க"
              variant="outline"
              size="sm"
              icon="time-outline"
              onPress={handleClearRecents}
              style={{ marginTop: Spacing.sm }}
            />
          )}

          <AppButton
            title="சேமிக்கப்பட்ட எல்லா தரவுகளையும் அழிக்க"
            variant="danger"
            size="sm"
            icon="trash-outline"
            onPress={handleClearAllData}
            style={{ marginTop: Spacing.sm }}
          />
        </AppCard>

        {/* ================= ABOUT APPLICATION ================= */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text
            style={[
              Typography.h3,
              styles.sectionTitle,
              { color: colors.text, fontSize: Typography.h3.fontSize * fontScaleMultiplier },
            ]}>
            பயன்பாட்டு தகவல்
          </Text>
        </View>

        <AppCard padding="md" style={styles.card}>
          <View style={styles.aboutRow}>
            <Text
              style={[
                styles.aboutLabel,
                { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
              ]}>
              செயலி பெயர்:
            </Text>
            <Text
              style={[
                styles.aboutValue,
                { color: colors.text, fontSize: 13 * fontScaleMultiplier },
              ]}>
              JW கூட்ட உதவியாளர் (Meeting Assistant)
            </Text>
          </View>

          <View style={styles.aboutRow}>
            <Text
              style={[
                styles.aboutLabel,
                { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
              ]}>
              பதிப்பு:
            </Text>
            <Text
              style={[
                styles.aboutValue,
                { color: colors.text, fontSize: 13 * fontScaleMultiplier },
              ]}>
              1.0.0 (Phase 4 Local Storage)
            </Text>
          </View>

          <View style={styles.aboutRow}>
            <Text
              style={[
                styles.aboutLabel,
                { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier },
              ]}>
              சேமிப்பு முறை:
            </Text>
            <Text
              style={[
                styles.aboutValue,
                { color: colors.text, fontSize: 13 * fontScaleMultiplier },
              ]}>
              கைபேசி உள்ளூர் சேமிப்பகம் (Offline Only)
            </Text>
          </View>

          <View style={[styles.privacyNotice, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text
              style={[
                styles.privacyText,
                { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              எந்த வெளிப்புற சேவையகமும் அல்லது கணக்கும் தேவையில்லை. உங்கள் எல்லா தயாரிப்பு குறிப்புகளும் உங்கள் கைபேசியின் AsyncStorage-ல் நிரந்தரமாக பாதுகாக்கப்படுகிறது.
            </Text>
          </View>
        </AppCard>
      </ScrollView>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs + 2,
    gap: Spacing.xs + 2,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  helperText: {
    marginBottom: Spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  themeOptionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: 6,
  },
  optionLabel: {
    fontWeight: '600',
  },
  fontScalePreview: {
    fontWeight: '700',
  },
  previewBox: {
    marginTop: Spacing.md,
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  previewLabel: {
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  languageOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  languageTextWrap: {
    flex: 1,
  },
  languageLabel: {
    marginBottom: 2,
  },
  languageDesc: {
    lineHeight: 17,
  },
  inputLabel: {
    fontWeight: '600',
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  storageStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  statNum: {
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontWeight: '600',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  aboutLabel: {
    fontWeight: '500',
  },
  aboutValue: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  privacyText: {
    flex: 1,
    lineHeight: 18,
  },
  backendStatusRow: {
    marginBottom: Spacing.sm,
  },
  backendStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    letterSpacing: 0.2,
  },
  networkButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
