import { useState, useEffect, useRef } from 'react';
import LanguageSelector from './components/LanguageSelector';
import TopicMenu from './components/TopicMenu';
import Flashcard from './components/Flashcard';
import GrammarCard from './components/GrammarCard';
import { translations, getUILanguage, isRTL, type Language } from './i18n/translations';
import GuidesMenu from './components/GuidesMenu';
import SearchBar from './components/SearchBar';
import WordModal from './components/WordModal';
import WriteMode from './components/WriteMode';
import QuizMode from './components/QuizMode';
import { addFocusError, getFavorites, getFocusErrors, updateStreak } from './utils/storage';
import UpdateChecker from './components/UpdateChecker';

interface Word {
  id: string;
  word: string;
  pronunciation: string;
  meaning: string;
  examples: string[];
  language: string;
  topic: string;
  genre?: string;
}

const TOPIC_BATCH_SIZE = 10;
const TOPIC_BATCH_PASS_SCORE = 7;

// Load data directly from JSON — no backend needed
let allWordsCache: Word[] | null = null;

async function loadAllWords(): Promise<Word[]> {
  if (allWordsCache) return allWordsCache;
  const res = await fetch('/flashcards.words.json');
  const data = await res.json();
  allWordsCache = data.map((w: Omit<Word, 'id'>, i: number) => ({ ...w, id: String(i) }));
  return allWordsCache!;
}

function getLanguages(words: Word[]): string[] {
  return [...new Set(words.map(w => w.language))].filter(l => l === 'Hebreo' || l === 'Español');
}

function getTopics(words: Word[], language: string): string[] {
  return [...new Set(words.filter(w => w.language === language).map(w => w.topic))];
}

function getWordsByTopic(words: Word[], language: string, topic: string): Word[] {
  return words.filter(w => w.language === language && w.topic === topic);
}

