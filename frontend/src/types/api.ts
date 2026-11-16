/**
 * API Type Definitions for JW Meeting Assistant
 * Mirrors backend FastAPI / SQLite schemas
 */

export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorDetail {
  code?: string;
  message: string;
  details?: Record<string, any>;
  path?: string;
}

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp?: string;
}

// ----------------------------------------------------------------------------
// Meetings
// ----------------------------------------------------------------------------
export type BackendMeetingType = 'midweek' | 'weekend';

export interface BackendMeeting {
  id: string;
  meeting_type: BackendMeetingType;
  meeting_date: string; // ISO 8601
  title: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  question_count?: number;
}

export interface BackendMeetingCreate {
  meeting_type: BackendMeetingType;
  meeting_date: string;
  title: string;
  description?: string | null;
}

export interface BackendMeetingUpdate {
  meeting_type?: BackendMeetingType;
  meeting_date?: string;
  title?: string;
  description?: string | null;
}

export interface BackendMeetingDetail extends BackendMeeting {
  questions: BackendQuestion[];
}

export interface BackendJWMeetingSyncResponse {
  success: boolean;
  week_label: string;
  target_date: string;
  midweek_meeting?: BackendMeeting | null;
  weekend_meeting?: BackendMeeting | null;
  total_questions_created: number;
  chroma_chunks_indexed: number;
  source_urls: string[];
  message: string;
}

export interface BackendCurrentWeekMeetingsResponse {
  week_label: string;
  start_date: string;
  end_date: string;
  midweek?: BackendMeetingDetail | null;
  weekend?: BackendMeetingDetail | null;
}

// ----------------------------------------------------------------------------
// Questions
// ----------------------------------------------------------------------------
export type BackendSectionType =
  | 'treasures'
  | 'ministry'
  | 'living'
  | 'public_talk'
  | 'watchtower'
  | string;

export interface BackendQuestion {
  id: string;
  meeting_id: string;
  section: BackendSectionType;
  question_text: string;
  paragraph_reference?: string | null;
  display_order: number;
  created_at: string;
}

export interface BackendQuestionCreate {
  meeting_id?: string | null;
  section: BackendSectionType;
  question_text: string;
  paragraph_reference?: string | null;
  display_order?: number;
}

export interface BackendQuestionUpdate {
  section?: BackendSectionType;
  question_text?: string;
  paragraph_reference?: string | null;
  display_order?: number;
}

// ----------------------------------------------------------------------------
// Answers & Generation
// ----------------------------------------------------------------------------
export type AnswerTypeEnum = 'short' | 'detailed' | 'scripture_focused' | 'user_draft';

export interface AnswerSourceItem {
  source_title: string;
  source_url?: string | null;
  paragraph_reference?: string | null;
  content_snippet: string;
  relevance_score: number;
  source_type?: string | null;
  page_number?: number | null;
}

export interface AnswerGenerateRequest {
  question: string;
  answer_type?: 'short' | 'detailed' | 'scripture_focused';
  language?: string; // 'ta'
  question_id?: string | null;
  save_answer?: boolean;
  save_to_history?: boolean;
  custom_instructions?: string | null;
}

export interface AnswerGenerateResponse {
  answer: string;
  sources: AnswerSourceItem[];
  answer_type: 'short' | 'detailed' | 'scripture_focused';
  model_used?: string | null;
  saved_answer_id?: string | null;
}

export interface BackendAnswer {
  id: string;
  question_id?: string | null;
  answer_text: string;
  answer_type: AnswerTypeEnum;
  sources_json?: string | null;
  sources?: AnswerSourceItem[];
  created_at: string;
  updated_at: string;
}

export interface BackendAnswerCreate {
  question_id?: string | null;
  answer_text: string;
  answer_type?: AnswerTypeEnum;
  sources_json?: string | null;
}

// ----------------------------------------------------------------------------
// Saved Answers
// ----------------------------------------------------------------------------
export interface BackendSavedAnswer {
  id: string;
  answer_id?: string | null;
  custom_title?: string | null;
  notes?: string | null;
  created_at: string;
  answer_text?: string | null;
  answer_type?: string | null;
  question_id?: string | null;
  sources?: AnswerSourceItem[];
}

export interface BackendSavedAnswerDetail extends BackendSavedAnswer {
  meeting_id?: string | null;
  meeting_title?: string | null;
  question_text?: string | null;
  paragraph_reference?: string | null;
}

export interface BackendSavedAnswerCreate {
  answer_id?: string | null;
  custom_title?: string | null;
  notes?: string | null;
  answer_text?: string | null;
  answer_type?: string | null;
  question_id?: string | null;
}

export interface BackendSavedAnswerUpdate {
  custom_title?: string | null;
  notes?: string | null;
  answer_text?: string | null;
  answer_type?: string | null;
}

// ----------------------------------------------------------------------------
// Search & History
// ----------------------------------------------------------------------------
export interface BackendSearchRequest {
  query: string;
  top_k?: number;
  source_type?: string | null;
  language?: string | null;
  min_score?: number | null;
}

export interface BackendSearchResultItem {
  content: string;
  source_title: string;
  source_url?: string | null;
  relevance_score: number;
  page_number?: number | null;
  paragraph_reference?: string | null;
  source_type?: string | null;
  language?: string | null;
  chunk_id?: string | null;
}

export interface BackendSearchResponse {
  query: string;
  results: BackendSearchResultItem[];
  total_results: number;
}

export interface BackendSearchHistory {
  id: string;
  query: string;
  answer: string;
  answer_type?: string | null;
  sources_json?: string | null;
  sources: AnswerSourceItem[];
  created_at: string;
}
