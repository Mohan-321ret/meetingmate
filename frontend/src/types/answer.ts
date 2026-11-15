import { ScriptureRef } from './meetingBrowse';

export interface AnswerVariant {
  id: string;
  label: string; // e.g. "பதிப்பு 1: நேரடி பதில்", "பதிப்பு 2: நடைமுறை பயன்பாடு", "பதிப்பு 3: வேத வசன ஆய்வு"
  shortAnswer: string; // 30-40 words crisp comment
  detailedAnswer: string; // 80-120 words comprehensive comment
  keyApplication: string; // takeaway point
}

export interface ScriptureApplication extends ScriptureRef {
  howToApply: string; // practical tip for quoting during meeting
}

export interface AnswerPresentation {
  id: string;
  questionId: string;
  meetingType: 'midweek' | 'weekend';
  sectionTitle: string;
  partTitle: string;
  questionNumberLabel: string;
  questionText: string;
  sourceReference: string;
  themeScripture?: string;
  scriptures: ScriptureApplication[];
  variants: AnswerVariant[];
  activeVariantIndex: number;
  paragraphText?: string;
  isSaved?: boolean;
}

export interface AnswerServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

