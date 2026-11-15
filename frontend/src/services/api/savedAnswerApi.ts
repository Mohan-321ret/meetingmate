/**
 * Saved Answers API Service
 * Family answer management and study notes
 */

import { apiClient } from './apiClient';
import {
  BackendSavedAnswerDetail,
  BackendSavedAnswerCreate,
  BackendSavedAnswerUpdate,
} from '@/types/api';

export class SavedAnswerApiService {
  /**
   * Retrieves all saved answers from backend SQLite database.
   */
  async listSavedAnswers(params?: {
    question_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<BackendSavedAnswerDetail[]> {
    return apiClient.get<BackendSavedAnswerDetail[]>('/saved-answers', params);
  }

  /**
   * Retrieves a single saved answer with meeting & question relationships.
   */
  async getSavedAnswer(id: string): Promise<BackendSavedAnswerDetail> {
    return apiClient.get<BackendSavedAnswerDetail>(
      `/saved-answers/${encodeURIComponent(id)}`
    );
  }

  /**
   * Saves a generated answer or user draft to the SQLite database.
   */
  async createSavedAnswer(
    data: BackendSavedAnswerCreate
  ): Promise<BackendSavedAnswerDetail> {
    return apiClient.post<BackendSavedAnswerDetail>('/saved-answers', data);
  }

  /**
   * Updates an existing saved answer (title, notes, or answer text).
   */
  async updateSavedAnswer(
    id: string,
    data: BackendSavedAnswerUpdate
  ): Promise<BackendSavedAnswerDetail> {
    return apiClient.put<BackendSavedAnswerDetail>(
      `/saved-answers/${encodeURIComponent(id)}`,
      data
    );
  }

  /**
   * Deletes a saved answer by ID.
   */
  async deleteSavedAnswer(id: string): Promise<{ detail: string }> {
    return apiClient.delete<{ detail: string }>(
      `/saved-answers/${encodeURIComponent(id)}`
    );
  }
}

export const savedAnswerApiService = new SavedAnswerApiService();
