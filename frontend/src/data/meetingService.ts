import { BrowseQuestion, SectionBrowseDetail } from '@/types/meetingBrowse';
import { BackendQuestion } from '@/types/api';
import { MIDWEEK_QUESTIONS, MIDWEEK_SECTIONS_DATA } from './midweekBrowseData';
import { WEEKEND_QUESTIONS, WEEKEND_SECTIONS_DATA } from './weekendBrowseData';

// Base static questions
const STATIC_QUESTIONS: BrowseQuestion[] = [
  ...MIDWEEK_QUESTIONS,
  ...WEEKEND_QUESTIONS,
];

// In-memory dynamic questions registry (includes backend synced questions)
let dynamicQuestions: BrowseQuestion[] = [...STATIC_QUESTIONS];

export const ALL_QUESTIONS: BrowseQuestion[] = dynamicQuestions;

export const ALL_SECTIONS: Record<string, SectionBrowseDetail> = {
  ...MIDWEEK_SECTIONS_DATA,
  ...WEEKEND_SECTIONS_DATA,
};

export const getSectionDetail = (sectionId: string): SectionBrowseDetail | null => {
  return ALL_SECTIONS[sectionId] || null;
};

export const getQuestionById = (questionId: string): BrowseQuestion | null => {
  return dynamicQuestions.find(q => q.id === questionId) || null;
};

export interface QuestionNavigationResult {
  current: BrowseQuestion | null;
  previous: BrowseQuestion | null;
  next: BrowseQuestion | null;
  currentIndex: number;
  total: number;
  questionGroup: BrowseQuestion[];
}

export const getQuestionNavigation = (
  questionId: string,
  filterBySection: boolean = true
): QuestionNavigationResult => {
  const current = getQuestionById(questionId);
  if (!current) {
    return {
      current: null,
      previous: null,
      next: null,
      currentIndex: 0,
      total: 0,
      questionGroup: [],
    };
  }

  // Filter list by section or meeting type
  const group = filterBySection
    ? dynamicQuestions.filter(q => q.sectionId === current.sectionId)
    : dynamicQuestions.filter(q => q.meetingType === current.meetingType);

  const idx = group.findIndex(q => q.id === questionId);
  const previous = idx > 0 ? group[idx - 1] : null;
  const next = idx < group.length - 1 ? group[idx + 1] : null;

  return {
    current,
    previous,
    next,
    currentIndex: idx + 1,
    total: group.length,
    questionGroup: group,
  };
};

export const getQuestionsForSection = (sectionId: string): BrowseQuestion[] => {
  return dynamicQuestions.filter(q => q.sectionId === sectionId);
};

export const getSectionTitleByCode = (section: string): string => {
  switch (section?.toLowerCase()) {
    case 'treasures':
      return 'கடவுளுடைய வார்த்தையிலுள்ள புதையல்கள்';
    case 'ministry':
      return 'ஊழியத்தில் திறமையை அதிகரியுங்கள்';
    case 'living':
      return 'கிறிஸ்தவ வாழ்க்கை';
    case 'public_talk':
      return 'பொதுப் பேச்சு';
    case 'watchtower':
      return 'காவற்கோபுர படிப்பு';
    default:
      return section || 'கூட்டப் பகுதி';
  }
};

/**
 * Registers backend questions into the dynamic question store.
 * Prevents duplicates by ID.
 */
export const registerBackendQuestions = (
  questions: BackendQuestion[],
  meetingType: 'midweek' | 'weekend' = 'midweek',
  meetingTitle: string = 'கூட்டம்'
): void => {
  if (!questions || questions.length === 0) return;

  const newItems: BrowseQuestion[] = questions.map(bq => ({
    id: bq.id,
    meetingType,
    sectionId: (bq.section as any) || 'treasures',
    sectionTitle: getSectionTitleByCode(bq.section),
    partTitle: meetingTitle,
    questionIndex: bq.display_order,
    totalQuestions: questions.length,
    questionNumberLabel:
      bq.paragraph_reference || `கேள்வி ${bq.display_order + 1}`,
    questionText: bq.question_text,
    sourceReference: bq.paragraph_reference || meetingTitle,
    scriptures: [],
  }));

  const existingIds = new Set(dynamicQuestions.map(q => q.id));
  const toAdd = newItems.filter(item => !existingIds.has(item.id));

  if (toAdd.length > 0) {
    dynamicQuestions = [...toAdd, ...dynamicQuestions];
  }
};
