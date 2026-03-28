import { useState, useEffect, useMemo, useRef } from 'react';
import { addFocusError } from '../utils/storage';

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

interface QuizModeProps {
  words: Word[];
  allWords: Word[];   // para generar distractores
  translations: any;
  onFinish: (correct: number, incorrect: number) => void;
  mixedMode?: boolean;
  onItemResult?: (word: Word, isCorrect: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getOptions(current: Word, pool: Word[]): Word[] {
  const distractors = shuffle(pool.filter(w => w.id !== current.id)).slice(0, 3);
  return shuffle([current, ...distractors]);
}

const normalize = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function QuizMode({ words, allWords, translations, onFinish, mixedMode = false, onItemResult }: QuizModeProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [writeAnswer, setWriteAnswer] = useState('');
  const [writeCorrect, setWriteCorrect] = useState<boolean | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [voiceAnswer, setVoiceAnswer] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceCorrect, setVoiceCorrect] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const recognitionRef = useRef<any>(null);

  const current = words[index];
  const isWriteQuestion = mixedMode && index % 3 === 2;
  const speechApiSupported = typeof window !== 'undefined' && (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window));
  const isVoiceQuestion = !isWriteQuestion && current.language === 'Español' && (index % 4 === 1);
  const voicePromptMode = index % 2 === 0 ? 'repeat' : 'translate';

  // Pool de distractores: mismo idioma, excluir la actual
  const pool = useMemo(
    () => allWords.filter(w => w.language === current.language && w.id !== current.id),
    [allWords, current]
  );

  const options = useMemo(() => getOptions(current, pool), [current, pool]);

