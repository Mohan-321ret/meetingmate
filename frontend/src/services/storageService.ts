import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedAnswer, UserSettings, RecentQuestionItem } from '@/types';
import { INITIAL_USER_SETTINGS, INITIAL_SAVED_ANSWERS } from '@/constants/sampleData';

const STORAGE_KEYS = {
  ANSWERS: '@jw_meetingmate_answers_v1',
  SETTINGS: '@jw_meetingmate_settings_v1',
  RECENT_QUESTIONS: '@jw_meetingmate_recent_questions_v1',
};

class StorageService {
  /**
   * Loads saved answers from local storage.
   * If first time opening, seeds with INITIAL_SAVED_ANSWERS.
   */
  async getSavedAnswers(): Promise<SavedAnswer[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ANSWERS);
      if (json !== null) {
        return JSON.parse(json);
      }
      // First time launch: seed initial sample answers
      await this.saveAnswers(INITIAL_SAVED_ANSWERS);
      return INITIAL_SAVED_ANSWERS;
    } catch (error) {
      console.warn('Failed to load saved answers from storage:', error);
      return INITIAL_SAVED_ANSWERS;
    }
  }

  /**
   * Persists answers list to local storage.
   */
  async saveAnswers(answers: SavedAnswer[]): Promise<void> {
    try {
      const json = JSON.stringify(answers);
      await AsyncStorage.setItem(STORAGE_KEYS.ANSWERS, json);
    } catch (error) {
      console.error('Failed to save answers to storage:', error);
    }
  }

  /**
   * Loads user settings from local storage.
   */
  async getSettings(): Promise<UserSettings> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (json !== null) {
        const parsed = JSON.parse(json);
        return {
          ...INITIAL_USER_SETTINGS,
          ...parsed,
        };
      }
      await this.saveSettings(INITIAL_USER_SETTINGS);
      return INITIAL_USER_SETTINGS;
    } catch (error) {
      console.warn('Failed to load user settings from storage:', error);
      return INITIAL_USER_SETTINGS;
    }
  }

  /**
   * Persists user settings to local storage.
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      const json = JSON.stringify(settings);
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, json);
    } catch (error) {
      console.error('Failed to save settings to storage:', error);
    }
  }

  /**
   * Loads recently viewed questions from local storage.
   */
  async getRecentQuestions(): Promise<RecentQuestionItem[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_QUESTIONS);
      if (json !== null) {
        return JSON.parse(json);
      }
      return [];
    } catch (error) {
      console.warn('Failed to load recent questions:', error);
      return [];
    }
  }

  /**
   * Records a question view into local storage history (maximum 10 items).
   */
  async addRecentQuestion(
    item: Omit<RecentQuestionItem, 'viewedAt'>
  ): Promise<RecentQuestionItem[]> {
    try {
      const currentList = await this.getRecentQuestions();
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('ta-IN', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(now);

      const newItem: RecentQuestionItem = {
        ...item,
        viewedAt: `இன்று ${timeStr}`,
      };

      // Remove existing occurrence if any and prepend to top
      const filtered = currentList.filter(q => q.id !== item.id);
      const updatedList = [newItem, ...filtered].slice(0, 10);

      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_QUESTIONS,
        JSON.stringify(updatedList)
      );

      return updatedList;
    } catch (error) {
      console.error('Failed to record recent question:', error);
      return [];
    }
  }

  /**
   * Clears recently viewed questions.
   */
  async clearRecentQuestions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_QUESTIONS);
    } catch (error) {
      console.error('Failed to clear recent questions:', error);
    }
  }

  /**
   * Clears all saved local data and resets to factory state.
   */
  async clearAllData(): Promise<{
    answers: SavedAnswer[];
    settings: UserSettings;
    recentQuestions: RecentQuestionItem[];
  }> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ANSWERS,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.RECENT_QUESTIONS,
      ]);
      return {
        answers: [],
        settings: INITIAL_USER_SETTINGS,
        recentQuestions: [],
      };
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return {
        answers: [],
        settings: INITIAL_USER_SETTINGS,
        recentQuestions: [],
      };
    }
  }
}

export const storageService = new StorageService();

