import { useState, useEffect, useRef } from 'react';
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

interface WriteModeProps {
  words: Word[];
  translations: any;
  onFinish: (correct: number, incorrect: number) => void;
}

// Normaliza texto: minúsculas, sin tildes, sin puntuación extra
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos
    .replace(/[^a-z\s]/g, '')
    .trim();
}

export default function WriteMode({ words, translations, onFinish }: WriteModeProps) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = words[index];

  useEffect(() => {
    setInput('');
    setStatus('idle');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [index]);

  const check = () => {
    if (!input.trim()) return;
    const userAnswer = normalize(input);
    const expected = normalize(current.word);
    if (userAnswer === expected) {
      setStatus('correct');
      setCorrectCount(c => c + 1);
    } else {
      setStatus('wrong');
      setIncorrectCount(c => c + 1);
      addFocusError(current.language, current.id);
    }
  };

  const next = () => {
    if (index < words.length - 1) {
      setIndex(i => i + 1);
    } else {
      onFinish(
        status === 'correct' ? correctCount : correctCount,
        status === 'wrong' || status === 'revealed' ? incorrectCount : incorrectCount
      );
    }
  };

  const reveal = () => {
    setStatus('revealed');
    setIncorrectCount(c => c + 1);
    addFocusError(current.language, current.id);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (status === 'idle') check();
      else next();
    }
  };

  const isLast = index === words.length - 1;

  return (
    <div className="write-mode-card">
      <div className="write-mode-counter">
        {index + 1} / {words.length}
      </div>

      {/* Significado en hebreo — lo que el usuario ve */}
      <div className="write-mode-meaning">{current.meaning}</div>

      {current.pronunciation && (
        <div className="write-mode-hint">({current.pronunciation})</div>
      )}

      {/* Input */}
      {status === 'idle' && (
        <input
          ref={inputRef}
          className="write-mode-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={translations.writePlaceholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          dir="ltr"
        />
      )}

      {/* Resultado */}
      {status === 'correct' && (
        <div className="write-mode-result correct">
          ✓ {current.word}
        </div>
      )}
      {(status === 'wrong' || status === 'revealed') && (
        <div className="write-mode-result wrong">
          <span className="write-user-answer">✗ {input || '—'}</span>
          <span className="write-correct-answer">→ {current.word}</span>
        </div>
      )}

      {/* Ejemplos al revelar */}
      {(status === 'correct' || status === 'wrong' || status === 'revealed') && current.examples?.length > 0 && (
        <ul className="write-mode-examples">
          {current.examples.slice(0, 2).map((ex, i) => (
            <li key={i}>{ex}</li>
          ))}
        </ul>
      )}

      {/* Botones */}
      <div className="write-mode-actions">
        {status === 'idle' ? (
          <>
            <button className="write-check-btn" onClick={check} disabled={!input.trim()}>
              {translations.writeCheck}
            </button>
            <button className="write-reveal-btn" onClick={reveal}>
              {translations.writeReveal}
            </button>
          </>
        ) : (
          <button className="write-next-btn" onClick={next}>
            {isLast ? translations.writeFinish : translations.writeNext}
          </button>
        )}
      </div>
    </div>
  );
}
