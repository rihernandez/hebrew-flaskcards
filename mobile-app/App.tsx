import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Modal, Switch, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const scale = Math.min(width / 390, 1.8);
const s = (size: number) => Math.round(size * scale);

import { StatusBar } from 'expo-status-bar';
import { Flashcard } from './src/components/Flashcard';
import { TopicMenu } from './src/components/TopicMenu';
import { WordOfDay } from './src/components/WordOfDay';
import { Word, Language } from './src/types/Word';
import { getTopics, getWords, getAllWordsExcept, getAllWords, getLanguages } from './src/utils/dataService';
import { translations, getUILanguage, isRTL } from './src/utils/translations';
import { SearchBar } from './src/components/SearchBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { WriteMode } from './src/components/WriteMode';
import { QuizMode } from './src/components/QuizMode';
import { markWordSeen } from './src/utils/progress';
import { updateStreak } from './src/utils/streak';
import { getFavorites } from './src/utils/favorites';
import { getErrors, clearErrors } from './src/utils/errorHistory';

type Mode = 'normal' | 'blitz' | 'bullet' | 'focus' | 'write' | 'quiz' | 'favorites' | 'errors';

function AppContent() {
  const { colors, darkMode, toggleDarkMode } = useTheme();
  const [language, setLanguage] = useState('Hebreo');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [uiLanguage, setUiLanguage] = useState<Language>('es');
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = translations[uiLanguage];

  useEffect(() => {
    const langs = getLanguages();
    setAvailableLanguages(langs);
    // Load persisted language
    AsyncStorage.getItem('selected_language').then(saved => {
      const lang = (saved && langs.includes(saved)) ? saved : (langs[0] ?? 'Hebreo');
      setLanguage(lang);
      setUiLanguage(getUILanguage(lang));
      const availableTopics = getTopics(lang);
      setTopics(availableTopics);
      setAllWords(getAllWords());
      if (availableTopics.length > 0) {
        setSelectedTopic(availableTopics[0]);
        setWords(getWords(lang, availableTopics[0]));
      }
      setLoading(false);
      // Streak
      updateStreak().then(s => setStreak(s.currentStreak));
    });
  }, []);

  const handleLanguageChange = (lang: string) => {
    AsyncStorage.setItem('selected_language', lang);
    setLanguage(lang);
    setUiLanguage(getUILanguage(lang));
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

  const handleTopicChange = (topic: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSelectedTopic(topic);
    setWords(getWords(language, topic));
    setCurrentIndex(0);
    setShowMenu(false);
    setMode('normal');
    setIsFlipped(backOnlyMode);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
    const favWords = getAllWords().filter(w =>
      w.language === language && favKeys.includes(`${w.language}_${w.word}_${w.topic}`)
    );
    if (favWords.length === 0) return;
    setWords(shuffleArray(favWords)); setCurrentIndex(0); setMode('favorites'); setShowMenu(false); setIsFlipped(false);
  };

  const handleErrorsMode = async () => {
    const errWords = await getErrors(language);
    if (errWords.length === 0) return;
    setWords(shuffleArray(errWords)); setCurrentIndex(0); setMode('errors'); setShowMenu(false); setIsFlipped(false);
    setErrorCount(errWords.length);
  };

  const handleClearErrors = async () => {
    await clearErrors(language);
    setErrorCount(0);
    setShowMenu(true);
    setMode('normal');
  };

  const [modeSummary, setModeSummary] = useState<{ correct: number; incorrect: number } | null>(null);

  const handleFocusAnswer = (isCorrect: boolean) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setFocusResults(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));
    if (currentIndex < words.length - 1) {
      setIsFlipped(false); setCurrentIndex(currentIndex + 1);
    } else { setShowFocusSummary(true); }
  };

  const handleNext = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (currentIndex < words.length - 1) {
      // mark current as seen before moving
      const w = words[currentIndex];
      markWordSeen(language, w.topic, `${w.word}_${w.topic}`);
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
    setMode('normal'); setIsFlipped(false); setShowMenu(true); setModeSummary(null);
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

  if (loading || words.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        {!loading && <Text style={[styles.noWords, { color: colors.text2 }]}>{t.noWords}</Text>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />

      {/* Word of the Day */}
      <WordOfDay allWords={allWords} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.streakText, { color: '#ff9800' }]}>🔥 {streak}</Text>
          <Text style={[styles.backOnlyLabel, { color: colors.primary }]}>{t.backOnly}</Text>
          <Switch
            value={backOnlyMode}
            onValueChange={(val) => {
              setBackOnlyMode(val);
              if (mode === 'normal' && words.length > 0) setIsFlipped(val);
            }}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.headerRight}>
          {/* Dark mode toggle */}
          <TouchableOpacity style={[styles.darkBtn, { borderColor: colors.primary }]} onPress={toggleDarkMode}>
            <Text style={{ fontSize: s(16) }}>{darkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuButton, { backgroundColor: colors.primary }]} onPress={() => setShowMenu(!showMenu)}>
            <Text style={styles.menuButtonText}>{showMenu ? t.hideMenu : t.showMenu}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <SearchBar allWords={getAllWords()} />
      </View>

      {showMenu ? (
        <TopicMenu
          topics={topics}
          selectedTopic={selectedTopic}
          language={language}
          uiLanguage={uiLanguage}
          availableLanguages={availableLanguages}
          onLanguageChange={handleLanguageChange}
          onTopicChange={handleTopicChange}
          onBlitzMode={handleBlitzMode}
          onBulletMode={handleBulletMode}
          onFocusMode={handleFocusMode}
          onWriteMode={handleWriteMode}
          onQuizMode={handleQuizMode}
          onFavoritesMode={handleFavoritesMode}
          onErrorsMode={handleErrorsMode}
          errorCount={errorCount}
          translations={t}
        />
      ) : mode === 'write' || mode === 'errors' ? (
        modeSummary ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>📊 {t.focusSummary.replace('Focus', t.writing)}</Text>
            <Text style={[styles.modalText, { color: '#4caf50' }]}>Correctas: {modeSummary.correct}</Text>
            <Text style={[styles.modalText, { color: '#f44336' }]}>Incorrectas: {modeSummary.incorrect}</Text>
            <Text style={[styles.modalText, { color: colors.primary }]}>Total: {modeSummary.correct + modeSummary.incorrect}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, marginTop: s(16) }]} onPress={handleStop}>
              <Text style={styles.buttonText}>🔄 Reiniciar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WriteMode words={words} onFinish={(c, i) => setModeSummary({ correct: c, incorrect: i })} />
        )
      ) : mode === 'quiz' || mode === 'favorites' ? (
        modeSummary ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>📊 {t.focusSummary.replace('Focus', t.quiz)}</Text>
            <Text style={[styles.modalText, { color: '#4caf50' }]}>Correctas: {modeSummary.correct}</Text>
            <Text style={[styles.modalText, { color: '#f44336' }]}>Incorrectas: {modeSummary.incorrect}</Text>
            <Text style={[styles.modalText, { color: colors.primary }]}>Total: {modeSummary.correct + modeSummary.incorrect}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, marginTop: s(16) }]} onPress={handleStop}>
              <Text style={styles.buttonText}>🔄 Reiniciar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <QuizMode words={words} allWords={allWords} onFinish={(c, i) => setModeSummary({ correct: c, incorrect: i })} />
        )
      ) : (
        <>
          <View style={styles.content}>
            <Flashcard
              word={words[currentIndex]}
              examplesLabel={t.examples}
              learningRTL={isRTL(language)}
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

      {/* Focus summary modal */}
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
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: s(15),
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  backOnlyLabel: { fontSize: s(12), fontWeight: '500' },
  streakText: { fontSize: s(14), fontWeight: '700' },
  darkBtn: {
    width: s(36), height: s(36),
    borderRadius: s(8), borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  menuButton: { padding: s(10), borderRadius: s(8) },
  menuButtonText: { color: '#fff', fontSize: s(14), fontWeight: '600' },
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
  summaryCard: { flex: 1, margin: s(20), padding: s(30), borderRadius: s(16), alignItems: 'center', justifyContent: 'center', gap: s(12) },
});