// Funciones para manejar localStorage - ahora incluye focus
const getShownWords = (language: string, mode: 'blitz' | 'bullet' | 'focus'): string[] => {
  const key = `shown_${mode}_${language}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

const addShownWord = (language: string, mode: 'blitz' | 'bullet' | 'focus', wordId: string) => {
  const key = `shown_${mode}_${language}`;
  const shown = getShownWords(language, mode);
  if (!shown.includes(wordId)) {
    shown.push(wordId);
    localStorage.setItem(key, JSON.stringify(shown));
  }
};

const clearShownWords = (language: string, mode: 'blitz' | 'bullet' | 'focus') => {
  const key = `shown_${mode}_${language}`;
  localStorage.removeItem(key);
};

const getTopicFlowStorageKey = (language: string, topic: string) =>
  `topic_flow_${language}_${topic}`;

const getSavedTopicBatchStart = (language: string, topic: string, topicWordsCount: number): number => {
  if (!language || !topic || topicWordsCount <= 0) return 0;
  const raw = localStorage.getItem(getTopicFlowStorageKey(language, topic));
  if (!raw) return 0;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;

  const maxStart = Math.floor((topicWordsCount - 1) / TOPIC_BATCH_SIZE) * TOPIC_BATCH_SIZE;
  const clamped = Math.min(parsed, maxStart);
  return Math.floor(clamped / TOPIC_BATCH_SIZE) * TOPIC_BATCH_SIZE;
};

const saveTopicBatchStart = (language: string, topic: string, batchStart: number) => {
  if (!language || !topic) return;
  localStorage.setItem(getTopicFlowStorageKey(language, topic), String(Math.max(0, batchStart)));
};

type TopicAttempt = { correct: number; incorrect: number; at: string };
type SrsCard = { dueDate: string; intervalDays: number; lapseCount: number };
type DailyGoalProgress = { date: string; blocksDone: number; smartReviewed: number };
type ErrorEvent = { wordId: string; at: string };
type DailyFailureMap = Record<string, number>;

const TOPIC_ATTEMPTS_KEY = (language: string, topic: string) => `topic_attempts_${language}_${topic}`;
const TOPIC_ERRORS_KEY = (language: string) => `topic_errors_${language}`;
const SRS_KEY = 'desktop_srs_cards_v1';
const DAILY_GOAL_KEY = 'desktop_daily_goal_v1';
const DESKTOP_SRS_NOTIFY_KEY = 'desktop_srs_notify_date_v1';
const DAILY_FAILS_KEY = (date: string) => `daily_fails_${date}`;
const SELECTED_LANGUAGE_KEY = 'selected_language';

const toYmd = (date = new Date()) => date.toISOString().slice(0, 10);
const addDays = (ymd: string, days: number): string => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toYmd(d);
};

const getTopicAttempts = (language: string, topic: string): TopicAttempt[] => {
  const raw = localStorage.getItem(TOPIC_ATTEMPTS_KEY(language, topic));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TopicAttempt[];
  } catch {
    return [];
  }
};

const saveTopicAttempt = (language: string, topic: string, attempt: TopicAttempt) => {
  const prev = getTopicAttempts(language, topic);
  const next = [...prev, attempt].slice(-20);
  localStorage.setItem(TOPIC_ATTEMPTS_KEY(language, topic), JSON.stringify(next));
};

const getAdaptivePassScore = (language: string, topic: string, batchSize: number): number => {
  const attempts = getTopicAttempts(language, topic);
  const recent = attempts.slice(-5);
  const accuracy = recent.length === 0
    ? 0.7
    : recent.reduce((acc, it) => acc + (it.correct / Math.max(1, it.correct + it.incorrect)), 0) / recent.length;

  const hardTopic =
    topic === 'Verbos'
    || topic === 'Adverbios'
    || topic === 'Locuciones adverbiales';

  let target = hardTopic ? 8 : 7;
  if (accuracy >= 0.85) target += 1;
  else if (accuracy <= 0.5) target -= 1;
  return Math.min(batchSize, Math.max(5, target));
};

const getErrorEvents = (language: string): ErrorEvent[] => {
  const raw = localStorage.getItem(TOPIC_ERRORS_KEY(language));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ErrorEvent[];
  } catch {
    return [];
  }
};

const logErrorEvent = (language: string, wordId: string) => {
  const now: ErrorEvent = { wordId, at: new Date().toISOString() };
  const prev = getErrorEvents(language);
  const next = [...prev, now].slice(-300);
  localStorage.setItem(TOPIC_ERRORS_KEY(language), JSON.stringify(next));
};

const getSrsCards = (): Record<string, SrsCard> => {
  const raw = localStorage.getItem(SRS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, SrsCard>;
  } catch {
    return {};
  }
};

const saveSrsCards = (cards: Record<string, SrsCard>) => {
  localStorage.setItem(SRS_KEY, JSON.stringify(cards));
};

const updateSrsAfterAnswer = (wordId: string, correct: boolean) => {
  const today = toYmd();
  const cards = getSrsCards();
  const current = cards[wordId] ?? { dueDate: today, intervalDays: 1, lapseCount: 0 };
  if (correct) {
    const nextInterval = Math.min(14, Math.max(1, Math.round(current.intervalDays * 1.8)));
    cards[wordId] = { dueDate: addDays(today, nextInterval), intervalDays: nextInterval, lapseCount: current.lapseCount };
  } else {
    cards[wordId] = { dueDate: addDays(today, 1), intervalDays: 1, lapseCount: current.lapseCount + 1 };
  }
  saveSrsCards(cards);
};

const getDailyGoal = (): DailyGoalProgress => {
  const today = toYmd();
  const raw = localStorage.getItem(DAILY_GOAL_KEY);
  if (!raw) {
    const init = { date: today, blocksDone: 0, smartReviewed: 0 };
    localStorage.setItem(DAILY_GOAL_KEY, JSON.stringify(init));
    return init;
  }
  try {
    const parsed = JSON.parse(raw) as DailyGoalProgress;
    if (parsed.date === today) return parsed;
    const reset = { date: today, blocksDone: 0, smartReviewed: 0 };
    localStorage.setItem(DAILY_GOAL_KEY, JSON.stringify(reset));
    return reset;
  } catch {
    const reset = { date: today, blocksDone: 0, smartReviewed: 0 };
    localStorage.setItem(DAILY_GOAL_KEY, JSON.stringify(reset));
    return reset;
  }
};

const saveDailyGoal = (goal: DailyGoalProgress) => {
  localStorage.setItem(DAILY_GOAL_KEY, JSON.stringify(goal));
};

const getDailyFailures = (date = toYmd()): DailyFailureMap => {
  const raw = localStorage.getItem(DAILY_FAILS_KEY(date));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DailyFailureMap;
  } catch {
    return {};
  }
};

const saveDailyFailure = (wordId: string, date = toYmd()): number => {
  const current = getDailyFailures(date);
  const nextCount = (current[wordId] ?? 0) + 1;
  const next: DailyFailureMap = { ...current, [wordId]: nextCount };
  localStorage.setItem(DAILY_FAILS_KEY(date), JSON.stringify(next));
  return nextCount;
};

const getHighPriorityWordIds = (date = toYmd(), threshold = 3): string[] => {
  const map = getDailyFailures(date);
  return Object.entries(map)
    .filter(([, count]) => count >= threshold)
    .map(([wordId]) => wordId);
};

function App() {
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [topicWords, setTopicWords] = useState<Word[]>([]);
  const [topicCoreBatchWords, setTopicCoreBatchWords] = useState<Word[]>([]);
  const [topicBatchStart, setTopicBatchStart] = useState(0);
  const [topicPracticeWords, setTopicPracticeWords] = useState<Word[] | null>(null);
  const [topicPracticeSummary, setTopicPracticeSummary] = useState<{ correct: number; incorrect: number; passed: boolean } | null>(null);
  const [topicPracticeFailedIds, setTopicPracticeFailedIds] = useState<string[]>([]);
  const [topicRecoveryWords, setTopicRecoveryWords] = useState<Word[] | null>(null);
  const [topicRecoverySummary, setTopicRecoverySummary] = useState<{ correct: number; incorrect: number } | null>(null);
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem(SELECTED_LANGUAGE_KEY) ?? '');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(true);
  const [autoPlayMode, setAutoPlayMode] = useState<'blitz' | 'bullet' | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  
  // Focus mode states
  const [focusMode, setFocusMode] = useState(false);
  const [focusCorrectCount, setFocusCorrectCount] = useState(0);
  const [focusIncorrectCount, setFocusIncorrectCount] = useState(0);
  const [focusShowingSummary, setFocusShowingSummary] = useState(false);
  
  // Back-only mode (solo aplica en temas, no en modos)
  const [backOnlyMode, setBackOnlyMode] = useState(false);

  // Write mode
  const [writeMode, setWriteMode] = useState(false);
  const [writeSummary, setWriteSummary] = useState<{ correct: number; incorrect: number } | null>(null);

  // Quiz mode
  const [quizMode, setQuizMode] = useState(false);
  const [quizSummary, setQuizSummary] = useState<{ correct: number; incorrect: number } | null>(null);

  // Countdown state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState<number | string>(3);

  // Search
  const [searchWord, setSearchWord] = useState<Word | null>(null);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  // Streak
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const s = updateStreak();
    setStreak(s.currentStreak);
  }, []);

  // Word of the day
  const [wordOfDay, setWordOfDay] = useState<Word | null>(null);
  const [wordOfDayFlipped, setWordOfDayFlipped] = useState(false);
  const [smartReviewMode, setSmartReviewMode] = useState(false);
  const [dailyGoal, setDailyGoal] = useState<DailyGoalProgress>(() => getDailyGoal());

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    localStorage.setItem(SELECTED_LANGUAGE_KEY, lang);
  };

  // Word of the day: flip to back after 3s, close after 5s more
  useEffect(() => {
    if (!wordOfDay) return;
    const flipTimer = setTimeout(() => setWordOfDayFlipped(true), 3000);
    const closeTimer = setTimeout(() => setWordOfDay(null), 8000);
    return () => { clearTimeout(flipTimer); clearTimeout(closeTimer); };
  }, [wordOfDay?.id]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    setDailyGoal(getDailyGoal());
  }, []);

  // Determinar el idioma de la UI basado en el idioma de aprendizaje
  const uiLanguage: Language = selectedLanguage ? getUILanguage(selectedLanguage) : 'es';
  const t = translations[uiLanguage];
  const topicFlowLabels = {
    practiceNow: uiLanguage === 'he' ? 'תרגל עכשיו' : 'Practicar ahora',
    nextBlock: uiLanguage === 'he' ? '10 המילים הבאות' : 'Siguientes 10 palabras',
    retryPractice: uiLanguage === 'he' ? 'תרגל שוב' : 'Practicar otra vez',
    topicDone: uiLanguage === 'he' ? 'נושא הושלם' : 'Tema completado',
    unlocked: uiLanguage === 'he' ? 'פתחת את הבלוק הבא' : 'Desbloqueaste el siguiente bloque',
    needMore: uiLanguage === 'he' ? 'צריך לפחות 7 נכונות כדי להמשיך' : 'Necesitas al menos 7 correctas para continuar',
    learnedPrompt: uiLanguage === 'he' ? 'בוא נתרגל את מה שלמדת' : 'Vamos a practicar lo aprendido',
    learnedSub: uiLanguage === 'he' ? 'כשיש לך 7 מתוך 10 נכונות, נפתח את 10 המילים הבאות.' : 'Si aciertas 7 de 10, se desbloquean las siguientes 10 palabras.',
    progressOfTopic: uiLanguage === 'he' ? 'התקדמות בנושא' : 'Progreso del tema',
    blockOf: uiLanguage === 'he' ? 'בלוק' : 'Bloque',
    resumed: uiLanguage === 'he' ? 'Retomado' : 'Retomado',
    unlockRule: uiLanguage === 'he' ? 'צריך לפחות {count} נכונות כדי לפתוח את הבלוק הבא.' : 'Necesitas al menos {count} correctas para desbloquear el siguiente bloque.',
    trend: uiLanguage === 'he' ? 'Tendencia' : 'Tendencia',
    recoveryTitle: uiLanguage === 'he' ? 'Recuperación inmediata' : 'Recuperación inmediata',
    recoverySub: uiLanguage === 'he' ? 'Vamos a reforzar solo las falladas y luego reintentas el bloque.' : 'Vamos a reforzar solo las falladas y luego reintentas el bloque.',
    retryBlockNow: uiLanguage === 'he' ? 'Reintentar bloque ahora' : 'Reintentar bloque ahora',
    exitToMenu: uiLanguage === 'he' ? 'יציאה' : 'Salir',
  };
  const learningLabels = {
    smartReview: uiLanguage === 'he' ? 'חזרה חכמה' : 'Repaso inteligente',
    smartReviewHint: uiLanguage === 'he' ? 'טעויות נפוצות + כרטיסים שפגו' : 'errores frecuentes + tarjetas vencidas',
    noReviewDue: uiLanguage === 'he' ? 'אין חזרה ממתינה כרגע.' : 'No hay repaso pendiente por ahora.',
    goalTitle: uiLanguage === 'he' ? 'מטרה יומית' : 'Meta diaria',
    goalBlocks: uiLanguage === 'he' ? 'בלוקים' : 'Bloques',
    goalReview: uiLanguage === 'he' ? 'חזרה' : 'Repaso',
  };
  const uiRTL = isRTL(uiLanguage);
  
  // Detectar si corre dentro de Tauri
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
  
  // Determinar si el idioma de aprendizaje es RTL
  const learningRTL = selectedLanguage === 'Hebreo';
  const getTopicBatch = (list: Word[], start: number): Word[] => list.slice(start, start + TOPIC_BATCH_SIZE);
  const getTopicInterleavePool = (fullTopicWords: Word[], batchStart: number): Word[] => {
    if (!selectedLanguage || batchStart <= 0) return [];
    const previousWords = fullTopicWords.slice(0, batchStart);
    if (previousWords.length === 0) return [];

    const today = toYmd();
    const dueIds = new Set(
      Object.entries(getSrsCards())
        .filter(([, card]) => card.dueDate <= today)
        .map(([id]) => id),
    );
    const highPriorityIds = new Set(getHighPriorityWordIds(today, 3));

    const prioritized = previousWords.filter((w) => highPriorityIds.has(w.id));
    const due = previousWords.filter((w) => dueIds.has(w.id) && !highPriorityIds.has(w.id));
    const rest = previousWords.filter((w) => !highPriorityIds.has(w.id) && !dueIds.has(w.id));
    return [...prioritized, ...due, ...rest];
  };
  const buildTopicStudySequence = (coreBatch: Word[], interleavePool: Word[]): Word[] => {
    if (coreBatch.length === 0) return [];
    if (interleavePool.length === 0) return coreBatch;

    const sequence: Word[] = [];
    let reviewIdx = 0;
    coreBatch.forEach((word, idx) => {
      sequence.push(word);
      if ((idx + 1) % 4 === 0) {
        sequence.push(interleavePool[reviewIdx % interleavePool.length]);
        reviewIdx += 1;
      }
    });
    return sequence;
  };
  const hasTopicFlow = !smartReviewMode && !autoPlayMode && !focusMode && !writeMode && !quizMode && !!selectedTopic && !selectedTopic.includes('Mode') && topicWords.length > 0;
  const topicBatchEnd = hasTopicFlow ? Math.min(topicBatchStart + topicCoreBatchWords.length, topicWords.length) : words.length;
  const hasMoreTopicBatches = hasTopicFlow && topicBatchStart + TOPIC_BATCH_SIZE < topicWords.length;
  const totalTopicBlocks = hasTopicFlow ? Math.ceil(topicWords.length / TOPIC_BATCH_SIZE) : 0;
  const currentTopicBlock = hasTopicFlow ? Math.floor(topicBatchStart / TOPIC_BATCH_SIZE) + 1 : 0;
  const topicProgressPercent = hasTopicFlow && topicWords.length > 0
    ? Math.round((topicBatchEnd / topicWords.length) * 100)
    : 0;
  const topicPracticeNeeded = hasTopicFlow
    ? Math.min(getAdaptivePassScore(selectedLanguage, selectedTopic, topicCoreBatchWords.length || TOPIC_BATCH_SIZE), topicCoreBatchWords.length || TOPIC_BATCH_SIZE)
    : TOPIC_BATCH_PASS_SCORE;
  const topicUnlockRuleText = topicFlowLabels.unlockRule.replace('{count}', String(topicPracticeNeeded));
  const recentTopicAttempts = hasTopicFlow ? getTopicAttempts(selectedLanguage, selectedTopic).slice(-5) : [];
  const topicTrendText = recentTopicAttempts.length > 0
    ? recentTopicAttempts.map((it) => `${Math.round((it.correct / Math.max(1, it.correct + it.incorrect)) * 100)}%`).join(' • ')
    : '—';
  const blocksGoalTarget = 2;
  const reviewGoalTarget = 10;
  const goalBlocksPct = Math.min(100, Math.round((dailyGoal.blocksDone / blocksGoalTarget) * 100));
  const goalReviewPct = Math.min(100, Math.round((dailyGoal.smartReviewed / reviewGoalTarget) * 100));

  // Aplicar dirección RTL al documento para la UI
  useEffect(() => {
    document.documentElement.dir = uiRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = uiLanguage;
  }, [uiRTL, uiLanguage]);

  // Load JSON on mount + word of the day
  useEffect(() => {
    loadAllWords().then(data => {
      setAllWords(data);
      setLanguages(getLanguages(data));

      // Word of the day logic — show only once per day
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const storedDate = localStorage.getItem('wod_date');
      const storedId   = localStorage.getItem('wod_id');
      const seenToday  = localStorage.getItem('wod_seen') === today;

      if (!seenToday) {
        let wod: Word | undefined;
        if (storedDate === today && storedId) {
          wod = data.find((w: Word) => w.id === storedId);
        }
        if (!wod) {
          const pool = data.filter((w: Word) => !['Gramática', 'Raíz'].includes(w.topic));
          wod = pool[Math.floor(Math.random() * pool.length)];
          localStorage.setItem('wod_date', today);
          localStorage.setItem('wod_id', wod.id);
        }
        localStorage.setItem('wod_seen', today);
        setWordOfDay(wod);
      }
    });
  }, []);

  // Notificación local desktop (Tauri): recordar repaso SRS pendiente una vez por día
  useEffect(() => {
    if (!isTauri || allWords.length === 0) return;

    const today = toYmd();
    if (localStorage.getItem(DESKTOP_SRS_NOTIFY_KEY) === today) return;

    const cards = getSrsCards();
    const dueIds = Object.entries(cards)
      .filter(([, card]) => card.dueDate <= today)
      .map(([id]) => id);
    if (dueIds.length === 0) return;

    const dueCount = selectedLanguage
      ? allWords.filter((w) => dueIds.includes(w.id) && w.language === selectedLanguage).length
      : dueIds.length;
    if (dueCount <= 0) return;

    (async () => {
      try {
        const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
        let permission = await isPermissionGranted();
        if (!permission) {
          permission = (await requestPermission()) === 'granted';
        }
        if (!permission) return;

        await sendNotification({
          title: 'Repaso pendiente',
          body: `Tienes ${dueCount} tarjetas listas para repasar en desktop.`,
        });
        localStorage.setItem(DESKTOP_SRS_NOTIFY_KEY, today);
      } catch {
        // Ignore: no bloquea el flujo de aprendizaje si notificaciones fallan.
      }
    })();
  }, [isTauri, allWords, selectedLanguage]);

  useEffect(() => {
    if (selectedLanguage && allWords.length > 0) {
      setTopics(getTopics(allWords, selectedLanguage));
      setSelectedTopic('');
      setWords([]);
      setTopicWords([]);
      setTopicCoreBatchWords([]);
      setTopicBatchStart(0);
      setTopicPracticeWords(null);
      setTopicPracticeSummary(null);
      setTopicPracticeFailedIds([]);
      setTopicRecoveryWords(null);
      setTopicRecoverySummary(null);
      setSmartReviewMode(false);
      setMenuVisible(true);
      clearShownWords(selectedLanguage, 'blitz');
      clearShownWords(selectedLanguage, 'bullet');
      clearShownWords(selectedLanguage, 'focus');
    }
  }, [selectedLanguage, allWords]);

  useEffect(() => {
    if (!selectedLanguage) return;
    if (languages.length > 0 && !languages.includes(selectedLanguage)) {
      setSelectedLanguage('');
      localStorage.removeItem(SELECTED_LANGUAGE_KEY);
    }
  }, [languages, selectedLanguage]);

  useEffect(() => {
    if (selectedLanguage && selectedTopic && !selectedTopic.includes('Mode') && allWords.length > 0) {
      const nextTopicWords = getWordsByTopic(allWords, selectedLanguage, selectedTopic);
      const savedBatchStart = getSavedTopicBatchStart(selectedLanguage, selectedTopic, nextTopicWords.length);
      setTopicWords(nextTopicWords);
      setTopicBatchStart(savedBatchStart);
      const nextCoreBatch = getTopicBatch(nextTopicWords, savedBatchStart);
      const interleavePool = getTopicInterleavePool(nextTopicWords, savedBatchStart);
      const topicStudySequence = buildTopicStudySequence(nextCoreBatch, interleavePool);
      setTopicCoreBatchWords(nextCoreBatch);
      setTopicPracticeWords(null);
      setTopicPracticeSummary(null);
      setTopicPracticeFailedIds([]);
      setTopicRecoveryWords(null);
      setTopicRecoverySummary(null);
      setSmartReviewMode(false);
      setWords(topicStudySequence);
      setCurrentIndex(0);
      setMenuVisible(false);
      setAutoPlayMode(null);
      setFocusMode(false);
      setWriteMode(false);
      setQuizMode(false);
      setWriteSummary(null);
      setQuizSummary(null);
      setIsFlipped(backOnlyMode);
      setIsComplete(false);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }
  }, [selectedLanguage, selectedTopic, allWords, backOnlyMode]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlayMode && words.length > 0 && !isComplete) {
      // Modos Blitz y Bullet
      const frontDisplayTime = autoPlayMode === 'blitz' ? 3000 : 1000;
      
      const runSequence = () => {
        // Paso 1: Mostrar frente (3s Blitz, 1s Bullet)
        setIsFlipped(false);
        
        timeoutRef.current = setTimeout(() => {
          // Paso 2: Voltear para mostrar atrás
          setIsFlipped(true);
          
          timeoutRef.current = setTimeout(() => {
            // Paso 3: Voltear de vuelta al frente
            setIsFlipped(false);
            
            timeoutRef.current = setTimeout(() => {
              // Marcar palabra como mostrada ANTES de cambiar de índice
              const currentWord = words[currentIndex];
              if (currentWord && currentWord.id) {
                addShownWord(selectedLanguage, autoPlayMode, currentWord.id);
              }
              
              // Paso 4: Cambiar a la siguiente palabra
              if (currentIndex < words.length - 1) {
                setCurrentIndex(currentIndex + 1);
              } else {
                // Llegamos al final
                setIsComplete(true);
                setAutoPlayMode(null);
              }
            }, 600); // Tiempo de animación de volteo
            
          }, 1000); // 1 segundo mostrando el reverso
          
        }, frontDisplayTime); // Tiempo mostrando el frente (3s Blitz, 1s Bullet)
      };
      
      runSequence();

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [autoPlayMode, words, currentIndex, isComplete, selectedLanguage]);

  const stopAutoPlay = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Solo regresar al menú si realmente estaba en modo auto-play
    if (autoPlayMode) {
      setAutoPlayMode(null);
      setIsFlipped(false);
      setIsComplete(false);
      setWords([]);
      setSelectedTopic('');
      setCurrentIndex(0);
      setMenuVisible(true);
    }
  };

  const startCountdown = (callback: () => void) => {
    setShowCountdown(true);
    setCountdownNumber(3);
    
    // Iniciar cuenta regresiva
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNumber(count);
      } else {
        clearInterval(countdownInterval);
        setShowCountdown(false);
        callback();
      }
    }, 1000);
  };

  const EXCLUDED_TOPICS = ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)'];

  const resetTopicGateFlow = () => {
    setTopicPracticeWords(null);
    setTopicPracticeSummary(null);
    setTopicPracticeFailedIds([]);
    setTopicRecoveryWords(null);
    setTopicRecoverySummary(null);
    setShowRecoveryInfo(false);
  };

  useEffect(() => {
    if (!topicRecoveryWords) return;
    setShowRecoveryInfo(true);
    const timer = window.setTimeout(() => setShowRecoveryInfo(false), 10000);
    return () => window.clearTimeout(timer);
  }, [topicRecoveryWords]);

  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic);
    resetTopicGateFlow();
    setWriteMode(false);
    setQuizMode(false);
    setWriteSummary(null);
    setQuizSummary(null);
    setIsComplete(false);
    setSmartReviewMode(false);
  };

  const getWordsForMode = (): Word[] => {
    const shuffled = allWords
      .filter(w => w.language === selectedLanguage && !EXCLUDED_TOPICS.includes(w.topic))
      .sort(() => Math.random() - 0.5);
    return shuffled;
  };

  const handleBlitzMode = async () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
    resetTopicGateFlow();
    setSmartReviewMode(false);
    setMenuVisible(false);
    const pool = getWordsForMode();
    const shownIds = getShownWords(selectedLanguage, 'blitz');
    const unseen = pool.filter(w => !shownIds.includes(w.id));
    const toShow = unseen.length > 0 ? unseen : pool;
    if (unseen.length === 0) clearShownWords(selectedLanguage, 'blitz');
    const shuffled = [...toShow].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setSelectedTopic('Blitz Mode');
    startCountdown(() => { setAutoPlayMode('blitz'); setIsComplete(false); });
  };

  const handleBulletMode = async () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
    resetTopicGateFlow();
    setSmartReviewMode(false);
    setMenuVisible(false);
    const pool = getWordsForMode();
    const shownIds = getShownWords(selectedLanguage, 'bullet');
    const unseen = pool.filter(w => !shownIds.includes(w.id));
    const toShow = unseen.length > 0 ? unseen : pool;
    if (unseen.length === 0) clearShownWords(selectedLanguage, 'bullet');
    const shuffled = [...toShow].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setSelectedTopic('Bullet Mode');
    startCountdown(() => { setAutoPlayMode('bullet'); setIsComplete(false); });
  };

  const handleFocusMode = async () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
    resetTopicGateFlow();
    setSmartReviewMode(false);
    setMenuVisible(false);
    const pool = getWordsForMode();
    const shownIds = getShownWords(selectedLanguage, 'focus');
    const unseen = pool.filter(w => !shownIds.includes(w.id));
    const toShow = unseen.length > 0 ? unseen : pool;
    if (unseen.length === 0) clearShownWords(selectedLanguage, 'focus');
    const shuffled = [...toShow].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setSelectedTopic('Focus Mode');
    setFocusMode(true);
    setFocusCorrectCount(0);
    setFocusIncorrectCount(0);
    setFocusShowingSummary(false);
    setIsFlipped(false);
    setIsComplete(false);
    timeoutRef.current = window.setTimeout(() => { setIsFlipped(true); }, 5000);
  };

  const handleWriteMode = () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
    resetTopicGateFlow();
    setSmartReviewMode(false);
    setMenuVisible(false);
    const pool = getWordsForMode();
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setSelectedTopic('Write Mode');
    setWriteMode(true);
    setWriteSummary(null);
    setFocusMode(false);
    setIsFlipped(false);
    setIsComplete(false);
  };

  const handleFocusCorrect = () => {    // Marcar palabra como mostrada
    const currentWord = words[currentIndex];
    addShownWord(selectedLanguage, 'focus', currentWord.id);
    updateSrsAfterAnswer(currentWord.id, true);
    
    setFocusCorrectCount(prev => prev + 1);
    moveToNextFocusWord();
  };

  const handleFocusIncorrect = () => {
    const currentWord = words[currentIndex];
    addShownWord(selectedLanguage, 'focus', currentWord.id);
    addFocusError(selectedLanguage, currentWord.id); // guardar en historial
    logErrorEvent(selectedLanguage, currentWord.id);
    saveDailyFailure(currentWord.id);
    updateSrsAfterAnswer(currentWord.id, false);
    setFocusIncorrectCount(prev => prev + 1);
    moveToNextFocusWord();
  };

  const moveToNextFocusWord = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (currentIndex < words.length - 1) {
      // Hay más palabras
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
      
      // Mostrar frente por 5 segundos, luego voltear
      timeoutRef.current = window.setTimeout(() => {
        setIsFlipped(true);
      }, 5000);
    } else {
      // Terminamos todas las palabras
      setFocusShowingSummary(true);
    }
  };

  const handleFocusStop = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setFocusShowingSummary(true);
  };

  const stopFocusMode = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setFocusMode(false);
    setFocusCorrectCount(0);
    setFocusIncorrectCount(0);
    setFocusShowingSummary(false);
    setIsFlipped(false);
  };

  const stopWriteMode = () => {
    setWriteMode(false);
    setWriteSummary(null);
  };

  const handleQuizMode = () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
    resetTopicGateFlow();
    setSmartReviewMode(false);
    setMenuVisible(false);
    const pool = getWordsForMode();
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setSelectedTopic('Quiz Mode');
    setQuizMode(true);
    setQuizSummary(null);
    setWriteMode(false);
    setFocusMode(false);
    setIsFlipped(false);
    setIsComplete(false);
  };

  const stopQuizMode = () => {
    setQuizMode(false);
    setQuizSummary(null);
  };

  const handleFavoritesMode = () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
    resetTopicGateFlow();
    setSmartReviewMode(false);
    const favIds = getFavorites();
    const favWords = allWords.filter(w => favIds.includes(w.id) && w.language === selectedLanguage);
    if (favWords.length === 0) return;
    setMenuVisible(false);
    setWords([...favWords].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSelectedTopic('Favorites Mode');
    setWriteMode(false); setQuizMode(false); setFocusMode(false);
    setIsFlipped(false); setIsComplete(false);
  };

  const handleErrorsMode = () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
    resetTopicGateFlow();
    setSmartReviewMode(false);
    const errIds = getFocusErrors(selectedLanguage);
    const errWords = allWords.filter(w => errIds.includes(w.id) && w.language === selectedLanguage);
    if (errWords.length === 0) return;
    setMenuVisible(false);
    setWords([...errWords].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSelectedTopic('Errors Mode');
    setWriteMode(false); setQuizMode(false); setFocusMode(false);
    setIsFlipped(false); setIsComplete(false);
  };

  const handleSmartReviewMode = () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
    resetTopicGateFlow();
    setWriteMode(false);
    setQuizMode(false);
    setFocusMode(false);

    const cards = getSrsCards();
    const today = toYmd();
    const dueIds = Object.entries(cards)
      .filter(([, card]) => card.dueDate <= today)
      .map(([id]) => id);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString();
    const errorIds = getFocusErrors(selectedLanguage);
    const weeklyEvents = getErrorEvents(selectedLanguage).filter((evt) => evt.at >= weekAgoIso);
    const eventCounts = weeklyEvents.reduce<Record<string, number>>((acc, evt) => {
      acc[evt.wordId] = (acc[evt.wordId] ?? 0) + 1;
      return acc;
    }, {});
    const frequentErrorIds = Object.entries(eventCounts)
      .filter(([, count]) => count >= 2)
      .map(([wordId]) => wordId)
      .filter((wordId) => errorIds.includes(wordId));
    const highPriorityIds = getHighPriorityWordIds(today, 3);

    const poolIds = Array.from(new Set([...dueIds, ...frequentErrorIds, ...highPriorityIds]));
    const basePool = allWords.filter((w) => poolIds.includes(w.id) && w.language === selectedLanguage);
    const weightedPool = [
      ...basePool,
      ...basePool.filter((w) => highPriorityIds.includes(w.id)),
      ...basePool.filter((w) => highPriorityIds.includes(w.id)),
    ];
    const pool = weightedPool.length > 0 ? weightedPool : basePool;
    if (pool.length === 0) {
      alert(learningLabels.noReviewDue);
      return;
    }

    setWords([...pool].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSelectedTopic('Smart Review Mode');
    setSmartReviewMode(true);
    setMenuVisible(false);
    setIsFlipped(false);
    setIsComplete(false);
  };

  const handleNext = () => {
    stopAutoPlay();
    if (hasTopicFlow && currentIndex === words.length - 1) {
      resetTopicGateFlow();
      setTopicPracticeWords(topicCoreBatchWords);
      return;
    }
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      if (smartReviewMode) {
        const currentGoal = getDailyGoal();
        const updated = { ...currentGoal, smartReviewed: currentGoal.smartReviewed + 1 };
        saveDailyGoal(updated);
        setDailyGoal(updated);
      }
      // En back-only mode (solo temas), mostrar directamente el reverso
      if (backOnlyMode && !autoPlayMode && !focusMode) {
        setIsFlipped(true);
      }
    } else if (!hasTopicFlow) {
      if (smartReviewMode) {
        const currentGoal = getDailyGoal();
        const updated = { ...currentGoal, smartReviewed: currentGoal.smartReviewed + 1 };
        saveDailyGoal(updated);
        setDailyGoal(updated);
      }
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    stopAutoPlay();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // En back-only mode (solo temas), mostrar directamente el reverso
      if (backOnlyMode && !autoPlayMode && !focusMode) {
        setIsFlipped(true);
      }
    }
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleTitleClick = () => {
    // Resetear todo excepto el idioma seleccionado
    stopAutoPlay();
    stopFocusMode();
    stopWriteMode();
    stopQuizMode();
    setWords([]);
    setTopicWords([]);
    setTopicCoreBatchWords([]);
    setTopicBatchStart(0);
    resetTopicGateFlow();
    setSmartReviewMode(false);
    setSelectedTopic('');
    setCurrentIndex(0);
    setMenuVisible(true);
    setIsComplete(false);
    setIsFlipped(false);
  };

  const handleTopicPracticeFinish = (correct: number, incorrect: number) => {
    const practicedWords = topicPracticeWords ?? topicCoreBatchWords;
    const needed = Math.min(
      getAdaptivePassScore(selectedLanguage, selectedTopic, practicedWords.length || TOPIC_BATCH_SIZE),
      practicedWords.length || TOPIC_BATCH_SIZE,
    );
    const passed = correct >= needed;
    saveTopicAttempt(selectedLanguage, selectedTopic, { correct, incorrect, at: new Date().toISOString() });
    if (passed) {
      const currentGoal = getDailyGoal();
      const updated = { ...currentGoal, blocksDone: currentGoal.blocksDone + 1 };
      saveDailyGoal(updated);
      setDailyGoal(updated);
      setTopicPracticeWords(null);
      setTopicPracticeSummary({ correct, incorrect, passed });
      setTopicPracticeFailedIds([]);
      setTopicRecoveryWords(null);
      setTopicRecoverySummary(null);
      return;
    }
    const failedWords = practicedWords.filter((w) => topicPracticeFailedIds.includes(w.id));
    setTopicPracticeWords(null);
    if (failedWords.length > 0) {
      setTopicRecoveryWords([...failedWords].sort(() => Math.random() - 0.5));
      setTopicRecoverySummary(null);
      setShowRecoveryInfo(true);
      return;
    }
    setTopicPracticeSummary({ correct, incorrect, passed });
  };

  const handleRetryTopicPractice = () => {
    resetTopicGateFlow();
    setTopicPracticeWords(topicCoreBatchWords);
  };

  const handleTopicRecoveryFinish = (correct: number, incorrect: number) => {
    setTopicRecoveryWords(null);
    setTopicRecoverySummary({ correct, incorrect });
  };

  const handleUnlockNextTopicBatch = () => {
    const nextStart = topicBatchStart + TOPIC_BATCH_SIZE;
    const nextCoreBatch = getTopicBatch(topicWords, nextStart);
    if (nextCoreBatch.length === 0) {
      saveTopicBatchStart(selectedLanguage, selectedTopic, 0);
      resetTopicGateFlow();
      setWords([]);
      setTopicCoreBatchWords([]);
      setSelectedTopic('');
      setMenuVisible(true);
      setCurrentIndex(0);
      setIsFlipped(false);
      return;
    }
    const interleavePool = getTopicInterleavePool(topicWords, nextStart);
    const nextSequence = buildTopicStudySequence(nextCoreBatch, interleavePool);
    saveTopicBatchStart(selectedLanguage, selectedTopic, nextStart);
    setTopicBatchStart(nextStart);
    setTopicCoreBatchWords(nextCoreBatch);
    setWords(nextSequence);
    setCurrentIndex(0);
    resetTopicGateFlow();
    setIsFlipped(backOnlyMode);
  };

  const handleTopicPracticeItemResult = (word: Word, isCorrect: boolean) => {
    updateSrsAfterAnswer(word.id, isCorrect);
    if (!isCorrect) {
      logErrorEvent(selectedLanguage, word.id);
      saveDailyFailure(word.id);
      setTopicPracticeFailedIds((prev) => (prev.includes(word.id) ? prev : [...prev, word.id]));
    }
  };

  return (
    <div className="container">
      {showCountdown && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdownNumber}</div>
        </div>
      )}
      
      <header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <h1 onClick={handleTitleClick} style={{ cursor: 'pointer', margin: 0 }}>{t.title}</h1>
          <span style={{ fontSize: '0.6rem', color: '#666', letterSpacing: '0.04em', marginTop: '2px' }}>— Richard HC</span>
          {streak > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#ff9800', fontWeight: 700, marginTop: '2px' }} title="Racha diaria">
              🔥 {streak} {streak === 1 ? 'día' : 'días'}
            </span>
          )}
        </div>
        {allWords.length > 0 && (
          <SearchBar
            allWords={allWords}
            onSelect={w => setSearchWord(w)}
            placeholder="🔍 Buscar por significado..."
          />
        )}
        <div className="header-right">
          {selectedLanguage && (
            <button className="toggle-menu-btn" onClick={handleSmartReviewMode} title={learningLabels.smartReviewHint}>
              {learningLabels.smartReview}
            </button>
          )}
          {selectedLanguage && (
            <button className="toggle-menu-btn" onClick={toggleMenu}>
              {menuVisible ? t.hideMenu : t.showMenu}
            </button>
          )}
          <div className="back-only-toggle">
            <span className="back-only-label">Solo reverso</span>
            <button
              className={`toggle-switch ${backOnlyMode ? 'active' : ''}`}
              onClick={() => {
                const next = !backOnlyMode;
                setBackOnlyMode(next);
                if (words.length > 0 && !autoPlayMode && !focusMode) {
                  setIsFlipped(next);
                }
              }}
              aria-pressed={backOnlyMode}
              aria-label="Solo reverso"
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <button
            className="dark-mode-btn"
            onClick={() => setDarkMode(d => !d)}
            aria-label="Tema oscuro"
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          {isTauri && <UpdateChecker />}
          <LanguageSelector 
            languages={languages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            placeholder={t.selectLanguage}
          />
        </div>
      </header>
      {selectedLanguage && (
        <div className="daily-goal-card">
          <strong>{learningLabels.goalTitle}</strong>
          <div className="daily-goal-row">
            <span>{learningLabels.goalBlocks}: {dailyGoal.blocksDone}/{blocksGoalTarget}</span>
            <div className="daily-goal-progress"><span style={{ width: `${goalBlocksPct}%` }} /></div>
          </div>
          <div className="daily-goal-row">
            <span>{learningLabels.goalReview}: {dailyGoal.smartReviewed}/{reviewGoalTarget}</span>
            <div className="daily-goal-progress"><span style={{ width: `${goalReviewPct}%` }} /></div>
          </div>
        </div>
      )}
      
      <div className={`main-content ${!menuVisible ? 'menu-hidden' : ''}`}>
        {selectedLanguage && topics.length > 0 && menuVisible && (
          <div>
            <TopicMenu 
              topics={topics}
              selectedTopic={selectedTopic}
              onTopicChange={handleTopicChange}
              onFocusMode={handleFocusMode}
              onBlitzMode={handleBlitzMode}
              onBulletMode={handleBulletMode}
              onWriteMode={handleWriteMode}
              onQuizMode={handleQuizMode}
              onFavoritesMode={handleFavoritesMode}
              onErrorsMode={handleErrorsMode}
              selectedLanguage={selectedLanguage}
              translations={t}
              allWords={allWords}
            />
            <GuidesMenu isTauri={isTauri} />
          </div>
        )}
        
        <div className="flashcard-container">
          {topicPracticeWords && (
            <QuizMode
              words={topicPracticeWords}
              allWords={allWords}
              translations={t}
              onFinish={handleTopicPracticeFinish}
              mixedMode
              onItemResult={handleTopicPracticeItemResult}
            />
          )}
          {topicRecoveryWords && (
            <>
              {showRecoveryInfo && (
                <div className="topic-flow-banner">
                  <div className="topic-flow-row">
                    <strong>{topicFlowLabels.recoveryTitle}</strong>
                    <span>{topicRecoveryWords.length} palabras</span>
                  </div>
                  <p>{topicFlowLabels.recoverySub}</p>
                </div>
              )}
              <QuizMode
                words={topicRecoveryWords}
                allWords={allWords}
                translations={t}
                onFinish={handleTopicRecoveryFinish}
                mixedMode
                onItemResult={handleTopicPracticeItemResult}
              />
            </>
          )}
          {topicRecoverySummary && (
            <div className="focus-summary">
              <h2>{topicFlowLabels.recoveryTitle}</h2>
              <div className="stats">
                <p className="correct-count">{t.correctWords.replace('{count}', topicRecoverySummary.correct.toString())}</p>
                <p className="incorrect-count">{t.incorrectWords.replace('{count}', topicRecoverySummary.incorrect.toString())}</p>
              </div>
              <button onClick={handleRetryTopicPractice} className="restart-btn">
                🔁 {topicFlowLabels.retryBlockNow}
              </button>
            </div>
          )}
          {topicPracticeSummary && (
            <div className="focus-summary">
              <h2>{topicPracticeSummary.passed ? topicFlowLabels.unlocked : topicFlowLabels.needMore}</h2>
              <p>{topicUnlockRuleText}</p>
              <div className="stats">
                <p className="correct-count">{t.correctWords.replace('{count}', topicPracticeSummary.correct.toString())}</p>
                <p className="incorrect-count">{t.incorrectWords.replace('{count}', topicPracticeSummary.incorrect.toString())}</p>
                <p className="total-count">
                  {topicFlowLabels.progressOfTopic}: {topicBatchEnd}/{topicWords.length}
                </p>
              </div>
              {topicPracticeSummary.passed ? (
                <button onClick={hasMoreTopicBatches ? handleUnlockNextTopicBatch : handleTitleClick} className="restart-btn">
                  {hasMoreTopicBatches ? `➡️ ${topicFlowLabels.nextBlock}` : `🏁 ${topicFlowLabels.topicDone}`}
                </button>
              ) : (
                <button onClick={handleRetryTopicPractice} className="restart-btn">
                  🔁 {topicFlowLabels.retryPractice}
                </button>
              )}
            </div>
          )}
          {/* Write Mode */}
          {!topicPracticeWords && !topicRecoveryWords && !topicRecoverySummary && !topicPracticeSummary && writeMode && !writeSummary && words.length > 0 && (
            <WriteMode
              words={words}
              translations={t}
              onFinish={(correct, incorrect) => {
                stopWriteMode();
                setWriteSummary({ correct, incorrect });
              }}
            />
          )}
          {!topicPracticeWords && !topicRecoveryWords && !topicRecoverySummary && !topicPracticeSummary && writeSummary && (
            <div className="focus-summary">
              <h2>{t.writeSummary}</h2>
              <div className="stats">
                <p className="correct-count">{t.correctWords.replace('{count}', writeSummary.correct.toString())}</p>
                <p className="incorrect-count">{t.incorrectWords.replace('{count}', writeSummary.incorrect.toString())}</p>
                <p className="total-count">{t.totalWords.replace('{count}', (writeSummary.correct + writeSummary.incorrect).toString())}</p>
              </div>
              <button onClick={() => { setWriteSummary(null); setWords([]); setMenuVisible(true); setSelectedTopic(''); }} className="restart-btn">
                {t.restart}
              </button>
            </div>
          )}
          {/* Quiz Mode */}
          {!topicPracticeWords && !topicRecoveryWords && !topicRecoverySummary && !topicPracticeSummary && quizMode && !quizSummary && words.length > 0 && (
            <QuizMode
              words={words}
              allWords={allWords}
              translations={t}
              onFinish={(correct, incorrect) => {
                stopQuizMode();
                setQuizSummary({ correct, incorrect });
              }}
            />
          )}
          {!topicPracticeWords && !topicRecoveryWords && !topicRecoverySummary && !topicPracticeSummary && quizSummary && (
            <div className="focus-summary">
              <h2>{t.quizSummary}</h2>
              <div className="stats">
                <p className="correct-count">{t.correctWords.replace('{count}', quizSummary.correct.toString())}</p>
                <p className="incorrect-count">{t.incorrectWords.replace('{count}', quizSummary.incorrect.toString())}</p>
                <p className="total-count">{t.totalWords.replace('{count}', (quizSummary.correct + quizSummary.incorrect).toString())}</p>
              </div>
              <button onClick={() => { setQuizSummary(null); setWords([]); setMenuVisible(true); setSelectedTopic(''); }} className="restart-btn">
                {t.restart}
              </button>
            </div>
          )}
          {!topicPracticeWords && !topicRecoveryWords && !topicRecoverySummary && !topicPracticeSummary && !writeMode && !writeSummary && !quizMode && !quizSummary && focusShowingSummary ? (            // Mostrar resumen de Focus Mode
            <div className="focus-summary">
              <h2>{t.focusSummary}</h2>
              <div className="stats">
                <p className="correct-count">{t.correctWords.replace('{count}', focusCorrectCount.toString())}</p>
                <p className="incorrect-count">{t.incorrectWords.replace('{count}', focusIncorrectCount.toString())}</p>
                <p className="total-count">{t.totalWords.replace('{count}', (focusCorrectCount + focusIncorrectCount).toString())}</p>
              </div>
              <button onClick={() => { stopFocusMode(); setWords([]); setMenuVisible(true); setSelectedTopic(''); }} className="restart-btn">
                {t.restart}
              </button>
            </div>
          ) : !topicPracticeWords && !topicRecoveryWords && !topicRecoverySummary && !topicPracticeSummary && !writeMode && !writeSummary && !quizMode && !quizSummary && words.length > 0 && !isComplete && (
            <>
              {hasTopicFlow && (
                <div className="topic-flow-banner">
                  <div className="topic-flow-row">
                    <strong>{topicFlowLabels.blockOf} {currentTopicBlock}/{totalTopicBlocks}</strong>
                    <span>
                      {topicBatchStart + 1}-{topicBatchEnd} / {topicWords.length}
                      {topicBatchStart > 0 && <em> • {topicFlowLabels.resumed}</em>}
                    </span>
                  </div>
                  <div className="topic-flow-progress" aria-hidden="true">
                    <span style={{ width: `${topicProgressPercent}%` }} />
                  </div>
                  <p>{topicUnlockRuleText}</p>
                  <p><strong>{topicFlowLabels.trend}:</strong> {topicTrendText}</p>
                </div>
              )}
              {selectedTopic === 'Gramática' ? (
                // Mostrar GrammarCard para el tema Gramática
                <>
                  <GrammarCard 
                    word={words[currentIndex].word}
                    meaning={words[currentIndex].meaning}
                    examples={words[currentIndex].examples}
                    learningRTL={learningRTL}
                  />
                  <div className="controls">
                    {hasTopicFlow && (
                      <button onClick={handleTitleClick}>
                        {topicFlowLabels.exitToMenu}
                      </button>
                    )}
                    <button onClick={handlePrevious} disabled={currentIndex === 0}>
                      {t.previous}
                    </button>
                    <span>
                      {currentIndex + 1} / {words.length}
                      {hasTopicFlow && <span> • {topicBatchStart + 1}-{topicBatchEnd} / {topicWords.length}</span>}
                    </span>
                    <button onClick={handleNext} disabled={!hasTopicFlow && currentIndex === words.length - 1}>
                      {hasTopicFlow && currentIndex === words.length - 1 ? topicFlowLabels.practiceNow : t.next}
                    </button>
                  </div>
                </>
              ) : (
                // Mostrar Flashcard normal para otros temas
                <>
                  {hasTopicFlow && currentIndex === words.length - 1 && (
                    <div className="focus-summary" style={{ marginBottom: '12px' }}>
                      <h2>{topicFlowLabels.learnedPrompt}</h2>
                      <p>{topicFlowLabels.learnedSub}</p>
                    </div>
                  )}
                  <Flashcard 
                    {...words[currentIndex]} 
                    isFlipped={isFlipped} 
                    examplesLabel={t.examples}
                    learningRTL={learningRTL}
                    enableSpanishAudio={hasTopicFlow && selectedLanguage === 'Español'}
                    lockFlip={backOnlyMode && !autoPlayMode && !focusMode}
                    overlayButtons={focusMode ? (
                      <>
                        <button onClick={handleFocusCorrect} className="correct-btn">
                          {t.correct}
                        </button>
                        <button onClick={handleFocusIncorrect} className="incorrect-btn">
                          {t.incorrect}
                        </button>
                        <button onClick={handleFocusStop} className="focus-stop-btn">
                          {t.stop}
                        </button>
                      </>
                    ) : undefined}
                  />
                  <div className="controls">
                    {hasTopicFlow && (
                      <button onClick={handleTitleClick}>
                        {topicFlowLabels.exitToMenu}
                      </button>
                    )}
                    <button onClick={handlePrevious} disabled={currentIndex === 0 || autoPlayMode !== null || focusMode}>
                      {t.previous}
                    </button>
                    <span>
                      {currentIndex + 1} / {words.length}
                      {hasTopicFlow && <span> • {topicBatchStart + 1}-{topicBatchEnd} / {topicWords.length}</span>}
                      {autoPlayMode && <span className="mode-indicator"> • {autoPlayMode === 'blitz' ? '⚡ Blitz' : '🚀 Bullet'}</span>}
                      {focusMode && <span className="mode-indicator"> • 🎯 Focus</span>}
                    </span>
                    <button onClick={handleNext} disabled={autoPlayMode !== null || focusMode}>
                      {hasTopicFlow && currentIndex === words.length - 1 ? topicFlowLabels.practiceNow : t.next}
                    </button>
                    {autoPlayMode && (
                      <button onClick={stopAutoPlay} className="stop-btn">
                        {t.pause}
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {!writeMode && !quizMode && isComplete && (
            <div className="complete-message">
              <h2>{t.completed}</h2>
              <p>{t.reviewedWords.replace('{count}', words.length.toString())}</p>
              <button onClick={() => { setIsComplete(false); setCurrentIndex(0); }} className="restart-btn">
                {t.restart}
              </button>
            </div>
          )}
          {words.length === 0 && selectedTopic && (
            <p>{t.noWords}</p>
          )}
        </div>
      </div>

      {searchWord && (
        <WordModal word={searchWord} onClose={() => setSearchWord(null)} />
      )}

      {/* Word of the Day modal */}
      {wordOfDay && (
        <div className="wod-overlay" onClick={() => setWordOfDay(null)}>
          <div className="wod-modal" onClick={e => e.stopPropagation()}>
            <div className="wod-label">✨ Palabra del día</div>
            <div className={`wod-card ${wordOfDayFlipped ? 'flipped' : ''}`}>
              <div className="wod-front">
                <span className="wod-word">{wordOfDay.word}</span>
                {wordOfDay.genre && <span className="wod-genre">({wordOfDay.genre})</span>}
              </div>
              <div className="wod-back">
                <p className="wod-pronunciation">({wordOfDay.pronunciation})</p>
                <p className="wod-meaning">{wordOfDay.meaning}</p>
                <ul className="wod-examples">
                  {wordOfDay.examples.slice(0, 2).map((ex, i) => <li key={i}>{ex}</li>)}
                </ul>
              </div>
            </div>
            <button className="wod-close-btn" onClick={() => setWordOfDay(null)}>
              Empezar →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
