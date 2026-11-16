import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  SavedAnswer,
  UserSettings,
  MidweekMeetingData,
  WeekendMeetingData,
  RecentQuestionItem,
} from '@/types';
import {
  BackendMeeting,
  BackendMeetingDetail,
  BackendSearchHistory,
  AnswerGenerateResponse,
  BackendSearchResponse,
  BackendJWMeetingSyncResponse,
  BackendCurrentWeekMeetingsResponse,
} from '@/types/api';
import {
  INITIAL_USER_SETTINGS,
  INITIAL_SAVED_ANSWERS,
  SAMPLE_MIDWEEK_DATA,
  SAMPLE_WEEKEND_DATA,
} from '@/constants/sampleData';
import { Colors } from '@/constants/theme';
import { storageService } from '@/services/storageService';
import { apiClient } from '@/services/api/apiClient';
import { meetingApiService } from '@/services/api/meetingApi';
import { savedAnswerApiService } from '@/services/api/savedAnswerApi';
import { searchApiService } from '@/services/api/searchApi';
import { answerApiService } from '@/services/api/answerApi';
import { registerBackendQuestions } from '@/data/meetingService';

interface AppContextValue {
  // Storage & Backend Ready States
  isStorageReady: boolean;
  isBackendOnline: boolean | null;
  backendLatencyMs: number | null;
  backendError: string | null;
  testBackendConnection: () => Promise<{
    isOnline: boolean;
    latencyMs?: number;
    error?: string;
  }>;

  // Saved Answers
  savedAnswers: SavedAnswer[];
  addAnswer: (answer: Omit<SavedAnswer, 'id' | 'updatedAt'>) => void;
  updateAnswer: (id: string, updated: Partial<Omit<SavedAnswer, 'id'>>) => void;
  deleteAnswer: (id: string) => void;
  toggleFavorite: (id: string) => void;
  syncSavedAnswers: () => Promise<void>;

  // Recently Viewed Questions
  recentQuestions: RecentQuestionItem[];
  recordQuestionView: (item: Omit<RecentQuestionItem, 'viewedAt'>) => void;
  clearRecentQuestions: () => void;

  // Search History & Knowledge
  searchHistory: BackendSearchHistory[];
  refreshHistory: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  askIndependentQuestion: (
    query: string,
    answerType?: 'short' | 'detailed'
  ) => Promise<AnswerGenerateResponse>;
  searchKnowledge: (
    query: string,
    options?: { top_k?: number; source_type?: string; min_score?: number }
  ) => Promise<BackendSearchResponse>;

  // Meeting Data
  midweekData: MidweekMeetingData;
  weekendData: WeekendMeetingData;
  backendMeetings: BackendMeeting[];
  refreshMeetings: () => Promise<void>;
  syncJWMeetings: (forceRefresh?: boolean) => Promise<BackendJWMeetingSyncResponse>;

  // Settings
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  clearAllData: () => Promise<void>;

