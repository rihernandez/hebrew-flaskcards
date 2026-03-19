import { useState, useEffect, useRef } from 'react';
import LanguageSelector from './components/LanguageSelector';
import TopicMenu from './components/TopicMenu';
import Flashcard from './components/Flashcard';
import GrammarCard from './components/GrammarCard';
import { translations, getUILanguage, isRTL, type Language } from './i18n/translations';
import GuidesMenu from './components/GuidesMenu';

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

function App() {
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
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

  // Countdown state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState<number | string>(3);

  // Determinar el idioma de la UI basado en el idioma de aprendizaje
  const uiLanguage: Language = selectedLanguage ? getUILanguage(selectedLanguage) : 'es';
  const t = translations[uiLanguage];
  const uiRTL = isRTL(uiLanguage);
  
  // Detectar si corre dentro de Tauri
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
  
  // Determinar si el idioma de aprendizaje es RTL
  const learningRTL = selectedLanguage === 'Hebreo';

  // Aplicar dirección RTL al documento para la UI
  useEffect(() => {
    document.documentElement.dir = uiRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = uiLanguage;
  }, [uiRTL, uiLanguage]);

  // Load JSON on mount
  useEffect(() => {
    loadAllWords().then(data => {
      setAllWords(data);
      setLanguages(getLanguages(data));
    });
  }, []);

  useEffect(() => {
    if (selectedLanguage && allWords.length > 0) {
      setTopics(getTopics(allWords, selectedLanguage));
      setSelectedTopic('');
      setWords([]);
      setMenuVisible(true);
      clearShownWords(selectedLanguage, 'blitz');
      clearShownWords(selectedLanguage, 'bullet');
      clearShownWords(selectedLanguage, 'focus');
    }
  }, [selectedLanguage, allWords]);

  useEffect(() => {
    if (selectedLanguage && selectedTopic && !selectedTopic.includes('Mode') && allWords.length > 0) {
      const topicWords = getWordsByTopic(allWords, selectedLanguage, selectedTopic);
      setWords(topicWords);
      setCurrentIndex(0);
      setMenuVisible(false);
      setAutoPlayMode(null);
      setFocusMode(false);
      setIsFlipped(backOnlyMode);
      setIsComplete(false);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }
  }, [selectedLanguage, selectedTopic, allWords]);

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

  const getWordsForMode = (): Word[] => {
    const shuffled = allWords
      .filter(w => w.language === selectedLanguage && !EXCLUDED_TOPICS.includes(w.topic))
      .sort(() => Math.random() - 0.5);
    return shuffled;
  };

  const handleBlitzMode = async () => {
    if (!selectedLanguage) return;
    stopAutoPlay();
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

  const handleFocusCorrect = () => {
    // Marcar palabra como mostrada
    const currentWord = words[currentIndex];
    addShownWord(selectedLanguage, 'focus', currentWord.id);
    
    setFocusCorrectCount(prev => prev + 1);
    moveToNextFocusWord();
  };

  const handleFocusIncorrect = () => {
    // Marcar palabra como mostrada
    const currentWord = words[currentIndex];
    addShownWord(selectedLanguage, 'focus', currentWord.id);
    
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

  const handleNext = () => {
    stopAutoPlay();
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // En back-only mode (solo temas), mostrar directamente el reverso
      if (backOnlyMode && !autoPlayMode && !focusMode) {
        setIsFlipped(true);
      }
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
    setWords([]);
    setSelectedTopic('');
    setCurrentIndex(0);
    setMenuVisible(true);
    setIsComplete(false);
    setIsFlipped(false);
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
        </div>
        <div className="header-right">
          {words.length > 0 && (
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
                // Si hay un tema activo (no modo), aplicar inmediatamente
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
          <LanguageSelector 
            languages={languages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            placeholder={t.selectLanguage}
          />
        </div>
      </header>
      
      <div className={`main-content ${!menuVisible ? 'menu-hidden' : ''}`}>
        {selectedLanguage && topics.length > 0 && menuVisible && (
          <div>
            <TopicMenu 
              topics={topics}
              selectedTopic={selectedTopic}
              onTopicChange={setSelectedTopic}
              onFocusMode={handleFocusMode}
              onBlitzMode={handleBlitzMode}
              onBulletMode={handleBulletMode}
              selectedLanguage={selectedLanguage}
              translations={t}
            />
            <GuidesMenu isTauri={isTauri} />
          </div>
        )}
        
        <div className="flashcard-container">
          {focusShowingSummary ? (
            // Mostrar resumen de Focus Mode
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
          ) : words.length > 0 && !isComplete && (
            <>
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
                    <button onClick={handlePrevious} disabled={currentIndex === 0}>
                      {t.previous}
                    </button>
                    <span>
                      {currentIndex + 1} / {words.length}
                    </span>
                    <button onClick={handleNext} disabled={currentIndex === words.length - 1}>
                      {t.next}
                    </button>
                  </div>
                </>
              ) : (
                // Mostrar Flashcard normal para otros temas
                <>
                  <Flashcard 
                    {...words[currentIndex]} 
                    isFlipped={isFlipped} 
                    examplesLabel={t.examples}
                    learningRTL={learningRTL}
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
                    <button onClick={handlePrevious} disabled={currentIndex === 0 || autoPlayMode !== null || focusMode}>
                      {t.previous}
                    </button>
                    <span>
                      {currentIndex + 1} / {words.length}
                      {autoPlayMode && <span className="mode-indicator"> • {autoPlayMode === 'blitz' ? '⚡ Blitz' : '🚀 Bullet'}</span>}
                      {focusMode && <span className="mode-indicator"> • 🎯 Focus</span>}
                    </span>
                    <button onClick={handleNext} disabled={currentIndex === words.length - 1 || autoPlayMode !== null || focusMode}>
                      {t.next}
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
          {isComplete && (
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
    </div>
  );
}

export default App;
