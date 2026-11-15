export interface ScriptureRef {
  citation: string;
  verseText: string;
  contextNote?: string;
}

export interface BrowseQuestion {
  id: string;
  meetingType: 'midweek' | 'weekend';
  sectionId: 'treasures' | 'ministry' | 'living' | 'public_talk' | 'watchtower';
  sectionTitle: string;
  partTitle: string;
  questionIndex: number;
  totalQuestions: number;
  questionNumberLabel: string;
  questionText: string;
  paragraphText?: string;
  scriptures: ScriptureRef[];
  sourceReference: string;
  subheading?: string;
  sampleAnswerNotes?: string;
}

export interface MeetingPartBrowse {
  id: string;
  title: string;
  sectionId: 'treasures' | 'ministry' | 'living' | 'public_talk' | 'watchtower';
  duration?: string;
  presenter?: string;
  scripture?: string;
  description?: string;
  paragraphContent?: string;
  scriptures?: ScriptureRef[];
  source?: string;
  questions?: BrowseQuestion[];
}

export interface SectionBrowseDetail {
  sectionId: 'treasures' | 'ministry' | 'living' | 'public_talk' | 'watchtower';
  meetingType: 'midweek' | 'weekend';
  title: string;
  subtitle: string;
  timing: string;
  theme: string;
  icon: string;
  accentColor: string;
  parts: MeetingPartBrowse[];
  allQuestions: BrowseQuestion[];
}

