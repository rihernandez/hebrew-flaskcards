import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Switch, Dimensions, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Flashcard } from '../components/Flashcard';
import { TopicMenu } from '../components/TopicMenu';
import { WordOfDay } from '../components/WordOfDay';
import { ChangeLanguageModal } from '../components/ChangeLanguageModal';
import { Word, Language } from '../types/Word';
import { getTopics, getWords, getAllWordsExcept, getAllWords, getLanguages } from '../utils/dataService';
import { translations, getUILanguageFromNative, isRTL } from '../utils/translations';
import { SearchBar } from '../components/SearchBar';
import { useTheme } from '../context/ThemeContext';
import { WriteMode } from '../components/WriteMode';
import { QuizMode } from '../components/QuizMode';
import { markWordSeen, getSeenWordKeys } from '../utils/progress';
import { updateStreak } from '../utils/streak';
import { getFavorites } from '../utils/favorites';
import { getErrors } from '../utils/errorHistory';
import { UserProfile, saveProfile } from '../utils/userProfile';
import { scheduleDailyNotification, scheduleMemorizeNotification } from '../utils/notifications';
import { StatsScreen } from '../components/StatsScreen';
import { ProfileScreen } from '../components/ProfileScreen';
import { AchievementToast } from '../components/AchievementToast';
import { WeaknessMap } from '../components/WeaknessMap';
import { ForgettingPredictor } from '../components/ForgettingPredictor';
import { NightReview } from '../components/NightReview';
import { reviewCard } from '../utils/srs';
import { checkAchievements, Achievement } from '../utils/achievements';
import { getDailyChallenge, getCompletedStreak, markMemorizeCompleted, getYesterdayWords, DailyChallenge } from '../utils/dailyChallenge';
import { DailyChallengeCard } from '../components/DailyChallengeCard';
import { MemorizeSession } from '../components/MemorizeSession';
import { stateApi } from '../utils/stateApi';
import { hasCompletedAppTour, markAppTourCompleted } from '../utils/sessionTour';

const { width } = Dimensions.get('window');
const s = (size: number) => Math.round(size * Math.min(width / 390, 1.8));
const TOPIC_BATCH_SIZE = 10;
const TOPIC_BATCH_PASS_SCORE = 7;

type Mode = 'normal' | 'blitz' | 'bullet' | 'focus' | 'write' | 'quiz' | 'favorites' | 'errors';
type ChallengeIntroMode = 'blitz' | 'bullet' | 'focus';

interface Props {
  profile: UserProfile;
  onProfileUpdate: (p: UserProfile) => void;
}

