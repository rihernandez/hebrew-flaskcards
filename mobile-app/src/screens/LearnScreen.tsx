import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Switch, Dimensions } from 'react-native';
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
import { markWordSeen } from '../utils/progress';
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

const { width } = Dimensions.get('window');
const s = (size: number) => Math.round(size * Math.min(width / 390, 1.8));

type Mode = 'normal' | 'blitz' | 'bullet' | 'focus' | 'write' | 'quiz' | 'favorites' | 'errors';

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
  const [showWeaknessMap, setShowWeaknessMap] = useState(false);
  const [showForgetting, setShowForgetting] = useState(false);
  const [showNightReview, setShowNightReview] = useState(false);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [showMemorize, setShowMemorize] = useState(false);
  const [yesterdayWords, setYesterdayWords] = useState<Word[] | null>(null);
  const [modeSummary, setModeSummary] = useState<{ correct: number; incorrect: number } | null>(null);
  const [summaryCountdown, setSummaryCountdown] = useState(3);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const t = translations[uiLanguage];

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

  const handleTopicChange = (topic: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSelectedTopic(topic);
    setWords(getWords(language, topic));
    setCurrentIndex(0);
    setShowMenu(false);
    setMode('normal');
    setIsFlipped(backOnlyMode);
  };

  const handleBlitzMode = () => {
    const w = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    setWords(shuffleArray(w)); setCurrentIndex(0); setMode('blitz'); setShowMenu(false); setIsFlipped(false);
  };
  const handleBulletMode = () => {
    const w = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    setWords(shuffleArray(w)); setCurrentIndex(0); setMode('bullet'); setShowMenu(false); setIsFlipped(false);
  };
  const handleFocusMode = () => {
    const w = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    setWords(shuffleArray(w)); setCurrentIndex(0); setMode('focus'); setShowMenu(false);
    setFocusResults({ correct: 0, incorrect: 0 }); setShowFocusSummary(false); setIsFlipped(false);
  };
  const handleWriteMode = () => {
    const w = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    setWords(shuffleArray(w)); setCurrentIndex(0); setMode('write'); setShowMenu(false); setIsFlipped(false);
  };
  const handleQuizMode = () => {
    const w = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    setWords(shuffleArray(w)); setCurrentIndex(0); setMode('quiz'); setShowMenu(false); setIsFlipped(false);
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
    if (currentIndex < words.length - 1) {
      const w = words[currentIndex];
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
    setSummaryCountdown(3);
    getErrors(language).then(e => setErrorCount(e.length));
  };

  const handleRestartFocus = () => {
    setShowFocusSummary(false); setFocusResults({ correct: 0, incorrect: 0 });
    setCurrentIndex(0); setWords(shuffleArray(words)); setIsFlipped(false);
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
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={() => setShowWeaknessMap(true)}>
            <Text style={{ fontSize: s(16) }}>🗺️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={() => setShowForgetting(true)}>
            <Text style={{ fontSize: s(16) }}>🔮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={() => setShowNightReview(true)}>
            <Text style={{ fontSize: s(16) }}>🌙</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={() => setShowStats(true)}>
            <Text style={{ fontSize: s(16) }}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={() => setShowProfile(true)}>
            <Text style={{ fontSize: s(16) }}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={toggleDarkMode}>
            <Text style={{ fontSize: s(16) }}>{darkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={() => setShowChangeLang(true)}>
            <Text style={{ fontSize: s(14) }}>🌐</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={() => setShowMenu(!showMenu)}>
            <Text style={{ fontSize: s(16) }}>{showMenu ? '✕' : '☰'}</Text>
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

      {showMenu ? (
        <TopicMenu
          topics={topics} selectedTopic={selectedTopic} language={language} uiLanguage={uiLanguage}
          availableLanguages={availableLanguages} onLanguageChange={handleLanguageChange}
          onTopicChange={handleTopicChange} onBlitzMode={handleBlitzMode} onBulletMode={handleBulletMode}
          onFocusMode={handleFocusMode} onWriteMode={handleWriteMode} onQuizMode={handleQuizMode}
          onFavoritesMode={handleFavoritesMode} onErrorsMode={handleErrorsMode}
          errorCount={errorCount} translations={t}
        />
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
          <View style={styles.content}>
            <Flashcard
              word={words[currentIndex]} examplesLabel={t.examples} learningRTL={isRTL(language)}
              isFlipped={mode !== 'normal' ? isFlipped : (backOnlyMode ? true : undefined)}
              lockFlip={backOnlyMode && mode === 'normal'}
            />
          </View>
          <View style={[styles.controls, { backgroundColor: colors.controlBg, borderTopColor: colors.border }]}>
            <Text style={[styles.counter, { color: colors.text2 }]}>
              {currentIndex + 1} / {words.length}
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
                  style={[styles.button, { backgroundColor: colors.primary }, (currentIndex === words.length - 1 || mode !== 'normal') && styles.buttonDisabled]}
                  onPress={handleNext} disabled={currentIndex === words.length - 1 || mode !== 'normal'}
                >
                  <Text style={styles.buttonText}>{t.next}</Text>
                </TouchableOpacity>
              </View>
            )}
            {(mode === 'blitz' || mode === 'bullet' || mode === 'focus') && (
              <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStop}>
                <Text style={styles.buttonText}>{t.stop}</Text>
              </TouchableOpacity>
            )}
          </View>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  backOnlyToggle: { alignItems: 'center' },
  backOnlyLabel: { fontSize: s(10), fontWeight: '600', textAlign: 'center' },
  backOnlySwitch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  streakText: { fontSize: s(14), fontWeight: '700' },
  darkBtn: { width: s(36), height: s(36), borderRadius: s(8), borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { paddingHorizontal: s(15), paddingVertical: s(8), borderBottomWidth: 1, zIndex: 100 },
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
});
