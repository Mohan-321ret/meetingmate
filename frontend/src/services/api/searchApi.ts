/**
 * Semantic Knowledge Search and History API Service
 */

import { apiClient } from './apiClient';
import {
  BackendSearchRequest,
  BackendSearchResponse,
  BackendSearchHistory,
} from '@/types/api';

export class SearchApiService {
  /**
   * Executes a semantic vector search across ingested publications.
   */
  async searchKnowledge(
    params: BackendSearchRequest
  ): Promise<BackendSearchResponse> {
    return apiClient.post<BackendSearchResponse>('/search', params);
  }

  /**
   * Retrieves search history records (previous questions and generated answers).
   */
  async listHistory(params?: {
    query?: string;
    skip?: number;
    limit?: number;
  }): Promise<BackendSearchHistory[]> {
    return apiClient.get<BackendSearchHistory[]>('/history', params);
  }

  /**
   * Retrieves a single search history record by ID.
   */
  async getHistoryItem(id: string): Promise<BackendSearchHistory> {
    return apiClient.get<BackendSearchHistory>(`/history/${encodeURIComponent(id)}`);
  }

  /**
   * Deletes a specific search history entry.
   */
  async deleteHistoryItem(id: string): Promise<{ detail: string }> {
    return apiClient.delete<{ detail: string }>(`/history/${encodeURIComponent(id)}`);
  }

  /**
   * Clears the entire search history.
   */
  async clearHistory(): Promise<{ detail: string }> {
    return apiClient.delete<{ detail: string }>('/history');
  }
}

export const searchApiService = new SearchApiService();