  // Dynamic Theme & Typography
  isDark: boolean;
  colors: typeof Colors.light;
  fontScaleMultiplier: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [isStorageReady, setIsStorageReady] = useState<boolean>(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [backendLatencyMs, setBackendLatencyMs] = useState<number | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(INITIAL_USER_SETTINGS);
  const [savedAnswers, setSavedAnswers] =
    useState<SavedAnswer[]>(INITIAL_SAVED_ANSWERS);
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestionItem[]>(
    []
  );
  const [midweekData, setMidweekData] =
    useState<MidweekMeetingData>(SAMPLE_MIDWEEK_DATA);
  const [weekendData, setWeekendData] =
    useState<WeekendMeetingData>(SAMPLE_WEEKEND_DATA);
  const [backendMeetings, setBackendMeetings] = useState<BackendMeeting[]>([]);
  const [searchHistory, setSearchHistory] = useState<BackendSearchHistory[]>([]);

  // Configure API Client Base URL whenever settings.apiUrl changes
  useEffect(() => {
    if (settings.apiUrl) {
      apiClient.setBaseUrl(settings.apiUrl);
    }
  }, [settings.apiUrl]);

  // Test backend connection
  const testBackendConnection = useCallback(async () => {
    try {
      const health = await apiClient.checkHealth();
      setIsBackendOnline(health.isOnline);
      setBackendLatencyMs(health.latencyMs || null);
      setBackendError(health.error || null);
      return health;
    } catch (err: any) {
      setIsBackendOnline(false);
      setBackendLatencyMs(null);
      setBackendError(err.message || 'இணைப்பு தோல்வி');
      return { isOnline: false, error: err.message };
    }
  }, []);

  // Fetch search history from backend
  const refreshHistory = useCallback(async () => {
    try {
      const history = await searchApiService.listHistory({ limit: 30 });
      setSearchHistory(history);
    } catch (err) {
      console.warn('Failed to fetch search history from backend:', err);
    }
  }, []);

  // Sync saved answers with backend
  const syncSavedAnswers = useCallback(async () => {
    try {
      const backendItems = await savedAnswerApiService.listSavedAnswers({
        limit: 100,
      });
      if (backendItems && backendItems.length > 0) {
        setSavedAnswers(prev => {
          const existingMap = new Map<string, SavedAnswer>();
          prev.forEach(item => existingMap.set(item.id, item));

          backendItems.forEach(bi => {
            const dateStr = bi.created_at
              ? new Intl.DateTimeFormat('ta-IN', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }).format(new Date(bi.created_at))
              : 'சமீபத்தில்';

            const localItem = existingMap.get(bi.id);
            const isFav = localItem ? localItem.isFavorite : false;

            existingMap.set(bi.id, {
              id: bi.id,
              meetingType: bi.meeting_id ? 'midweek' : 'weekend',
              sectionLabel:
                bi.meeting_title || bi.paragraph_reference || 'சேமிக்கப்பட்ட பதில்',
              itemReference: bi.paragraph_reference || bi.custom_title || 'பதில்',
              question:
                bi.question_text || bi.custom_title || 'கூட்ட ஆய்வு கேள்வி',
              answerText: bi.answer_text || '',
              updatedAt: dateStr,
              isFavorite: isFav,
            });
          });

          const merged = Array.from(existingMap.values());
          storageService.saveAnswers(merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Failed to sync saved answers with backend:', err);
    }
  }, []);

  // Refresh meetings and questions from backend
  const refreshMeetings = useCallback(async () => {
    try {
      // 1. Fetch current week meetings (auto-syncs if none exist)
      let currentWeek: BackendCurrentWeekMeetingsResponse | undefined;
      try {
        currentWeek = await meetingApiService.getCurrentWeekMeetings({
          language: 'ta',
          auto_sync: true,
        });
      } catch (err) {
        console.warn('Could not auto-sync current week meetings:', err);
      }

      const meetings = await meetingApiService.listMeetings({ limit: 50 });
      setBackendMeetings(meetings);

      // 2. Identify the active Midweek meeting (prioritize current week)
      const activeMidweek =
        currentWeek?.midweek ||
        meetings.find(m => m.meeting_type === 'midweek');

      if (activeMidweek) {
        const detail: BackendMeetingDetail =
          'questions' in activeMidweek &&
          Array.isArray((activeMidweek as any).questions) &&
          (activeMidweek as any).questions.length > 0
            ? (activeMidweek as BackendMeetingDetail)
            : await meetingApiService.getMeetingById(activeMidweek.id);

        if (detail && detail.questions && detail.questions.length > 0) {
          registerBackendQuestions(
            detail.questions,
            'midweek',
            detail.title || 'நடுவாரக் கூட்டம்'
          );
        }

        setMidweekData(prev => ({
          ...prev,
          theme: detail.title || prev.theme,
          weekDateRange: currentWeek?.week_label || prev.weekDateRange,
        }));
      }

      // 3. Identify the active Weekend meeting (prioritize current week)
      const activeWeekend =
        currentWeek?.weekend ||
        meetings.find(m => m.meeting_type === 'weekend');

      if (activeWeekend) {
        const detail: BackendMeetingDetail =
          'questions' in activeWeekend &&
          Array.isArray((activeWeekend as any).questions) &&
          (activeWeekend as any).questions.length > 0
            ? (activeWeekend as BackendMeetingDetail)
            : await meetingApiService.getMeetingById(activeWeekend.id);

        if (detail && detail.questions && detail.questions.length > 0) {
          registerBackendQuestions(
            detail.questions,
            'weekend',
            detail.title || 'வார இறுதி கூட்டம்'
          );
        }

        const formattedDate = new Intl.DateTimeFormat('ta-IN', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }).format(new Date(detail.meeting_date));

        setWeekendData(prev => ({
          ...prev,
          meetingDate: `${formattedDate} (ஞாயிற்றுக்கிழமை)`,
          watchtowerStudy: {
            ...prev.watchtowerStudy,
            articleTitle: detail.title || prev.watchtowerStudy.articleTitle,
          },
        }));
      }
    } catch (err) {
      console.warn('Failed to load meetings from backend, using cached:', err);
    }
  }, []);

  // Explicitly sync weekly meetings from JW.org
  const syncJWMeetings = useCallback(
    async (forceRefresh = false) => {
      const result = await meetingApiService.syncJWMeetings({
        language: 'ta',
        force_refresh: forceRefresh,
      });
      await refreshMeetings();
      return result;
    },
    [refreshMeetings]
  );

  // Initialize storage & test backend connection
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const [storedAnswers, storedSettings, storedRecents] =
          await Promise.all([
            storageService.getSavedAnswers(),
            storageService.getSettings(),
            storageService.getRecentQuestions(),
          ]);

        if (isMounted) {
          setSavedAnswers(storedAnswers);
          setSettings(storedSettings);
          setRecentQuestions(storedRecents);
          setIsStorageReady(true);

          if (storedSettings.apiUrl) {
            apiClient.setBaseUrl(storedSettings.apiUrl);
          }
        }

        // Probe backend in background
        const health = await apiClient.checkHealth();
        if (isMounted) {
          setIsBackendOnline(health.isOnline);
          setBackendLatencyMs(health.latencyMs || null);
          setBackendError(health.error || null);

          if (health.isOnline) {
            refreshMeetings();
            syncSavedAnswers();
            refreshHistory();
          }
        }
      } catch (err) {
        console.warn('Initialization notice:', err);
        if (isMounted) {
          setIsStorageReady(true);
          setIsBackendOnline(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [refreshMeetings, syncSavedAnswers, refreshHistory]);

  // Compute active dark mode based on settings or system
  const isDark = useMemo(() => {
    if (settings.theme === 'dark') return true;
    if (settings.theme === 'light') return false;
    return systemColorScheme === 'dark';
  }, [settings.theme, systemColorScheme]);

  const colors = isDark ? Colors.dark : Colors.light;

  // Compute font scale multiplier
  const fontScaleMultiplier = useMemo(() => {
    switch (settings.fontScale) {
      case 'large':
        return 1.15;
      case 'extraLarge':
        return 1.3;
      case 'normal':
      default:
        return 1.0;
    }
  }, [settings.fontScale]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      storageService.saveSettings(updated);
      if (updated.apiUrl) {
        apiClient.setBaseUrl(updated.apiUrl);
      }
      return updated;
    });
  };

  const addAnswer = (answer: Omit<SavedAnswer, 'id' | 'updatedAt'>) => {
    const today = new Intl.DateTimeFormat('ta-IN', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());

    const localId = `ans-${Date.now()}`;
    const newEntry: SavedAnswer = {
      ...answer,
      id: localId,
      updatedAt: today,
    };

    setSavedAnswers(prev => {
      const updated = [newEntry, ...prev];
      storageService.saveAnswers(updated);
      return updated;
    });

    // Sync to backend SQLite database in background
    savedAnswerApiService
      .createSavedAnswer({
        custom_title: answer.itemReference || answer.sectionLabel,
        answer_text: answer.answerText,
        answer_type: 'short',
        notes: answer.scripture
          ? `வேத வசனம்: ${answer.scripture}`
          : undefined,
      })
      .then(saved => {
        if (saved && saved.id) {
          // Replace temporary local ID with backend UUID
          setSavedAnswers(prev => {
            const synced = prev.map(item =>
              item.id === localId ? { ...item, id: saved.id } : item
            );
            storageService.saveAnswers(synced);
            return synced;
          });
        }
      })
      .catch(err => {
        console.warn('Backend save deferred / offline:', err?.message || err);
      });
  };

  const updateAnswer = (
    id: string,
    updatedFields: Partial<Omit<SavedAnswer, 'id'>>
  ) => {
    const today = new Intl.DateTimeFormat('ta-IN', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());

    setSavedAnswers(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, ...updatedFields, updatedAt: today } : item
      );
      storageService.saveAnswers(updated);
      return updated;
    });

