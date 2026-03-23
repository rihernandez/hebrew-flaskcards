import { useState, useEffect, useRef, ReactNode } from 'react';
import html2canvas from 'html2canvas';
import { isFavorite, toggleFavorite } from '../utils/storage';

interface FlashcardProps {
  id: string;
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

export default function Flashcard({ id, word, pronunciation, meaning, examples, isFlipped, onFlipComplete, examplesLabel, learningRTL, genre, overlayButtons, lockFlip }: FlashcardProps) {
  const [manualFlip, setManualFlip] = useState(false);
  const [toast, setToast] = useState(false);
  const [fav, setFav] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync fav state whenever the card changes
  useEffect(() => { setFav(isFavorite(id)); }, [id]);
  // Reset manual flip when card changes
  useEffect(() => { setManualFlip(false); }, [id]);

  const handleClick = () => {
    if (lockFlip || overlayButtons) return;
    if (!isFlipped) setManualFlip(f => !f);
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFav(toggleFavorite(id));
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setToast(true);
        setTimeout(() => setToast(false), 2500);
      }, 'image/png');
    } catch {
      const text = `${word} — ${meaning}\n(${pronunciation})\n${examples.join(' | ')}`;
      await navigator.clipboard.writeText(text);
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    }
  };

  const showBack = isFlipped || manualFlip;

  return (
    <div style={{ position: 'relative' }}>
      {toast && <div className="share-toast">📋 Copiado al portapapeles</div>}

      {/* Fav button — always visible */}
      <button
        className={`fav-btn ${fav ? 'active' : ''}`}
        onClick={handleFav}
        title={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        {fav ? '⭐' : '☆'}
      </button>

      <div
        ref={cardRef}
        className={`flashcard ${showBack ? 'flipped' : ''} ${learningRTL ? 'learning-rtl' : 'learning-ltr'}`}
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
            {overlayButtons && showBack && (
              <div className="flashcard-overlay-buttons">
                {overlayButtons}
              </div>
            )}
          </div>
        </div>
      </div>

      {showBack && !overlayButtons && (
        <button className="share-btn" onClick={handleShare} title="Copiar al portapapeles">
          📋
        </button>
      )}
    </div>
  );
}
