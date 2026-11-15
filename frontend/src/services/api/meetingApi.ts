/**
 * Meeting and Question API Service
 */

import { apiClient } from './apiClient';
import {
  BackendMeeting,
  BackendMeetingDetail,
  BackendMeetingCreate,
  BackendMeetingUpdate,
  BackendQuestion,
  BackendQuestionCreate,
  BackendQuestionUpdate,
} from '@/types/api';

export class MeetingApiService {
  /**
   * Retrieves a list of meetings with optional filters.
   */
  async listMeetings(params?: {
    meeting_type?: 'midweek' | 'weekend';
    date?: string;
    skip?: number;
    limit?: number;
  }): Promise<BackendMeeting[]> {
    return apiClient.get<BackendMeeting[]>('/meetings', params);
  }

  /**
   * Retrieves detailed meeting information by meeting ID including questions.
   */
  async getMeetingById(id: string): Promise<BackendMeetingDetail> {
    return apiClient.get<BackendMeetingDetail>(`/meetings/${encodeURIComponent(id)}`);
  }

  /**
   * Creates a new meeting.
   */
  async createMeeting(data: BackendMeetingCreate): Promise<BackendMeeting> {
    return apiClient.post<BackendMeeting>('/meetings', data);
  }

  /**
   * Updates an existing meeting.
   */
  async updateMeeting(
    id: string,
    data: BackendMeetingUpdate
  ): Promise<BackendMeeting> {
    return apiClient.put<BackendMeeting>(`/meetings/${encodeURIComponent(id)}`, data);
  }

  /**
   * Deletes a meeting by ID.
   */
  async deleteMeeting(id: string): Promise<{ detail: string }> {
    return apiClient.delete<{ detail: string }>(`/meetings/${encodeURIComponent(id)}`);
  }

  /**
   * Retrieves all questions belonging to a meeting.
   */
  async getMeetingQuestions(meetingId: string): Promise<BackendQuestion[]> {
    return apiClient.get<BackendQuestion[]>(
      `/meetings/${encodeURIComponent(meetingId)}/questions`
    );
  }

  /**
   * Retrieves a single question by question ID.
   */
  async getQuestionById(id: string): Promise<BackendQuestion> {
    return apiClient.get<BackendQuestion>(`/questions/${encodeURIComponent(id)}`);
  }

  /**
   * Adds a new question to a meeting.
   */
  async addQuestion(
    meetingId: string,
    data: Omit<BackendQuestionCreate, 'meeting_id'>
  ): Promise<BackendQuestion> {
    return apiClient.post<BackendQuestion>(
      `/meetings/${encodeURIComponent(meetingId)}/questions`,
      data
    );
  }

  /**
   * Updates an existing question.
   */
  async updateQuestion(
    id: string,
    data: BackendQuestionUpdate
  ): Promise<BackendQuestion> {
    return apiClient.put<BackendQuestion>(`/questions/${encodeURIComponent(id)}`, data);
  }

  /**
   * Deletes a question.
   */
  async deleteQuestion(id: string): Promise<{ detail: string }> {
    return apiClient.delete<{ detail: string }>(`/questions/${encodeURIComponent(id)}`);
  }
}

export const meetingApiService = new MeetingApiService();
