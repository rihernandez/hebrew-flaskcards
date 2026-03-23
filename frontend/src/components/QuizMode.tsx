import { useState, useEffect, useMemo } from 'react';

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
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getOptions(current: Word, pool: Word[]): Word[] {
  const distractors = shuffle(pool.filter(w => w.id !== current.id)).slice(0, 3);
  return shuffle([current, ...distractors]);
}

export default function QuizMode({ words, allWords, translations, onFinish }: QuizModeProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const current = words[index];

  // Pool de distractores: mismo idioma, excluir la actual
  const pool = useMemo(
    () => allWords.filter(w => w.language === current.language && w.id !== current.id),
    [allWords, current]
  );

  const options = useMemo(() => getOptions(current, pool), [current, pool]);

  // Reset al cambiar de palabra
  useEffect(() => { setSelected(null); }, [index]);

  const handleSelect = (word: Word) => {
    if (selected !== null) return;
    setSelected(word.id);
    if (word.id === current.id) setCorrectCount(c => c + 1);
    else setIncorrectCount(c => c + 1);
  };

  const next = () => {
    if (index < words.length - 1) {
      setIndex(i => i + 1);
    } else {
      onFinish(correctCount, incorrectCount);
    }
  };

  const isLast = index === words.length - 1;
  const answered = selected !== null;

  return (
    <div className="quiz-card">
      <div className="quiz-counter">{index + 1} / {words.length}</div>

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

      {/* Siguiente */}
      {answered && (
        <button className="write-next-btn" onClick={next}>
          {isLast ? translations.writeFinish : translations.writeNext}
        </button>
      )}
    </div>
  );
}
