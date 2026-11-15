/**
 * AI Answer Generation and Management API Service
 */

import { apiClient } from './apiClient';
import {
  AnswerGenerateRequest,
  AnswerGenerateResponse,
  BackendAnswer,
  BackendAnswerCreate,
} from '@/types/api';

export class AnswerApiService {
  /**
   * Generates a conversational Tamil AI answer using Groq and RAG.
   */
  async generateAnswer(
    request: AnswerGenerateRequest
  ): Promise<AnswerGenerateResponse> {
    return apiClient.post<AnswerGenerateResponse>('/answers/generate', request, {
      timeoutMs: 45000, // Generative LLM inference timeout
    });
  }

  /**
   * Generates an answer specifically linked to a meeting question.
   * Maintains relationship: Meeting -> Question -> Answer -> Sources.
   */
  async generateForQuestion(
    questionId: string,
    options?: {
      answerType?: 'short' | 'detailed' | 'scripture_focused';
      language?: string;
      saveAnswer?: boolean;
    }
  ): Promise<AnswerGenerateResponse> {
    const params = {
      answer_type: options?.answerType || 'short',
      language: options?.language || 'ta',
      save_answer: options?.saveAnswer !== undefined ? options.saveAnswer : true,
    };

    return apiClient.post<AnswerGenerateResponse>(
      `/answers/generate-for-question/${encodeURIComponent(questionId)}`,
      undefined,
      {
        params,
        timeoutMs: 45000,
      }
    );
  }

  /**
   * Asks an independent question outside scheduled meeting materials.
   * Uses RAG search over ingested JW reference publications and Groq.
   */
  async askIndependentQuestion(
    question: string,
    options?: {
      answerType?: 'short' | 'detailed' | 'scripture_focused';
      language?: string;
      saveToHistory?: boolean;
      customInstructions?: string;
    }
  ): Promise<AnswerGenerateResponse> {
    const payload: AnswerGenerateRequest = {
      question,
      answer_type: options?.answerType || 'short',
      language: options?.language || 'ta',
      save_to_history:
        options?.saveToHistory !== undefined ? options.saveToHistory : true,
      custom_instructions: options?.customInstructions,
    };

    return apiClient.post<AnswerGenerateResponse>(
      '/answers/independent',
      payload,
      {
        timeoutMs: 45000,
      }
    );
  }

  /**
   * Retrieves all answers linked to a specific question ID.
   */
  async listAnswersForQuestion(questionId: string): Promise<BackendAnswer[]> {
    return apiClient.get<BackendAnswer[]>(
      `/answers/question/${encodeURIComponent(questionId)}`
    );
  }

  /**
   * Retrieves an answer by ID.
   */
  async getAnswerById(id: string): Promise<BackendAnswer> {
    return apiClient.get<BackendAnswer>(`/answers/${encodeURIComponent(id)}`);
  }

  /**
   * Creates a manual or draft answer.
   */
  async createAnswer(data: BackendAnswerCreate): Promise<BackendAnswer> {
    return apiClient.post<BackendAnswer>('/answers', data);
  }

  /**
   * Updates an answer.
   */
  async updateAnswer(
    id: string,
    data: Partial<BackendAnswerCreate>
  ): Promise<BackendAnswer> {
    return apiClient.put<BackendAnswer>(`/answers/${encodeURIComponent(id)}`, data);
  }

  /**
   * Deletes an answer.
   */
  async deleteAnswer(id: string): Promise<{ detail: string }> {
    return apiClient.delete<{ detail: string }>(`/answers/${encodeURIComponent(id)}`);
  }
}

export const answerApiService = new AnswerApiService();
