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
  const [showVoiceHelpModal, setShowVoiceHelpModal] = useState(false);

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
    setShowVoiceHelpModal(false);

    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        await invoke('speak_spanish_tts', { text: word });
        return;
      } catch (err) {
        const errorText = String(err ?? '');
        if (errorText.includes('NO_SPANISH_VOICE')) {
          setShowVoiceHelpModal(true);
          return;
        }
        // Fallback to Web Speech if native TTS is unavailable in the host.
      }
    }

    speakWithWebSpeech();
  };

  const showBack = isFlipped || manualFlip;
  const uiLang = (typeof document !== 'undefined' ? document.documentElement.lang : 'es') || 'es';
  const isHebrewUI = uiLang.startsWith('he');
  const isEnglishUI = uiLang.startsWith('en');

  const voiceHelp = isHebrewUI
    ? {
        title: 'כדי להשתמש בפונקציה הזאת יש להתקין חבילת קול בספרדית ב-Windows',
        intro: 'זיהיתי שבמערכת שלך לא מותקנת כרגע חבילת קול מתאימה לספרדית.',
        packages: 'חבילות מומלצות: es-ES (ספרד), es-MX (מקסיקו), es-US (ארה"ב)',
        note: 'אחרי התקנת חבילת הקול, יש לבצע הפעלה מחדש למחשב. לאחר מכן, אם מזוהה קול בספרדית, ההודעה הזו לא תופיע שוב.',
        stepsTitle: 'ב-Windows 10/11 בצע כך:',
        steps: [
          'פתח Settings (הגדרות).',
          'עבור אל Time & language (שעה ושפה) → Language & region (שפה ואזור).',
          'בחר Add a language (הוספת שפה) וחפש Spanish (ספרד, מקסיקו או ארה"ב).',
          'היכנס לשפה שהוספת → Language options (אפשרויות שפה).',
          'ב-Speech/Text-to-speech התקן את חבילת הקול.',
          'הפעל מחדש את האפליקציה (לפעמים גם יציאה וכניסה למשתמש עוזרות).',
        ],
        close: 'סגור',
      }
    : isEnglishUI
    ? {
        title: 'To use this feature, install a Spanish speech voice package in Windows',
        intro: 'I detected that your system does not currently have a supported Spanish voice package installed.',
        packages: 'Recommended packages: es-ES (Spain), es-MX (Mexico), es-US (United States)',
        note: 'After installing the voice package, you must restart the PC. Once a Spanish voice is detected, this modal will no longer appear.',
        stepsTitle: 'In Windows 10/11, do this:',
        steps: [
          'Open Settings.',
          'Go to Time & language → Language & region.',
          'Click Add a language and search for Spanish (Spain, Mexico, or United States).',
          'Open the added language → Language options.',
          'Under Speech/Text-to-speech, install the voice package.',
          'Restart the app (sometimes signing out and back in also helps).',
        ],
        close: 'Close',
      }
    : {
        title: 'Para usar esta funcionalidad necesitas instalar un paquete de voz en español en Windows',
        intro: 'He detectado que en tu sistema no está instalado un paquete de voz compatible en español.',
        packages: 'Paquetes recomendados: es-ES (España), es-MX (México), es-US (Estados Unidos)',
        note: 'Después de instalar el paquete de voz, debes reiniciar la PC. Cuando la app detecte una voz en español, este modal dejará de aparecer.',
        stepsTitle: 'En Windows 10/11 el usuario lo hace así:',
        steps: [
          'Abrir Settings (Configuración).',
          'Ir a Time & language (Hora e idioma) → Language & region (Idioma y región).',
          'Add a language (Agregar un idioma) y buscar Spanish (España, México o EE. UU.).',
          'Entrar al idioma agregado → Language options (Opciones de idioma).',
          'En Speech/Text-to-speech, instalar el paquete de voz.',
          'Reiniciar la app (a veces reiniciar sesión ayuda).',
        ],
        close: 'Cerrar',
      };

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

      {showVoiceHelpModal && (
        <div className="voice-help-modal-overlay">
          <div
            className="voice-help-modal"
            onClick={(event) => event.stopPropagation()}
            dir={isHebrewUI ? 'rtl' : 'ltr'}
          >
            <h2>{voiceHelp.title}</h2>
            <p>{voiceHelp.intro}</p>
            <p className="voice-help-packages"><strong>{voiceHelp.packages}</strong></p>
            <p>{voiceHelp.note}</p>
            <h3>{voiceHelp.stepsTitle}</h3>
            <ol>
              {voiceHelp.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            <button className="voice-help-close-btn" onClick={() => setShowVoiceHelpModal(false)}>
              {voiceHelp.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