    // If ID is a backend UUID, update SQLite backend
    if (id.length > 20 && id.includes('-')) {
      savedAnswerApiService
        .updateSavedAnswer(id, {
          custom_title: updatedFields.itemReference,
          answer_text: updatedFields.answerText,
          notes: updatedFields.scripture,
        })
        .catch(err => console.warn('Backend update failed:', err));
    }
  };

  const deleteAnswer = (id: string) => {
    setSavedAnswers(prev => {
      const updated = prev.filter(item => item.id !== id);
      storageService.saveAnswers(updated);
      return updated;
    });

    // If ID is a backend UUID, delete from SQLite
    if (id.length > 20 && id.includes('-')) {
      savedAnswerApiService
        .deleteSavedAnswer(id)
        .catch(err => console.warn('Backend delete failed:', err));
    }
  };

  const toggleFavorite = (id: string) => {
    setSavedAnswers(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      storageService.saveAnswers(updated);
      return updated;
    });
  };

  const recordQuestionView = async (
    item: Omit<RecentQuestionItem, 'viewedAt'>
  ) => {
    const updated = await storageService.addRecentQuestion(item);
    setRecentQuestions(updated);
  };

  const clearRecentQuestions = async () => {
    await storageService.clearRecentQuestions();
    setRecentQuestions([]);
  };

  const deleteHistoryItem = async (id: string) => {
    setSearchHistory(prev => prev.filter(h => h.id !== id));
    try {
      await searchApiService.deleteHistoryItem(id);
    } catch (err) {
      console.warn('Backend history delete failed:', err);
    }
  };

  const clearSearchHistory = async () => {
    setSearchHistory([]);
    try {
      await searchApiService.clearHistory();
    } catch (err) {
      console.warn('Backend clear history failed:', err);
    }
  };

  const askIndependentQuestion = async (
    query: string,
    answerType: 'short' | 'detailed' = 'short'
  ): Promise<AnswerGenerateResponse> => {
    const response = await answerApiService.askIndependentQuestion(query, {
      answerType,
      saveToHistory: true,
    });
    // Refresh history in background
    refreshHistory();
    return response;
  };

  const searchKnowledge = async (
    query: string,
    options?: { top_k?: number; source_type?: string; min_score?: number }
  ): Promise<BackendSearchResponse> => {
    return searchApiService.searchKnowledge({
      query,
      top_k: options?.top_k || 5,
      source_type: options?.source_type,
      min_score: options?.min_score,
    });
  };

  const clearAllData = async () => {
    const reset = await storageService.clearAllData();
    setSavedAnswers(reset.answers);
    setSettings(reset.settings);
    setRecentQuestions(reset.recentQuestions);
    setSearchHistory([]);
    try {
      await searchApiService.clearHistory();
    } catch {
      // offline
    }
  };

  return (
    <AppContext.Provider
      value={{
        isStorageReady,
        isBackendOnline,
        backendLatencyMs,
        backendError,
        testBackendConnection,
        savedAnswers,
        addAnswer,
        updateAnswer,
        deleteAnswer,
        toggleFavorite,
        syncSavedAnswers,
        recentQuestions,
        recordQuestionView,
        clearRecentQuestions,
        searchHistory,
        refreshHistory,
        deleteHistoryItem,
        clearSearchHistory,
        askIndependentQuestion,
        searchKnowledge,
        midweekData,
        weekendData,
        backendMeetings,
        refreshMeetings,
        syncJWMeetings,
        settings,
        updateSettings,
        clearAllData,
        isDark,
        colors,
        fontScaleMultiplier,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
