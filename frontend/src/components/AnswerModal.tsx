import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedAnswer, MeetingType } from '@/types';
import { useApp } from '@/context/AppContext';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { AppButton } from '@/components/AppButton';

interface AnswerModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: Partial<SavedAnswer> | null;
}

const CATEGORIES = [
  'காவற்கோபுர படிப்பு',
  'ஆன்மீகப் புதையல்கள்',
  'சபை பைபிள் படிப்பு',
  'ஊழியம்',
  'பொதுப் பேச்சு',
  'பைபிள் வாசிப்பு',
  'இதர குறிப்புகள்',
];

interface AnswerModalInnerProps {
  initialData?: Partial<SavedAnswer> | null;
  onClose: () => void;
}

const AnswerModalInner: React.FC<AnswerModalInnerProps> = ({
  initialData,
  onClose,
}) => {
  const { colors, fontScaleMultiplier, addAnswer, updateAnswer } = useApp();

  const [meetingType, setMeetingType] = useState<MeetingType>(
    initialData?.meetingType || 'weekend'
  );
  const [sectionLabel, setSectionLabel] = useState<string>(
    initialData?.sectionLabel || 'காவற்கோபுர படிப்பு'
  );
  const [itemReference, setItemReference] = useState<string>(
    initialData?.itemReference || ''
  );
  const [question, setQuestion] = useState<string>(initialData?.question || '');
  const [answerText, setAnswerText] = useState<string>(
    initialData?.answerText || ''
  );
  const [scripture, setScripture] = useState<string>(
    initialData?.scripture || ''
  );
  const [isFavorite, setIsFavorite] = useState<boolean>(
    Boolean(initialData?.isFavorite)
  );

  const isEditing = Boolean(initialData && initialData.id);

  const handleSave = () => {
    if (!answerText.trim()) {
      Alert.alert('கவனத்திற்கு', 'தயவுசெய்து பதிலை உள்ளிடவும்.');
      return;
    }

    if (initialData && initialData.id) {
      updateAnswer(initialData.id, {
        meetingType,
        sectionLabel,
        itemReference: itemReference.trim() || 'பொதுவானது',
        question: question.trim(),
        answerText: answerText.trim(),
        scripture: scripture.trim() || undefined,
        isFavorite,
      });
    } else {
      addAnswer({
        meetingType,
        sectionLabel,
        itemReference: itemReference.trim() || 'பொதுவானது',
        question: question.trim(),
        answerText: answerText.trim(),
        scripture: scripture.trim() || undefined,
        isFavorite,
      });
    }

    onClose();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text
                style={[
                  Typography.h3,
                  {
                    color: colors.text,
                    fontSize: Typography.h3.fontSize * fontScaleMultiplier,
                  },
                ]}>
                {isEditing ? 'பதிலை திருத்துக' : 'புதிய பதில் குறிப்பு'}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  {
                    color: colors.textSecondary,
                    fontSize: 12 * fontScaleMultiplier,
                  },
                ]}>
                கூட்டத்தில் பதில் சொல்ல குறிப்பு தயார் செய்க
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}>
            {/* Meeting Type Selector */}
            <Text
              style={[
                Typography.caption,
                styles.fieldLabel,
                { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              கூட்ட வகை:
            </Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                onPress={() => setMeetingType('midweek')}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      meetingType === 'midweek' ? colors.primary : colors.surfaceSubtle,
                    borderColor:
                      meetingType === 'midweek' ? colors.primary : colors.border,
                  },
                ]}>
                <Ionicons
                  name="book-outline"
                  size={16}
                  color={meetingType === 'midweek' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        meetingType === 'midweek' ? '#FFFFFF' : colors.textSecondary,
                      fontSize: 13 * fontScaleMultiplier,
                    },
                  ]}>
                  நடுவாரம்
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMeetingType('weekend')}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      meetingType === 'weekend' ? colors.primary : colors.surfaceSubtle,
                    borderColor:
                      meetingType === 'weekend' ? colors.primary : colors.border,
                  },
                ]}>
                <Ionicons
                  name="library-outline"
                  size={16}
                  color={meetingType === 'weekend' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        meetingType === 'weekend' ? '#FFFFFF' : colors.textSecondary,
                      fontSize: 13 * fontScaleMultiplier,
                    },
                  ]}>
                  வார இறுதி
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category selection */}
            <Text
              style={[
                Typography.caption,
                styles.fieldLabel,
                { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              பகுதி / தலைப்பு:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}>
              {CATEGORIES.map(cat => {
                const isSelected = sectionLabel === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSectionLabel(cat)}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isSelected
                          ? colors.primarySurface
                          : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color: isSelected ? colors.primary : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                          fontSize: 12 * fontScaleMultiplier,
                        },
                      ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Reference */}
            <Text
              style={[
                Typography.caption,
                styles.fieldLabel,
                { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              குறிப்பு / பாரா எண்:
            </Text>
            <TextInput
              value={itemReference}
              onChangeText={setItemReference}
              placeholder="எ.கா. பாரா 4 அல்லது வசனம் 3"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.text,
                  borderColor: colors.border,
                  fontSize: 14 * fontScaleMultiplier,
                },
              ]}
            />

            {/* Question */}
            <Text
              style={[
                Typography.caption,
                styles.fieldLabel,
                { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              கேள்வி:
            </Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="கேள்வியை உள்ளிடவும்..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.input,
                styles.multilineInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.text,
                  borderColor: colors.border,
                  fontSize: 14 * fontScaleMultiplier,
                },
              ]}
            />

            {/* Answer Textarea */}
            <Text
              style={[
                Typography.caption,
                styles.fieldLabel,
                { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              உங்கள் பதில் குறிப்பு (*):
            </Text>
            <TextInput
              value={answerText}
              onChangeText={setAnswerText}
              placeholder="சுருக்கமான, தெளிவான தமிழ் பதில்..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.text,
                  borderColor: colors.border,
                  fontSize: 15 * fontScaleMultiplier,
                  lineHeight: 23 * fontScaleMultiplier,
                },
              ]}
            />

            {/* Scripture reference */}
            <Text
              style={[
                Typography.caption,
                styles.fieldLabel,
                { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
              ]}>
              துணை வேத வசனங்கள் (விரும்பினால்):
            </Text>
            <TextInput
              value={scripture}
              onChangeText={setScripture}
              placeholder="எ.கா. சங்கீதம் 119:105"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.text,
                  borderColor: colors.border,
                  fontSize: 14 * fontScaleMultiplier,
                },
              ]}
            />

            {/* Favorite toggle */}
            <TouchableOpacity
              onPress={() => setIsFavorite(!isFavorite)}
              style={styles.favToggleRow}>
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={22}
                color={isFavorite ? '#EAB308' : colors.textMuted}
              />
              <Text
                style={[
                  styles.favToggleText,
                  { color: colors.text, fontSize: 13 * fontScaleMultiplier },
                ]}>
                முக்கியமான பதில்களில் சேர்க்க
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <AppButton
              title="ரத்து செய்"
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <AppButton
              title={isEditing ? 'புதுப்பிக்க' : 'சேமிக்க'}
              variant="primary"
              icon="checkmark-outline"
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

export const AnswerModal: React.FC<AnswerModalProps> = ({
  visible,
  onClose,
  initialData,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      {visible ? (
        <AnswerModalInner
          key={initialData?.id || (initialData?.question || 'new-modal')}
          initialData={initialData}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
  },
  scrollInner: {
    paddingVertical: Spacing.md,
  },
  fieldLabel: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  segmentText: {
    fontWeight: '600',
  },
  categoryScroll: {
    gap: Spacing.xs + 2,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryText: {
    fontWeight: '500',
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
  },
  multilineInput: {
    minHeight: 44,
  },
  textArea: {
    minHeight: 90,
  },
  favToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  favToggleText: {
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

