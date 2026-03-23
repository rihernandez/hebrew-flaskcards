interface Word {
  word: string;
  pronunciation: string;
  meaning: string;
  examples: string[];
  language: string;
  topic: string;
  genre?: string;
}

interface WordModalProps {
  word: Word;
  onClose: () => void;
}

export default function WordModal({ word, onClose }: WordModalProps) {
  const isRTL = word.language === 'Hebreo';

  return (
    <div className="word-modal-overlay" onClick={onClose}>
      <div className="word-modal" onClick={e => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
        <button className="word-modal-close" onClick={onClose}>✕</button>

        <div className="word-modal-word">{word.word}</div>

        {word.pronunciation && (
          <div className="word-modal-pronunciation">[{word.pronunciation}]</div>
        )}

        {word.genre && (
          <div className="word-modal-genre">{word.genre}</div>
        )}

        <div className="word-modal-meaning">{word.meaning}</div>

        <div className="word-modal-meta">
          <span>{word.language}</span>
          <span>·</span>
          <span>{word.topic}</span>
        </div>

        {word.examples.length > 0 && (
          <ul className="word-modal-examples">
            {word.examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
