import { useEffect, useMemo, useRef, useState } from 'react';
import { addFocusError } from '../utils/storage';
import { topicTranslations } from '../i18n/translations';

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

interface TopicVoiceModeProps {
  allWords: Word[];
  selectedLanguage: string;
  translations: any;
  onClose: () => void;
}

const MAX_TOPIC_BUTTONS = 10;
const NEXT_WORD_DELAY_MS = 3000;

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const normalize = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export default function TopicVoiceMode({
  allWords,
  selectedLanguage,
  translations,
  onClose,
}: TopicVoiceModeProps) {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topicWords, setTopicWords] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean | null>(null);
  const recognitionRef = useRef<any>(null);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningRef = useRef(false);
  const resolvedRef = useRef(false);
  const attemptCountRef = useRef(0);
  const autoRestartRef = useRef(true);

  const languageWords = useMemo(
    () => allWords.filter((word) => word.language === selectedLanguage),
    [allWords, selectedLanguage],
  );

  const topics = useMemo(
    () => Array.from(new Set(languageWords.map((word) => word.topic))).slice(0, MAX_TOPIC_BUTTONS),
    [languageWords],
  );

  const speechApiSupported = typeof window !== 'undefined'
    && (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window));

  const current = topicWords[index];
  const finished = topicWords.length > 0 && index >= topicWords.length;

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    resolvedRef.current = resolved;
  }, [resolved]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  const resetAnswerState = () => {
    setVoiceTranscript('');
    setListening(false);
    listeningRef.current = false;
    setAttemptCount(0);
    attemptCountRef.current = 0;
    setResolved(false);
    resolvedRef.current = false;
    setIsCorrectAnswer(null);
    autoRestartRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  };

  const startTopic = (topic: string) => {
    const words = shuffle(languageWords.filter((word) => word.topic === topic));
    setSelectedTopic(topic);
    setTopicWords(words);
    setIndex(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    resetAnswerState();
  };

  const evaluateVoice = (value: string) => {
    if (!current || resolvedRef.current) return;

    const orderedTargets = selectedLanguage === 'Hebreo'
      ? [current.pronunciation, current.word]
      : [current.word, current.pronunciation];
    const targets = orderedTargets.filter((target, idx, arr) => target && arr.indexOf(target) === idx);
    const received = normalize(value);

    const ok = received.length > 0
      && targets.some((target) => {
        const expected = normalize(target);
        return received === expected || received.includes(expected) || expected.includes(received);
      });

    if (ok) {
      setIsCorrectAnswer(true);
      setResolved(true);
      resolvedRef.current = true;
      autoRestartRef.current = false;
      setCorrectCount((count) => count + 1);
      autoNextTimerRef.current = setTimeout(() => {
        nextWord();
      }, NEXT_WORD_DELAY_MS);
      return;
    }

    const nextAttempt = attemptCountRef.current + 1;
    attemptCountRef.current = nextAttempt;
    setAttemptCount(nextAttempt);
    setIsCorrectAnswer(false);
    if (nextAttempt >= 3) {
      setResolved(true);
      resolvedRef.current = true;
      autoRestartRef.current = false;
      setIncorrectCount((count) => count + 1);
      addFocusError(selectedLanguage, current.id);
      autoNextTimerRef.current = setTimeout(() => {
        nextWord();
      }, NEXT_WORD_DELAY_MS);
      return;
    }
  };

  const startVoiceCapture = () => {
    if (!speechApiSupported || resolvedRef.current || listeningRef.current || !current) return;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = selectedLanguage === 'Hebreo' ? 'he-IL' : 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const spoken = event?.results?.[0]?.[0]?.transcript ?? '';
      setVoiceTranscript(spoken);
      evaluateVoice(spoken);
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      listeningRef.current = false;
      const error = String(event?.error ?? '');
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        autoRestartRef.current = false;
      }
    };
    recognition.onend = () => {
      setListening(false);
      listeningRef.current = false;
      if (!resolvedRef.current && autoRestartRef.current) {
        setTimeout(() => {
          startVoiceCapture();
        }, 250);
      }
    };

    try {
      setListening(true);
      listeningRef.current = true;
      recognition.start();
    } catch {
      setListening(false);
      listeningRef.current = false;
    }
  };

  useEffect(() => {
    if (!selectedTopic || !current || resolved || !speechApiSupported) return;
    const timer = setTimeout(() => {
      startVoiceCapture();
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedTopic, current?.id, resolved, speechApiSupported]);

  const nextWord = () => {
    resetAnswerState();
    setIndex((currentIndex) => currentIndex + 1);
  };

  if (!selectedTopic) {
    return (
      <div className="topic-voice-card">
        <h2>{translations.topicVoiceTitle ?? '🎙️ Pronunciación por tema'}</h2>
        <p>{translations.topicVoiceDescription ?? 'Elige un tema y responde por voz según el significado mostrado.'}</p>
        <div className="topic-voice-topics">
          {topics.map((topic) => (
            <button key={topic} className="topic-voice-topic-btn" onClick={() => startTopic(topic)}>
              {selectedLanguage === 'Español' ? (topicTranslations[topic] ?? topic) : topic}
            </button>
          ))}
        </div>
        <button className="restart-btn" onClick={onClose}>
          {translations.restart}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="focus-summary">
        <h2>{translations.topicVoiceSummary ?? '📊 Resumen pronunciación'}</h2>
        <p><strong>{selectedTopic}</strong></p>
        <div className="stats">
          <p className="correct-count">{translations.correctWords.replace('{count}', correctCount.toString())}</p>
          <p className="incorrect-count">{translations.incorrectWords.replace('{count}', incorrectCount.toString())}</p>
          <p className="total-count">{translations.totalWords.replace('{count}', (correctCount + incorrectCount).toString())}</p>
        </div>
        <button className="restart-btn" onClick={() => startTopic(selectedTopic)}>
          {translations.retryPractice ?? translations.restart}
        </button>
        <button className="restart-btn" onClick={() => setSelectedTopic('')}>
          {translations.topics}
        </button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="quiz-card">
      <div className="quiz-counter">{index + 1} / {topicWords.length}</div>
      <div className="quiz-pronunciation">{selectedTopic}</div>
      <div className="quiz-word">{current.meaning}</div>
      <div className="quiz-pronunciation">
        {translations.topicVoicePrompt ?? 'Di la pronunciación por voz'}
      </div>
      <div className="topic-voice-attempts">
        {[0, 1, 2].map((slot) => (
          <span key={slot} className={slot < attemptCount ? 'used' : ''}>✕</span>
        ))}
      </div>

      <div className="write-mode-content">
        <button
          className="write-check-btn"
          onClick={startVoiceCapture}
          disabled={!speechApiSupported || listening || resolved}
        >
          {listening ? (translations.listening ?? '🎤 Escuchando...') : '🎤 Hablar'}
        </button>
      </div>

      {!speechApiSupported && (
        <div className="write-feedback">Tu dispositivo no soporta reconocimiento de voz.</div>
      )}
      {voiceTranscript && (
        <div className="write-feedback">{translations.youSaid.replace('{text}', voiceTranscript)}</div>
      )}

      {isCorrectAnswer !== null && (
        <>
          {(isCorrectAnswer || attemptCount >= 3) ? (
            <div className={`topic-voice-answer ${isCorrectAnswer ? 'correct' : 'wrong'}`}>
              <div className="topic-voice-answer-word">{current.word}</div>
              {current.pronunciation && (
                <div className="topic-voice-answer-pron">({current.pronunciation})</div>
              )}
            </div>
          ) : (
            <div className="write-feedback wrong">
              {translations.attempts.replace('{current}', String(attemptCount))}
            </div>
          )}
        </>
      )}

      <button className="quiz-explain-btn" onClick={() => setSelectedTopic('')}>
        {translations.topics}
      </button>
    </div>
  );
}
