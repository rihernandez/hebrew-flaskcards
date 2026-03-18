import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Modal, Switch, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const scale = Math.min(width / 390, 1.8);
const s = (size: number) => Math.round(size * scale);
import { StatusBar } from 'expo-status-bar';
import { Flashcard } from './src/components/Flashcard';
import { TopicMenu } from './src/components/TopicMenu';
import { Word, Language } from './src/types/Word';
import { getTopics, getWords, getAllWordsExcept } from './src/utils/dataService';
import { translations, getUILanguage, isRTL } from './src/utils/translations';

type Mode = 'normal' | 'blitz' | 'bullet' | 'focus';

export default function App() {
  const [language] = useState('Hebreo');
  const [uiLanguage, setUiLanguage] = useState<Language>('es');
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(true);
  const [mode, setMode] = useState<Mode>('normal');
  const [isFlipped, setIsFlipped] = useState(false);
  const [focusResults, setFocusResults] = useState<{ correct: number; incorrect: number }>({ correct: 0, incorrect: 0 });
  const [showFocusSummary, setShowFocusSummary] = useState(false);
  const [backOnlyMode, setBackOnlyMode] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = translations[uiLanguage];

  useEffect(() => {
    const lang = 'Hebreo';
    const availableTopics = getTopics(lang);
    setTopics(availableTopics);
    setUiLanguage(getUILanguage(lang));
    
    if (availableTopics.length > 0) {
      setSelectedTopic(availableTopics[0]);
      setWords(getWords(lang, availableTopics[0]));
    }
  }, []);

  const handleTopicChange = (topic: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setSelectedTopic(topic);
    setWords(getWords(language, topic));
    setCurrentIndex(0);
    setShowMenu(false);
    setMode('normal');
    setIsFlipped(backOnlyMode);
  };

  const handleBlitzMode = () => {
    const blitzWords = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    setWords(shuffleArray(blitzWords));
    setCurrentIndex(0);
    setMode('blitz');
    setShowMenu(false);
    setIsFlipped(false);
  };

  const handleBulletMode = () => {
    const bulletWords = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    setWords(shuffleArray(bulletWords));
    setCurrentIndex(0);
    setMode('bullet');
    setShowMenu(false);
    setIsFlipped(false);
  };

  const handleFocusMode = () => {
    const focusWords = getAllWordsExcept(language, ['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)']);
    setWords(shuffleArray(focusWords));
    setCurrentIndex(0);
    setMode('focus');
    setShowMenu(false);
    setFocusResults({ correct: 0, incorrect: 0 });
    setShowFocusSummary(false);
    setIsFlipped(false);
  };

  const handleFocusAnswer = (isCorrect: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setFocusResults(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));

    if (currentIndex < words.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowFocusSummary(true);
    }
  };

  const handleNext = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(backOnlyMode && mode === 'normal');
    }
  };

  const handlePrevious = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(backOnlyMode && mode === 'normal');
    }
  };

  const handleStop = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMode('normal');
    setIsFlipped(false);
    setShowMenu(true);
  };

  const handleRestartFocus = () => {
    setShowFocusSummary(false);
    setFocusResults({ correct: 0, incorrect: 0 });
    setCurrentIndex(0);
    setWords(shuffleArray(words));
    setIsFlipped(false);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Auto-play effect para Blitz y Bullet
  useEffect(() => {
    if ((mode !== 'blitz' && mode !== 'bullet') || words.length === 0) return;

    const frontDisplayTime = mode === 'blitz' ? 3000 : 1000;
    let cancelled = false;
    let index = 0;

    const step = () => {
      if (cancelled) return;

      // Mostrar frente de la palabra actual
      setCurrentIndex(index);
      setIsFlipped(false);

      // Después de frontDisplayTime, mostrar reverso
      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        setIsFlipped(true);

        // Después de mostrar reverso, pasar a la siguiente
        const backDisplayTime = mode === 'blitz' ? 3000 : 1000;
        timeoutRef.current = setTimeout(() => {
          if (cancelled) return;
          index += 1;
          if (index < words.length) {
            step();
          } else {
            setMode('normal');
            setShowMenu(true);
          }
        }, backDisplayTime);

      }, frontDisplayTime);
    };

    // Pequeña pausa inicial antes de arrancar
    timeoutRef.current = setTimeout(step, 1000);

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [mode, words]);

  // Auto-flip effect para Focus mode
  useEffect(() => {
    if (mode === 'focus' && words.length > 0 && !showFocusSummary) {
      // Mostrar frente por 5 segundos, luego voltear
      setIsFlipped(false);
      
      timeoutRef.current = setTimeout(() => {
        setIsFlipped(true);
      }, 5000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [mode, currentIndex, words.length, showFocusSummary]);

  if (words.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.noWords}>{t.noWords}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.backOnlyLabel}>Solo reverso</Text>
          <Switch
            value={backOnlyMode}
            onValueChange={(val) => {
              setBackOnlyMode(val);
              if (mode === 'normal' && words.length > 0) {
                setIsFlipped(val);
              }
            }}
            trackColor={{ false: '#ccc', true: '#667eea' }}
            thumbColor="#fff"
          />
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Text style={styles.menuButtonText}>
            {showMenu ? t.hideMenu : t.showMenu}
          </Text>
        </TouchableOpacity>
      </View>

      {showMenu ? (
        <TopicMenu
          topics={topics}
          selectedTopic={selectedTopic}
          onTopicChange={handleTopicChange}
          onBlitzMode={handleBlitzMode}
          onBulletMode={handleBulletMode}
          onFocusMode={handleFocusMode}
          translations={t}
        />
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

          <View style={styles.controls}>
            <Text style={styles.counter}>
              {currentIndex + 1} / {words.length}
              {mode === 'blitz' && <Text style={styles.modeIndicator}> • ⚡ Blitz</Text>}
              {mode === 'bullet' && <Text style={styles.modeIndicator}> • 🚀 Bullet</Text>}
              {mode === 'focus' && <Text style={styles.modeIndicator}> • 🎯 Focus</Text>}
            </Text>

            {mode === 'focus' ? (
              <View style={styles.focusControls}>
                <TouchableOpacity
                  style={[styles.button, styles.incorrectButton]}
                  onPress={() => handleFocusAnswer(false)}
                >
                  <Text style={styles.buttonText}>{t.incorrect}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.correctButton]}
                  onPress={() => handleFocusAnswer(true)}
                >
                  <Text style={styles.buttonText}>{t.correct}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.navigation}>
                <TouchableOpacity
                  style={[styles.button, (currentIndex === 0 || mode !== 'normal') && styles.buttonDisabled]}
                  onPress={handlePrevious}
                  disabled={currentIndex === 0 || mode !== 'normal'}
                >
                  <Text style={styles.buttonText}>{t.previous}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, (currentIndex === words.length - 1 || mode !== 'normal') && styles.buttonDisabled]}
                  onPress={handleNext}
                  disabled={currentIndex === words.length - 1 || mode !== 'normal'}
                >
                  <Text style={styles.buttonText}>{t.next}</Text>
                </TouchableOpacity>
              </View>
            )}

            {(mode === 'blitz' || mode === 'bullet' || mode === 'focus') && (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStop}
              >
                <Text style={styles.buttonText}>{t.stop}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      <Modal
        visible={showFocusSummary}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.focusSummary}</Text>
            <Text style={styles.modalText}>
              {t.correctWords.replace('{count}', focusResults.correct.toString())}
            </Text>
            <Text style={styles.modalText}>
              {t.incorrectWords.replace('{count}', focusResults.incorrect.toString())}
            </Text>
            <Text style={styles.modalText}>
              {t.totalWords.replace('{count}', words.length.toString())}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.modalButton]}
                onPress={handleRestartFocus}
              >
                <Text style={styles.buttonText}>{t.restart}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.modalButton]}
                onPress={handleStop}
              >
                <Text style={styles.buttonText}>{t.stop}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: s(15),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  backOnlyLabel: {
    fontSize: s(12),
    color: '#667eea',
    fontWeight: '500',
  },
  menuButton: {
    backgroundColor: '#2196F3',
    padding: s(10),
    borderRadius: s(8),
  },
  menuButtonText: {
    color: '#fff',
    fontSize: s(14),
    fontWeight: '600',
  },
  content: {
    flexShrink: 1,
  },
  controls: {
    padding: s(15),
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  counter: {
    textAlign: 'center',
    fontSize: s(16),
    marginBottom: s(15),
    color: '#666',
  },
  modeIndicator: {
    color: '#f5576c',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: s(10),
    direction: 'ltr',
  },
  focusControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: s(10),
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: s(15),
    borderRadius: s(8),
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  correctButton: {
    backgroundColor: '#4CAF50',
  },
  incorrectButton: {
    backgroundColor: '#f44336',
  },
  stopButton: {
    backgroundColor: '#ff9800',
    marginTop: s(10),
  },
  buttonText: {
    color: '#fff',
    fontSize: s(16),
    fontWeight: '600',
  },
  noWords: {
    flex: 1,
    textAlign: 'center',
    marginTop: s(50),
    fontSize: s(18),
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: s(30),
    borderRadius: s(12),
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: s(24),
    fontWeight: 'bold',
    marginBottom: s(20),
    color: '#333',
  },
  modalText: {
    fontSize: s(18),
    marginVertical: s(5),
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: s(20),
    gap: s(10),
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
});