  // Reset al cambiar de palabra
  useEffect(() => {
    setSelected(null);
    setWriteAnswer('');
    setWriteCorrect(null);
    setShowExplain(false);
    setVoiceAnswer('');
    setVoiceTranscript('');
    setVoiceCorrect(null);
    setListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, [index]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  const markResult = (isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectCount(c => c + 1);
      onItemResult?.(current, true);
      return;
    }
    setIncorrectCount(c => c + 1);
    addFocusError(current.language, current.id);
    onItemResult?.(current, false);
  };

  const handleSelect = (word: Word) => {
    if (selected !== null) return;
    setSelected(word.id);
    markResult(word.id === current.id);
  };

  const checkWrite = () => {
    if (writeCorrect !== null) return;
    const expected = normalize(current.word);
    const received = normalize(writeAnswer);
    const ok = received.length > 0 && received === expected;
    setWriteCorrect(ok);
    markResult(ok);
  };

  const evaluateVoice = (value: string) => {
    if (voiceCorrect !== null) return;
    const expected = normalize(current.word);
    const received = normalize(value);
    const ok =
      received.length > 0
      && (
        received === expected
        || received.includes(expected)
        || (received.length >= 3 && expected.includes(received))
      );
    setVoiceCorrect(ok);
    markResult(ok);
  };

  const checkVoiceTyped = () => evaluateVoice(voiceAnswer);

  const startVoiceCapture = () => {
    if (!speechApiSupported || listening || voiceCorrect !== null) return;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const spoken = event?.results?.[0]?.[0]?.transcript ?? '';
      setVoiceTranscript(spoken);
      evaluateVoice(spoken);
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    setListening(true);
    recognition.start();
  };

  const next = () => {
    if (index < words.length - 1) {
      setIndex(i => i + 1);
    } else {
      onFinish(correctCount, incorrectCount);
    }
  };

  const isLast = index === words.length - 1;
  const answered = isVoiceQuestion
    ? voiceCorrect !== null
    : isWriteQuestion
      ? writeCorrect !== null
      : selected !== null;
  const isCorrectAnswer = isVoiceQuestion
    ? voiceCorrect === true
    : isWriteQuestion
      ? writeCorrect === true
      : selected === current.id;

  return (
    <div className="quiz-card">
      <div className="quiz-counter">{index + 1} / {words.length}</div>

      {!isWriteQuestion && !isVoiceQuestion ? (
        <>
          {/* Palabra a adivinar */}
          <div className="quiz-word">{current.word}</div>
          {current.pronunciation && (
            <div className="quiz-pronunciation">({current.pronunciation})</div>
          )}

          {/* Opciones */}
          <div className="quiz-options">
            {options.map(opt => {
              let cls = 'quiz-option';
              if (answered) {
                if (opt.id === current.id) cls += ' correct';
                else if (opt.id === selected) cls += ' wrong';
              }
              return (
                <button
                  key={opt.id}
                  className={cls}
                  onClick={() => handleSelect(opt)}
                  disabled={answered}
                >
                  {opt.meaning}
                </button>
              );
            })}
          </div>
        </>
      ) : isWriteQuestion ? (
        <>
          <div className="quiz-word">{current.meaning}</div>
          <div className="quiz-pronunciation">{translations.writePlaceholder ?? 'Escribe la palabra...'}</div>
          <div className="write-mode-content">
            <input
              type="text"
              className={`write-mode-input ${
                writeCorrect === true ? 'correct' : writeCorrect === false ? 'wrong' : ''
              }`}
              value={writeAnswer}
              onChange={(e) => setWriteAnswer(e.target.value)}
              placeholder={translations.writePlaceholder ?? 'Escribe la palabra...'}
              disabled={writeCorrect !== null}
            />
            <button className="write-check-btn" onClick={checkWrite} disabled={writeCorrect !== null || writeAnswer.trim().length === 0}>
              {translations.writeCheck ?? 'Verificar'}
            </button>
          </div>
          {writeCorrect === false && (
            <div className="write-feedback">
              ✓ {current.word}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="quiz-word">
            {voicePromptMode === 'repeat' ? current.word : current.meaning}
          </div>
          <div className="quiz-pronunciation">
            {voicePromptMode === 'repeat'
              ? 'Repite esta palabra en español'
              : 'Di en español esta palabra'}
          </div>
          <div className="write-mode-content">
            <button className="write-check-btn" onClick={startVoiceCapture} disabled={!speechApiSupported || listening || voiceCorrect !== null}>
              {listening ? 'Escuchando…' : '🎤 Hablar'}
            </button>
          </div>
          {!speechApiSupported && (
            <div className="write-feedback">Tu dispositivo no soporta reconocimiento de voz.</div>
          )}
          {voiceTranscript && (
            <div className="write-feedback">Dijiste: {voiceTranscript}</div>
          )}
          <div className="write-mode-content">
            <input
              type="text"
              className={`write-mode-input ${
                voiceCorrect === true ? 'correct' : voiceCorrect === false ? 'wrong' : ''
              }`}
              value={voiceAnswer}
              onChange={(e) => setVoiceAnswer(e.target.value)}
              placeholder="Escribe tu respuesta si prefieres"
              disabled={voiceCorrect !== null}
            />
            <button className="write-check-btn" onClick={checkVoiceTyped} disabled={voiceCorrect !== null || voiceAnswer.trim().length === 0}>
              Verificar
            </button>
          </div>
          {voiceCorrect === false && (
            <div className="quiz-voice-answer">✓ {current.word}</div>
          )}
        </>
      )}

      {answered && !isCorrectAnswer && (
        <>
          <button className="quiz-explain-btn" onClick={() => setShowExplain((v) => !v)}>
            {showExplain ? 'Ocultar explicación' : '¿Por qué era esta?'}
          </button>
          {showExplain && (
            <div className="quiz-explain-box">
              <div><strong>Correcta:</strong> {current.word}</div>
              <div><strong>Significado:</strong> {current.meaning}</div>
              {current.pronunciation && <div><strong>Pronunciación:</strong> {current.pronunciation}</div>}
              {current.examples[0] && <div><strong>Ejemplo:</strong> {current.examples[0]}</div>}
            </div>
          )}
        </>
      )}

      {/* Siguiente */}
      {answered && (
        <button className="write-next-btn" onClick={next}>
          {isLast ? translations.writeFinish : translations.writeNext}
        </button>
      )}
    </div>
  );
}
