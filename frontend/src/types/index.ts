export type ThemePreference = 'light' | 'dark' | 'system';
export type FontScalePreference = 'normal' | 'large' | 'extraLarge';
export type LanguagePreference = 'tamil_only' | 'tamil_english';

export type MeetingType = 'midweek' | 'weekend';

export type MidweekSectionType = 'treasures' | 'ministry' | 'living';

export interface MeetingItem {
  id: string;
  title: string;
  section: MidweekSectionType | 'public_talk' | 'watchtower';
  duration?: string;
  scripture?: string;
  presenter?: string;
  description?: string;
  source?: string;
  songNumber?: number;
  songTitle?: string;
  questions?: string[];
}

export interface WatchtowerParagraph {
  paragraphNumber: number;
  subheading?: string;
  question: string;
  scripture?: string;
  sampleAnswer?: string;
}

export interface MidweekMeetingData {
  weekDateRange: string;
  bibleReadingRange: string;
  theme: string;
  openingSong: { number: number; title: string };
  treasures: MeetingItem[];
  ministry: MeetingItem[];
  livingSong: { number: number; title: string };
  living: MeetingItem[];
  concludingSong: { number: number; title: string };
}

export interface WeekendMeetingData {
  meetingDate: string;
  publicTalk: {
    song: { number: number; title: string };
    title: string;
    speaker: string;
    congregation: string;
    scriptures: string[];
    summary: string;
  };
  watchtowerStudy: {
    song: { number: number; title: string };
    articleTitle: string;
    themeScripture: string;
    paragraphs: WatchtowerParagraph[];
    concludingSong: { number: number; title: string };
  };
}

export interface SavedAnswer {
  id: string;
  meetingType: MeetingType;
  sectionLabel: string;
  itemReference: string;
  question: string;
  answerText: string;
  scripture?: string;
  updatedAt: string;
  isFavorite: boolean;
}

export interface RecentQuestionItem {
  id: string;
  questionText: string;
  questionNumberLabel: string;
  sectionTitle: string;
  viewedAt: string;
}

export interface UserSettings {
  theme: ThemePreference;
  fontScale: FontScalePreference;
  language: LanguagePreference;
  congregationName: string;
  midweekSchedule: string;
  weekendSchedule: string;
  apiUrl?: string;
}

export * from './api';