export function LearnScreen({ profile, onProfileUpdate }: Props) {
  const { colors, darkMode, toggleDarkMode } = useTheme();
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);
  const [showChangeLang, setShowChangeLang] = useState(false);
  const [language, setLanguage] = useState(profile.learningLanguage);
  const [availableLanguages] = useState<string[]>(getLanguages());
  const [uiLanguage, setUiLanguage] = useState<Language>(getUILanguageFromNative(profile.nativeLanguage));
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [words, setWords] = useState<Word[]>([]);
  const [topicWords, setTopicWords] = useState<Word[]>([]);
  const [topicBatchStart, setTopicBatchStart] = useState(0);
  const [topicPracticeWords, setTopicPracticeWords] = useState<Word[] | null>(null);
  const [topicPracticeSummary, setTopicPracticeSummary] = useState<{ correct: number; incorrect: number; passed: boolean } | null>(null);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(true);
  const [mode, setMode] = useState<Mode>('normal');
  const [isFlipped, setIsFlipped] = useState(false);
  const [focusResults, setFocusResults] = useState<{ correct: number; incorrect: number }>({ correct: 0, incorrect: 0 });
  const [showFocusSummary, setShowFocusSummary] = useState(false);
  const [backOnlyMode, setBackOnlyMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileHub, setShowProfileHub] = useState(false);
  const [showWeaknessMap, setShowWeaknessMap] = useState(false);
  const [showForgetting, setShowForgetting] = useState(false);
  const [showNightReview, setShowNightReview] = useState(false);
  const [challengeIntroMode, setChallengeIntroMode] = useState<ChallengeIntroMode | null>(null);
  const [challengeIntroStage, setChallengeIntroStage] = useState<'banner' | 'countdown' | null>(null);
  const [challengeCountdown, setChallengeCountdown] = useState(3);
  const [showLearnTour, setShowLearnTour] = useState(false);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [showMemorize, setShowMemorize] = useState(false);
  const [yesterdayWords, setYesterdayWords] = useState<Word[] | null>(null);
  const [modeSummary, setModeSummary] = useState<{ correct: number; incorrect: number } | null>(null);
  const [summaryCountdown, setSummaryCountdown] = useState(3);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const t = translations[uiLanguage];
  const profileHubLabels = {
    title: uiLanguage === 'he' ? 'פרופיל' : uiLanguage === 'en' ? 'Profile' : 'Profile',
    account: uiLanguage === 'he' ? 'חשבון' : uiLanguage === 'en' ? 'Account' : 'Cuenta',
    progress: uiLanguage === 'he' ? 'התקדמות' : uiLanguage === 'en' ? 'Progress' : 'Progreso',
    preferences: uiLanguage === 'he' ? 'העדפות' : uiLanguage === 'en' ? 'Preferences' : 'Preferencias',
    close: uiLanguage === 'he' ? 'סגור' : uiLanguage === 'en' ? 'Close' : 'Cerrar',
    stats: uiLanguage === 'he' ? 'סטטיסטיקות' : uiLanguage === 'en' ? 'Stats' : 'Estadísticas',
    profile: uiLanguage === 'he' ? 'הפרופיל שלי' : uiLanguage === 'en' ? 'My profile' : 'Mi perfil',
    favorites: uiLanguage === 'he' ? 'מועדפים' : uiLanguage === 'en' ? 'Favorites' : 'Favoritos',
    theme: uiLanguage === 'he' ? 'ערכת נושא' : uiLanguage === 'en' ? 'Theme' : 'Tema',
    language: uiLanguage === 'he' ? 'שפה' : uiLanguage === 'en' ? 'Language' : 'Idioma',
    weaknessMap: uiLanguage === 'he' ? 'מפת חולשות' : uiLanguage === 'en' ? 'Weakness map' : 'Mapa de debilidades',
    forgetting: uiLanguage === 'he' ? 'תחזית שכחה' : uiLanguage === 'en' ? 'Forgetting predictor' : 'Predicción de olvido',
    nightReview: uiLanguage === 'he' ? 'חזרה לילית' : uiLanguage === 'en' ? 'Night review' : 'Repaso nocturno',
  };
  const topicFlowLabels = {
    practiceNow: uiLanguage === 'he' ? 'לתרגל' : uiLanguage === 'en' ? 'Practice now' : 'Practicar',
    nextBlock: uiLanguage === 'he' ? '10 המילים הבאות' : uiLanguage === 'en' ? 'Next 10 words' : 'Siguientes 10 palabras',
    retryPractice: uiLanguage === 'he' ? 'לתרגל שוב' : uiLanguage === 'en' ? 'Practice again' : 'Practicar otra vez',
    topicDone: uiLanguage === 'he' ? 'הנושא הושלם' : uiLanguage === 'en' ? 'Topic completed' : 'Tema completado',
    unlocked: uiLanguage === 'he' ? 'פתחת את הבלוק הבא' : uiLanguage === 'en' ? 'You unlocked the next block' : 'Desbloqueaste el siguiente bloque',
    needMore: uiLanguage === 'he' ? 'צריך לפחות 7 נכונות כדי להמשיך' : uiLanguage === 'en' ? 'You need at least 7 correct to continue' : 'Necesitas al menos 7 correctas para continuar',
    learnedPrompt: uiLanguage === 'he' ? 'בוא נתרגל את מה שלמדת' : uiLanguage === 'en' ? 'Let us practice what you learned' : 'Vamos a practicar lo aprendido',
    learnedSub: uiLanguage === 'he' ? 'כשיש לך 7 מתוך 10 נכונות, נפתח את 10 המילים הבאות.' : uiLanguage === 'en' ? 'Get 7 out of 10 right to unlock the next 10 words.' : 'Si aciertas 7 de 10, se desbloquean las siguientes 10 palabras.',
    progressOfTopic: uiLanguage === 'he' ? 'התקדמות בנושא' : uiLanguage === 'en' ? 'Topic progress' : 'Progreso del tema',
    backToMenu: uiLanguage === 'he' ? 'חזרה לתפריט' : uiLanguage === 'en' ? 'Back to menu' : 'Volver al menu',
  };
  const challengeIntroLabels = {
    title: uiLanguage === 'he' ? 'מטרת האתגר' : uiLanguage === 'en' ? 'Challenge goal' : 'Objetivo del reto',
    bullet: uiLanguage === 'he'
      ? 'מטרת המשחק היא לראות כמה מהר אתה מזהה את המילים. שים לב אליהן ונסה לנחש את המשמעות שלהן.'
      : uiLanguage === 'en'
        ? 'The goal is to see how fast you recognize words. Pay close attention and try to guess their meaning.'
        : 'El objetivo del juego es ver que tan rapido eres reconociendo las palabras. Por favor presta atencion a las mismas y trata de adivinar su significado.',
    blitz: uiLanguage === 'he'
      ? 'מטרת המשחק היא לראות כמה מהר אתה מזהה את המילים. שים לב אליהן ונסה לנחש את המשמעות שלהן.'
      : uiLanguage === 'en'
        ? 'The goal is to see how fast you recognize words. Pay close attention and try to guess their meaning.'
        : 'El objetivo del juego es ver que tan rapido eres reconociendo las palabras. Por favor presta atencion a las mismas y trata de adivinar su significado.',
    focus: uiLanguage === 'he'
      ? 'מטרת המשחק היא לבדוק כמה מהר אתה מזהה את המילים. התרכז בכל מילה ונסה לזהות את המשמעות שלה לפני שתענה.'
      : uiLanguage === 'en'
        ? 'The goal is to test how fast you recognize words. Focus on each word and try to identify its meaning before answering.'
        : 'El objetivo del juego es ver que tan rapido eres reconociendo las palabras. Por favor presta atencion a las mismas y trata de adivinar su significado.',
  };
  const learnTourLabels = {
    title: uiLanguage === 'he' ? 'איך משתמשים בכרטיס?' : uiLanguage === 'en' ? 'How this card works' : 'Asi funciona la tarjeta',
    body: uiLanguage === 'he'
      ? 'גע בצד שמאל או ימין של הכרטיס כדי לראות את הצד השני. השתמש בכפתורים כדי לחזור, להתקדם או לצאת מהלמידה.'
      : uiLanguage === 'en'
        ? 'Tap the left or right side of the card to see the other side. Use the buttons to go back, move forward, or leave the lesson.'
        : 'Toca la parte izquierda o derecha de la tarjeta para ver el reverso. Usa los botones de abajo para ir atras, avanzar o salir del aprendizaje.',
    cta: uiLanguage === 'he' ? 'Entendido' : uiLanguage === 'en' ? 'Got it' : 'Entendido',
  };

  const getTopicBatch = (list: Word[], start: number) => list.slice(start, start + TOPIC_BATCH_SIZE);
  const hasTopicFlow = mode === 'normal' && selectedTopic !== '' && topicWords.length > 0;
  const topicBatchEnd = hasTopicFlow ? Math.min(topicBatchStart + words.length, topicWords.length) : words.length;
  const hasMoreTopicBatches = hasTopicFlow && topicBatchStart + TOPIC_BATCH_SIZE < topicWords.length;
  const currentWord = words[currentIndex];

  // Init data on mount
  useEffect(() => {
    const lang = profile.learningLanguage;
    const availableTopics = getTopics(lang);
    setTopics(availableTopics);
    const aw = getAllWords();
    setAllWords(aw);
    if (availableTopics.length > 0) {
      setSelectedTopic(availableTopics[0]);
      setWords(getWords(lang, availableTopics[0]));
    }
    setLoading(false);
    updateStreak().then(s => setStreak(s.currentStreak));
    getDailyChallenge(lang, aw).then(ch => {
      setDailyChallenge(ch);
      getYesterdayWords().then(setYesterdayWords);
    });
    getErrors(lang).then(e => setErrorCount(e.length));
    if (profile.notificationHour >= 0) {
      scheduleDailyNotification(profile.notificationHour, profile.notificationMinute, profile.name);
      scheduleMemorizeNotification(profile.notificationHour, profile.name, getUILanguageFromNative(profile.nativeLanguage));
    }
  }, []);

  const handleLanguageChange = (lang: string) => {
    stateApi.set('preferences', 'selected_language', lang).catch(() => {});
    setLanguage(lang);
    const availableTopics = getTopics(lang);
    setTopics(availableTopics);
    setMode('normal');
    setShowMenu(true);
    setIsFlipped(false);
    setModeSummary(null);
    setTopicWords([]);
    setTopicBatchStart(0);
    setTopicPracticeWords(null);
    setTopicPracticeSummary(null);
    if (availableTopics.length > 0) {
      setSelectedTopic(availableTopics[0]);
      setWords(getWords(lang, availableTopics[0]));
    } else {
      setSelectedTopic('');
      setWords([]);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startChallengeIntro = (nextMode: ChallengeIntroMode, challengeWords: Word[]) => {
    setWords(shuffleArray(challengeWords));
    setCurrentIndex(0);
    setShowMenu(false);
    setIsFlipped(false);
    setChallengeIntroMode(nextMode);
    setChallengeIntroStage('banner');
    setChallengeCountdown(3);
    if (nextMode === 'focus') {
      setFocusResults({ correct: 0, incorrect: 0 });
      setShowFocusSummary(false);
    }
  };

  const handleTopicChange = (topic: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const topicList = getWords(language, topic);
    setSelectedTopic(topic);
    setTopicWords(topicList);
    setTopicBatchStart(0);
    setTopicPracticeWords(null);
    setTopicPracticeSummary(null);
    setWords(getTopicBatch(topicList, 0));
    setCurrentIndex(0);
    setShowMenu(false);
    setMode('normal');
    setIsFlipped(backOnlyMode);
  };

  const handleBlitzMode = () => {
    const w = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    startChallengeIntro('blitz', w);
  };
  const handleBulletMode = () => {
    const w = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    startChallengeIntro('bullet', w);
  };
  const handleFocusMode = () => {
    const w = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    startChallengeIntro('focus', w);
  };
  const handleWriteMode = async (): Promise<boolean> => {
    const seenKeys = await getSeenWordKeys(language, topics);
    const w = allWords.filter(word =>
      word.language === language
      && !['Gramática', 'Raíz', 'Expresiones Idiomáticas (Nivim)'].includes(word.topic)
      && seenKeys.has(`${word.word}_${word.topic}`)
    );
    if (w.length === 0) return false;
    setWords(shuffleArray(w)); setCurrentIndex(0); setMode('write'); setShowMenu(false); setIsFlipped(false);
    return true;
  };
  const handleQuizMode = async (): Promise<boolean> => {
    const seenKeys = await getSeenWordKeys(language, topics);
    const w = allWords.filter(word =>
      word.language === language
      && !['Gramática', 'Raíz', 'Expresiones Idiomáticas (Nivim)'].includes(word.topic)
      && seenKeys.has(`${word.word}_${word.topic}`)
    );
    if (w.length === 0) return false;
    setWords(shuffleArray(w)); setCurrentIndex(0); setMode('quiz'); setShowMenu(false); setIsFlipped(false);
    return true;
  };
  const handleFavoritesMode = async () => {
    const favKeys = await getFavorites();
    const favWords = getAllWords().filter(w => w.language === language && favKeys.includes(`${w.language}_${w.word}_${w.topic}`));
    if (favWords.length === 0) return;
    setWords(shuffleArray(favWords)); setCurrentIndex(0); setMode('favorites'); setShowMenu(false); setIsFlipped(false);
  };
  const handleErrorsMode = async () => {
    const errWords = await getErrors(language);
    if (errWords.length === 0) return;
    setWords(shuffleArray(errWords)); setCurrentIndex(0); setMode('errors'); setShowMenu(false); setIsFlipped(false);
    setErrorCount(errWords.length);
  };

  const handleMemorizeDone = async (correct: number, incorrect: number) => {
    await markMemorizeCompleted();
    const challengeStreak = await getCompletedStreak();
    setDailyChallenge(prev => prev ? { ...prev, memorizeCompleted: true } : prev);
    setShowMemorize(false);
    const streakData = await updateStreak();
    setStreak(streakData.currentStreak);
    const newly = await checkAchievements({ streak: streakData.currentStreak, challengeCompleted: true, challengeStreak });
    if (newly.length > 0) setPendingAchievement(newly[0]);
  };

  const handleSessionFinish = async (correct: number, incorrect: number) => {
    const streakData = await updateStreak();
    setStreak(streakData.currentStreak);
    const favs = await getFavorites();
    const newly = await checkAchievements({
      streak: streakData.currentStreak, totalSeen: correct + incorrect,
      quizPerfect: incorrect === 0 && correct > 0, favoritesCount: favs.length,
    });
    if (newly.length > 0) setPendingAchievement(newly[0]);
  };

  const handleFocusAnswer = (isCorrect: boolean) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setFocusResults(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), incorrect: prev.incorrect + (isCorrect ? 0 : 1) }));
    if (currentIndex < words.length - 1) { setIsFlipped(false); setCurrentIndex(currentIndex + 1); }
    else { setShowFocusSummary(true); }
  };

  const handleNext = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const w = words[currentIndex];
    if (!w) return;
    if (mode === 'normal' && selectedTopic && topicWords.length > 0) {
      markWordSeen(language, w.topic, `${w.word}_${w.topic}`);
      reviewCard(`${w.language}_${w.word}_${w.topic}`, 3);
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(backOnlyMode);
      } else {
        setTopicPracticeSummary(null);
        setTopicPracticeWords(words);
        setIsFlipped(false);
      }
      return;
    }
    if (currentIndex < words.length - 1) {
      markWordSeen(language, w.topic, `${w.word}_${w.topic}`);
      reviewCard(`${w.language}_${w.word}_${w.topic}`, 3);
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(backOnlyMode && mode === 'normal');
    }
  };

  const handlePrevious = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (currentIndex > 0) {
      const w = words[currentIndex];
      markWordSeen(language, w.topic, `${w.word}_${w.topic}`);
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(backOnlyMode && mode === 'normal');
    }
  };

  const handleStop = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setMode('normal'); setIsFlipped(false); setShowMenu(true); setModeSummary(null);
    setTopicPracticeWords(null); setTopicPracticeSummary(null);
    setChallengeIntroMode(null); setChallengeIntroStage(null); setChallengeCountdown(3);
    setSummaryCountdown(3);
    getErrors(language).then(e => setErrorCount(e.length));
  };

  const handleRestartFocus = () => {
    setShowFocusSummary(false); setFocusResults({ correct: 0, incorrect: 0 });
    setCurrentIndex(0); setWords(shuffleArray(words)); setIsFlipped(false);
  };

  const handleTopicPracticeFinish = async (correct: number, incorrect: number) => {
    const needed = Math.min(TOPIC_BATCH_PASS_SCORE, topicPracticeWords?.length ?? TOPIC_BATCH_SIZE);
    const passed = correct >= needed;
    setTopicPracticeWords(null);
    setTopicPracticeSummary({ correct, incorrect, passed });
    await handleSessionFinish(correct, incorrect);
  };

  const handleRetryTopicPractice = () => {
    setTopicPracticeSummary(null);
    setTopicPracticeWords(words);
  };

  const handleUnlockNextTopicBatch = () => {
    const nextStart = topicBatchStart + TOPIC_BATCH_SIZE;
    const nextBatch = getTopicBatch(topicWords, nextStart);
    if (nextBatch.length === 0) {
      setTopicPracticeSummary(null);
      setShowMenu(true);
      setCurrentIndex(0);
      setIsFlipped(false);
      return;
    }
    setTopicBatchStart(nextStart);
    setWords(nextBatch);
    setCurrentIndex(0);
    setTopicPracticeSummary(null);
    setIsFlipped(backOnlyMode);
  };

  // Blitz / Bullet auto-play
  useEffect(() => {
    if ((mode !== 'blitz' && mode !== 'bullet') || words.length === 0) return;
    const frontTime = mode === 'blitz' ? 3000 : 1000;
    let cancelled = false; let index = 0;
    const step = () => {
      if (cancelled) return;
      setCurrentIndex(index); setIsFlipped(false);
      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        setIsFlipped(true);
        timeoutRef.current = setTimeout(() => {
          if (cancelled) return;
          index += 1;
          if (index < words.length) step();
          else { setMode('normal'); setShowMenu(true); }
        }, frontTime);
      }, frontTime);
    };
    timeoutRef.current = setTimeout(step, 1000);
    return () => { cancelled = true; if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [mode, words]);

  // Focus auto-flip
  useEffect(() => {
    if (mode === 'focus' && words.length > 0 && !showFocusSummary) {
      setIsFlipped(false);
      timeoutRef.current = setTimeout(() => setIsFlipped(true), 5000);
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }
  }, [mode, currentIndex, words.length, showFocusSummary]);

  // Countdown auto-redirect after session summary
  useEffect(() => {
    if (!modeSummary) { setSummaryCountdown(3); return; }
    setSummaryCountdown(3);
    countdownRef.current = setInterval(() => {
      setSummaryCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); handleStop(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [modeSummary]);

  useEffect(() => {
    if (showMenu || mode !== 'normal' || !currentWord || topicPracticeWords || topicPracticeSummary) return;
    let cancelled = false;
    hasCompletedAppTour().then(done => {
      if (!cancelled && !done) setShowLearnTour(true);
    });
    return () => { cancelled = true; };
  }, [showMenu, mode, currentWord?.word, topicPracticeWords, topicPracticeSummary]);

  useEffect(() => {
    if (!challengeIntroMode || challengeIntroStage !== 'banner') return;
    const timer = setTimeout(() => {
      setChallengeIntroStage('countdown');
      setChallengeCountdown(3);
    }, 5000);
    return () => clearTimeout(timer);
  }, [challengeIntroMode, challengeIntroStage]);

  useEffect(() => {
    if (!challengeIntroMode || challengeIntroStage !== 'countdown') return;
    if (challengeCountdown <= 1) {
      const timer = setTimeout(() => {
        setMode(challengeIntroMode);
        setChallengeIntroMode(null);
        setChallengeIntroStage(null);
        setChallengeCountdown(3);
      }, 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setChallengeCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [challengeIntroMode, challengeIntroStage, challengeCountdown]);

  if (loading || words.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        {!loading && <Text style={[styles.noWords, { color: colors.text2 }]}>{t.noWords}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <WordOfDay allWords={allWords} uiLanguage={uiLanguage} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.streakText, { color: '#ff9800' }]}>🔥 {streak}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.smallHeaderBtn, { borderColor: colors.primary }]} onPress={() => setShowProfileHub(true)}>
            <Text style={[styles.smallHeaderBtnText, { color: colors.primary }]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallHeaderBtn, { borderColor: colors.primary }]} onPress={handleStop}>
            <Text style={[styles.smallHeaderBtnText, { color: colors.primary }]}>Menú</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <SearchBar allWords={getAllWords()} placeholder={t.searchPlaceholder} />
      </View>

      {/* Daily challenge banner */}
      {showMenu && dailyChallenge && (
        <DailyChallengeCard challenge={dailyChallenge} uiLanguage={uiLanguage} onStart={() => setShowMemorize(true)} />
      )}

      {challengeIntroMode && challengeIntroStage ? (
        <View style={[styles.challengeIntroWrap, { backgroundColor: colors.bg }]}>
          {challengeIntroStage === 'banner' ? (
            <View style={[styles.challengeIntroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.challengeIntroTitle, { color: colors.text }]}>{challengeIntroLabels.title}</Text>
              <Text style={[styles.challengeIntroText, { color: colors.text2 }]}>
                {challengeIntroLabels[challengeIntroMode]}
              </Text>
            </View>
          ) : (
            <View style={styles.challengeCountdownWrap}>
              <Text style={[styles.challengeCountdownNumber, { color: colors.primary }]}>{challengeCountdown}</Text>
            </View>
          )}
        </View>
      ) : showMenu ? (
        <TopicMenu
          topics={topics} selectedTopic={selectedTopic} language={language} uiLanguage={uiLanguage}
          nativeLanguage={localProfile.nativeLanguage}
          onTopicChange={handleTopicChange} onBlitzMode={handleBlitzMode} onBulletMode={handleBulletMode}
          onFocusMode={handleFocusMode} onWriteMode={handleWriteMode} onQuizMode={handleQuizMode}
          onErrorsMode={handleErrorsMode}
          errorCount={errorCount} translations={t}
        />
      ) : topicPracticeWords ? (
        <QuizMode words={topicPracticeWords} allWords={allWords} onFinish={handleTopicPracticeFinish} />
      ) : topicPracticeSummary ? (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {topicPracticeSummary.passed ? '🎉' : '📝'} {topicPracticeSummary.passed ? topicFlowLabels.unlocked : topicFlowLabels.needMore}
          </Text>
          <Text style={[styles.modalText, { color: '#4caf50' }]}>{t.correctWords.replace('{count}', String(topicPracticeSummary.correct))}</Text>
          <Text style={[styles.modalText, { color: '#f44336' }]}>{t.incorrectWords.replace('{count}', String(topicPracticeSummary.incorrect))}</Text>
          <Text style={[styles.modalText, { color: colors.primary }]}>
            {topicFlowLabels.progressOfTopic}: {topicBatchEnd}/{topicWords.length}
          </Text>
          {topicPracticeSummary.passed ? (
            <TouchableOpacity
              style={[styles.summaryBtn, { backgroundColor: colors.primary }]}
              onPress={hasMoreTopicBatches ? handleUnlockNextTopicBatch : handleStop}
            >
              <Text style={styles.buttonText}>{hasMoreTopicBatches ? `➡️ ${topicFlowLabels.nextBlock}` : `🏁 ${topicFlowLabels.topicDone}`}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.summaryBtn, { backgroundColor: colors.primary }]} onPress={handleRetryTopicPractice}>
              <Text style={styles.buttonText}>🔁 {topicFlowLabels.retryPractice}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : !currentWord ? (
        <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: s(24) }]}>
          <Text style={[styles.noWords, { color: colors.text2, marginTop: 0 }]}>{t.noWords}</Text>
          <TouchableOpacity style={[styles.summaryBtn, { backgroundColor: colors.primary }]} onPress={handleStop}>
            <Text style={styles.buttonText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      ) : mode === 'write' || mode === 'errors' ? (
        modeSummary ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>📊 {t.focusSummary.replace('Focus', t.writing)}</Text>
            <Text style={[styles.modalText, { color: '#4caf50' }]}>{t.correctWords.replace('{count}', String(modeSummary.correct))}</Text>
            <Text style={[styles.modalText, { color: '#f44336' }]}>{t.incorrectWords.replace('{count}', String(modeSummary.incorrect))}</Text>
            <Text style={[styles.modalText, { color: colors.primary }]}>{t.totalWords.replace('{count}', String(modeSummary.correct + modeSummary.incorrect))}</Text>
            <TouchableOpacity style={[styles.summaryBtn, { backgroundColor: colors.primary }]} onPress={() => { if (countdownRef.current) clearInterval(countdownRef.current); handleStop(); }}>
              <Text style={styles.buttonText}>🔄 {t.restart} ({summaryCountdown})</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WriteMode words={words} onFinish={(c, i) => { setModeSummary({ correct: c, incorrect: i }); handleSessionFinish(c, i); }} />
        )
      ) : mode === 'quiz' || mode === 'favorites' ? (
        modeSummary ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>📊 {t.focusSummary.replace('Focus', t.quiz)}</Text>
            <Text style={[styles.modalText, { color: '#4caf50' }]}>{t.correctWords.replace('{count}', String(modeSummary.correct))}</Text>
            <Text style={[styles.modalText, { color: '#f44336' }]}>{t.incorrectWords.replace('{count}', String(modeSummary.incorrect))}</Text>
            <Text style={[styles.modalText, { color: colors.primary }]}>{t.totalWords.replace('{count}', String(modeSummary.correct + modeSummary.incorrect))}</Text>
            <TouchableOpacity style={[styles.summaryBtn, { backgroundColor: colors.primary }]} onPress={() => { if (countdownRef.current) clearInterval(countdownRef.current); handleStop(); }}>
              <Text style={styles.buttonText}>🔄 {t.restart} ({summaryCountdown})</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <QuizMode words={words} allWords={allWords} onFinish={(c, i) => { setModeSummary({ correct: c, incorrect: i }); handleSessionFinish(c, i); }} />
        )
      ) : (
        <>
          {hasTopicFlow && (
            <View style={styles.cardTopControls}>
              <View style={styles.backOnlyToggle}>
                <Text style={[styles.backOnlyLabel, { color: colors.primary }]}>{t.backOnly}</Text>
                <Switch
                  value={backOnlyMode}
                  onValueChange={(val) => { setBackOnlyMode(val); if (mode === 'normal' && words.length > 0) setIsFlipped(val); }}
                  trackColor={{ false: '#ccc', true: colors.primary }}
                  thumbColor="#fff"
                  style={styles.backOnlySwitch}
                />
              </View>
            </View>
          )}
          {hasTopicFlow && currentIndex === words.length - 1 && !topicPracticeWords ? (
            <View style={styles.practiceGateContainer}>
              <View style={styles.content}>
                <Flashcard
                  word={currentWord} examplesLabel={t.examples} learningRTL={isRTL(language)}
                  isFlipped={mode !== 'normal' ? isFlipped : (backOnlyMode ? true : undefined)}
                  lockFlip={backOnlyMode && mode === 'normal'}
                />
              </View>
              <View style={[styles.controls, { backgroundColor: colors.controlBg, borderTopColor: colors.border }]}>
                <Text style={[styles.counter, { color: colors.text2 }]}>
                  {currentIndex + 1} / {words.length} • {topicBatchStart + 1}-{topicBatchEnd} / {topicWords.length}
                </Text>
                <View style={[styles.practicePromptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.practicePromptTitle, { color: colors.text }]}>{topicFlowLabels.learnedPrompt}</Text>
                  <Text style={[styles.practicePromptText, { color: colors.text2 }]}>{topicFlowLabels.learnedSub}</Text>
                </View>
                <View style={styles.navigation}>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={handlePrevious}
                  >
                    <Text style={styles.buttonText}>{t.previous}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={handleNext}
                  >
                    <Text style={styles.buttonText}>{topicFlowLabels.practiceNow}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.content}>
                <Flashcard
                  word={currentWord} examplesLabel={t.examples} learningRTL={isRTL(language)}
                  isFlipped={mode !== 'normal' ? isFlipped : (backOnlyMode ? true : undefined)}
                  lockFlip={backOnlyMode && mode === 'normal'}
                />
              </View>
              <View style={[styles.controls, { backgroundColor: colors.controlBg, borderTopColor: colors.border }]}>
                <Text style={[styles.counter, { color: colors.text2 }]}>
                  {currentIndex + 1} / {words.length}
                  {hasTopicFlow && <Text> • {topicBatchStart + 1}-{topicBatchEnd} / {topicWords.length}</Text>}
                  {mode === 'blitz' && <Text style={styles.modeIndicator}> • ⚡ Blitz</Text>}
                  {mode === 'bullet' && <Text style={styles.modeIndicator}> • 🚀 Bullet</Text>}
                  {mode === 'focus' && <Text style={styles.modeIndicator}> • 🎯 Focus</Text>}
                </Text>
                {mode === 'focus' ? (
                  <View style={styles.focusControls}>
                    <TouchableOpacity style={[styles.button, styles.incorrectButton]} onPress={() => handleFocusAnswer(false)}>
                      <Text style={styles.buttonText}>{t.incorrect}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.correctButton]} onPress={() => handleFocusAnswer(true)}>
                      <Text style={styles.buttonText}>{t.correct}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.navigation}>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.primary }, (currentIndex === 0 || mode !== 'normal') && styles.buttonDisabled]}
                      onPress={handlePrevious} disabled={currentIndex === 0 || mode !== 'normal'}
                    >
                      <Text style={styles.buttonText}>{t.previous}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.primary }, (mode !== 'normal') && styles.buttonDisabled]}
                      onPress={handleNext} disabled={mode !== 'normal'}
                    >
                      <Text style={styles.buttonText}>
                        {hasTopicFlow && currentIndex === words.length - 1 ? topicFlowLabels.practiceNow : t.next}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {(mode === 'blitz' || mode === 'bullet' || mode === 'focus') && (
                  <TouchableOpacity style={styles.stopActionButton} onPress={handleStop}>
                    <Text style={styles.stopActionButtonText}>⏹ Salir del reto</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </>
      )}

      <ChangeLanguageModal
        visible={showChangeLang} profile={localProfile} onClose={() => setShowChangeLang(false)}
        onChanged={(newLang) => {
          const updated = { ...localProfile, learningLanguage: newLang };
          setLocalProfile(updated);
          onProfileUpdate(updated);
          handleLanguageChange(newLang);
        }}
      />

      <Modal visible={showMemorize} animationType="slide">
        {dailyChallenge && (
          <MemorizeSession
            todayWords={dailyChallenge.words} yesterdayWords={yesterdayWords} allWords={allWords}
            uiLanguage={uiLanguage} onDone={handleMemorizeDone} onSkip={() => setShowMemorize(false)}
          />
        )}
      </Modal>

      <Modal visible={showStats} animationType="slide">
        <StatsScreen language={language} uiLanguage={uiLanguage} onClose={() => setShowStats(false)} />
      </Modal>

      <Modal visible={showProfile} animationType="slide">
        <ProfileScreen profile={localProfile} uiLanguage={uiLanguage} onClose={() => setShowProfile(false)}
          onProfileUpdated={(p) => { setLocalProfile(p); onProfileUpdate(p); }} />
      </Modal>

      <Modal visible={showProfileHub} animationType="slide">
        <ScrollView style={[styles.profileHubContainer, { backgroundColor: colors.bg }]}>
          <View style={styles.profileHubHeader}>
            <Text style={[styles.profileHubTitle, { color: colors.text }]}>{profileHubLabels.title}</Text>
            <TouchableOpacity onPress={() => setShowProfileHub(false)} style={[styles.profileHubCloseBtn, { backgroundColor: colors.surface }]}>
              <Text style={[styles.profileHubCloseText, { color: colors.text2 }]}>{profileHubLabels.close} ✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.profileHubCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.profileHubSectionTitle, { color: colors.text }]}>{profileHubLabels.account}</Text>
            <TouchableOpacity style={[styles.profileHubButton, { backgroundColor: '#43cea2' }]} onPress={() => { setShowProfileHub(false); setShowProfile(true); }}>
              <Text style={styles.profileHubButtonText}>👤 {profileHubLabels.profile}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileHubButton, { backgroundColor: '#f6c90e' }]} onPress={() => { setShowProfileHub(false); handleFavoritesMode(); }}>
              <Text style={styles.profileHubButtonText}>⭐ {profileHubLabels.favorites}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.profileHubCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.profileHubSectionTitle, { color: colors.text }]}>{profileHubLabels.progress}</Text>
            <TouchableOpacity style={[styles.profileHubButton, { backgroundColor: '#f7971e' }]} onPress={() => { setShowProfileHub(false); setShowStats(true); }}>
              <Text style={styles.profileHubButtonText}>📊 {profileHubLabels.stats}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileHubButton, { backgroundColor: '#4facfe' }]} onPress={() => { setShowProfileHub(false); setShowWeaknessMap(true); }}>
              <Text style={styles.profileHubButtonText}>🗺️ {profileHubLabels.weaknessMap}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileHubButton, { backgroundColor: '#f6d365' }]} onPress={() => { setShowProfileHub(false); setShowForgetting(true); }}>
              <Text style={styles.profileHubButtonText}>🔮 {profileHubLabels.forgetting}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileHubButton, { backgroundColor: '#7f7fd5' }]} onPress={() => { setShowProfileHub(false); setShowNightReview(true); }}>
              <Text style={styles.profileHubButtonText}>🌙 {profileHubLabels.nightReview}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.profileHubCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.profileHubSectionTitle, { color: colors.text }]}>{profileHubLabels.preferences}</Text>
            <TouchableOpacity style={[styles.profileHubButton, { backgroundColor: darkMode ? '#f6c90e' : '#667eea' }]} onPress={toggleDarkMode}>
              <Text style={styles.profileHubButtonText}>{darkMode ? '☀️' : '🌙'} {profileHubLabels.theme}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileHubButton, { backgroundColor: '#667eea' }]} onPress={() => { setShowProfileHub(false); setShowChangeLang(true); }}>
              <Text style={styles.profileHubButtonText}>🌐 {profileHubLabels.language}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={showWeaknessMap} animationType="slide">
        <WeaknessMap language={language} uiLanguage={uiLanguage} onClose={() => setShowWeaknessMap(false)} />
      </Modal>

      <Modal visible={showForgetting} animationType="slide">
        <ForgettingPredictor language={language} uiLanguage={uiLanguage} onClose={() => setShowForgetting(false)} />
      </Modal>

      <Modal visible={showNightReview} animationType="slide">
        <NightReview language={language} uiLanguage={uiLanguage} onClose={() => setShowNightReview(false)} />
      </Modal>

      <AchievementToast achievement={pendingAchievement} uiLanguage={uiLanguage} onDone={() => setPendingAchievement(null)} />

      <Modal visible={showLearnTour} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.tourCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tourTitle, { color: colors.text }]}>{learnTourLabels.title}</Text>
            <Text style={[styles.tourText, { color: colors.text2 }]}>{learnTourLabels.body}</Text>
            <TouchableOpacity
              style={[styles.tourButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                await markAppTourCompleted();
                setShowLearnTour(false);
              }}
            >
              <Text style={styles.buttonText}>{learnTourLabels.cta}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showFocusSummary} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.focusSummary}</Text>
            <Text style={[styles.modalText, { color: colors.text2 }]}>{t.correctWords.replace('{count}', focusResults.correct.toString())}</Text>
            <Text style={[styles.modalText, { color: colors.text2 }]}>{t.incorrectWords.replace('{count}', focusResults.incorrect.toString())}</Text>
            <Text style={[styles.modalText, { color: colors.text2 }]}>{t.totalWords.replace('{count}', words.length.toString())}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.button, styles.modalButton]} onPress={handleRestartFocus}>
                <Text style={styles.buttonText}>{t.restart}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.modalButton, styles.stopButton]} onPress={handleStop}>
                <Text style={styles.buttonText}>{t.stop}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: s(15), borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  backOnlyToggle: { alignItems: 'center' },
  backOnlyLabel: { fontSize: s(10), fontWeight: '600', textAlign: 'center' },
  backOnlySwitch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  streakText: { fontSize: s(14), fontWeight: '700' },
  smallHeaderBtn: {
    minWidth: s(62), paddingVertical: s(7), paddingHorizontal: s(10),
    borderRadius: s(18), borderWidth: 1.5, alignItems: 'center',
  },
  smallHeaderBtnText: { fontSize: s(11), fontWeight: '700' },
  searchContainer: { paddingHorizontal: s(15), paddingVertical: s(8), borderBottomWidth: 1, zIndex: 100 },
  cardTopControls: { paddingHorizontal: s(20), paddingTop: s(12), alignItems: 'flex-start' },
  content: { flexShrink: 1 },
  controls: { padding: s(15), borderTopWidth: 1 },
  counter: { textAlign: 'center', fontSize: s(16), marginBottom: s(15) },
  modeIndicator: { color: '#f5576c' },
  navigation: { flexDirection: 'row', justifyContent: 'space-around', gap: s(10) },
  focusControls: { flexDirection: 'row', justifyContent: 'space-around', gap: s(10) },
  button: { flex: 1, backgroundColor: '#2196F3', padding: s(15), borderRadius: s(8), alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  correctButton: { backgroundColor: '#4CAF50' },
  incorrectButton: { backgroundColor: '#f44336' },
  stopButton: { backgroundColor: '#ff9800', marginTop: s(10) },
  stopActionButton: {
    marginTop: s(10),
    backgroundColor: '#ff9800',
    paddingVertical: s(15),
    borderRadius: s(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: s(54),
  },
  stopActionButtonText: { color: '#fff', fontSize: s(18), fontWeight: '800' },
  buttonText: { color: '#fff', fontSize: s(16), fontWeight: '600' },
  noWords: { flex: 1, textAlign: 'center', marginTop: s(50), fontSize: s(18) },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { padding: s(30), borderRadius: s(12), width: '80%', alignItems: 'center' },
  modalTitle: { fontSize: s(24), fontWeight: 'bold', marginBottom: s(20) },
  modalText: { fontSize: s(18), marginVertical: s(5) },
  modalButtons: { flexDirection: 'row', marginTop: s(20), gap: s(10), width: '100%' },
  modalButton: { flex: 1 },
  summaryCard: { margin: s(20), padding: s(30), borderRadius: s(16), alignItems: 'center', gap: s(12) },
  summaryBtn: { paddingVertical: s(14), paddingHorizontal: s(32), borderRadius: s(10), alignItems: 'center', marginTop: s(8) },
  profileHubContainer: { flex: 1 },
  profileHubHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: s(20), paddingTop: s(24),
  },
  profileHubTitle: { fontSize: s(22), fontWeight: '800' },
  profileHubCloseBtn: { paddingVertical: s(8), paddingHorizontal: s(14), borderRadius: s(20) },
  profileHubCloseText: { fontSize: s(13), fontWeight: '600' },
  profileHubCard: {
    marginHorizontal: s(16), marginBottom: s(16), padding: s(16),
    borderRadius: s(14), borderWidth: 1, gap: s(10),
  },
  profileHubSectionTitle: { fontSize: s(15), fontWeight: '800', marginBottom: s(4) },
  profileHubButton: { paddingVertical: s(13), paddingHorizontal: s(14), borderRadius: s(10) },
  profileHubButtonText: { color: '#fff', fontSize: s(14), fontWeight: '700' },
  practiceGateContainer: { flex: 1 },
  challengeIntroWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: s(24) },
  challengeIntroCard: { borderWidth: 1, borderRadius: s(18), padding: s(24), width: '100%', maxWidth: s(360), gap: s(14) },
  challengeIntroTitle: { fontSize: s(24), fontWeight: '800', textAlign: 'center' },
  challengeIntroText: { fontSize: s(18), lineHeight: s(28), textAlign: 'center' },
  challengeCountdownWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  challengeCountdownNumber: { fontSize: s(96), fontWeight: '900', lineHeight: s(110) },
  practicePromptCard: {
    borderWidth: 1, borderRadius: s(12), padding: s(14),
    marginBottom: s(12), gap: s(8),
  },
  practicePromptTitle: { fontSize: s(18), fontWeight: '800', textAlign: 'center' },
  practicePromptText: { fontSize: s(14), lineHeight: s(20), textAlign: 'center' },
  tourCard: { padding: s(24), borderRadius: s(16), width: '86%', alignItems: 'center', gap: s(14) },
  tourTitle: { fontSize: s(22), fontWeight: '800', textAlign: 'center' },
  tourText: { fontSize: s(16), lineHeight: s(24), textAlign: 'center' },
  tourButton: { minWidth: s(140), paddingVertical: s(14), paddingHorizontal: s(22), borderRadius: s(12), alignItems: 'center' },
});
