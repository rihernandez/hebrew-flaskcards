import { useState, ReactNode } from 'react';

interface FlashcardProps {
  word: string;
  pronunciation: string;
  meaning: string;
  examples: string[];
  isFlipped: boolean;
  onFlipComplete?: () => void;
  examplesLabel: string;
  learningRTL: boolean;
  genre?: string;
  overlayButtons?: ReactNode;
  lockFlip?: boolean;
}

export default function Flashcard({ word, pronunciation, meaning, examples, isFlipped, onFlipComplete, examplesLabel, learningRTL, genre, overlayButtons, lockFlip }: FlashcardProps) {
  const [manualFlip, setManualFlip] = useState(false);

  const handleClick = () => {
    // No permitir flip manual si está bloqueado (back-only mode) o si hay overlay buttons
    if (lockFlip || overlayButtons) return;
    if (!isFlipped) {
      setManualFlip(!manualFlip);
    }
  };

  return (
    <div 
      className={`flashcard ${isFlipped || manualFlip ? 'flipped' : ''} ${learningRTL ? 'learning-rtl' : 'learning-ltr'}`} 
      onClick={handleClick}
    >
      <div className="flashcard-inner">
        <div className="flashcard-front">
          <h1>
            {word}
            {genre && <span className="genre"> ({genre})</span>}
          </h1>
        </div>
        <div className="flashcard-back">
          <p className="pronunciation-back">({pronunciation})</p>
          {genre && <p className="genre-back">({genre})</p>}
          <p className="meaning">{meaning}</p>
          <ul>
            {examples.map((example, index) => (
              <li key={index}>{example}</li>
            ))}
          </ul>
          {overlayButtons && (isFlipped || manualFlip) && (
            <div className="flashcard-overlay-buttons">
              {overlayButtons}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
