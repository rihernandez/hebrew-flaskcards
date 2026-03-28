import { useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  enableSpanishAudio?: boolean;
}

export default function Flashcard({ id, word, pronunciation, meaning, examples, isFlipped, onFlipComplete, examplesLabel, learningRTL, genre, overlayButtons, lockFlip, enableSpanishAudio = false }: FlashcardProps) {
  const [manualFlip, setManualFlip] = useState(false);
  const [toast, setToast] = useState(false);
  const [fav, setFav] = useState(false);

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
    const text = `${word} — ${meaning}\n(${pronunciation})\n${examples.join(' | ')}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback para contextos sin clipboard API
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const speakWithWebSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeakSpanish = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        await invoke('speak_spanish_tts', { text: word });
        return;
      } catch {
        // Fallback to Web Speech if native TTS is unavailable in the host.
      }
    }

    speakWithWebSpeech();
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
        className={`flashcard ${showBack ? 'flipped' : ''} ${learningRTL ? 'learning-rtl' : 'learning-ltr'}`}
        onClick={handleClick}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <h1>
              {word}
              {genre && <span className="genre"> ({genre})</span>}
            </h1>
            {enableSpanishAudio && (
              <button className="flashcard-audio-btn" onClick={handleSpeakSpanish} title="Escuchar pronunciación en español">
                🔊
              </button>
            )}
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
