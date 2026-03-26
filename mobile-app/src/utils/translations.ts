import { Translations, Language } from '../types/Word';

export const translations: Record<Language, Translations> = {
  es: {
    title: 'Flashcards Hebreo',
    selectLanguage: 'Selecciona un idioma',
    showMenu: 'Mostrar menú',
    hideMenu: 'Ocultar menú',
    previous: 'Anterior',
    next: 'Siguiente',
    examples: 'Ejemplos',
    blitzMode: 'Modo Blitz',
    bulletMode: 'Modo Bullet',
    focusMode: 'Modo Focus',
    pause: 'Pausar',
    stop: 'Detener',
    correct: 'Correcto',
    incorrect: 'Incorrecto',
    completed: '¡Completado!',
    reviewedWords: 'Has revisado {count} palabras',
    restart: 'Reiniciar',
    noWords: 'No hay palabras disponibles',
    focusSummary: 'Resumen del Modo Focus',
    correctWords: 'Palabras correctas: {count}',
    incorrectWords: 'Palabras incorrectas: {count}',
    totalWords: 'Total: {count}',
    practice: 'PRÁCTICA',
    writing: 'Escritura',
    quiz: 'Quiz',
    backOnly: 'Solo reverso',
    favorites: 'Favoritos',
    reviewErrors: 'Repasar errores',
    searchPlaceholder: '🔍 Buscar por significado...',
  },
  he: {
    title: 'כרטיסיות ספרדית',
    selectLanguage: 'בחר שפה',
    showMenu: 'הצג תפריט',
    hideMenu: 'הסתר תפריט',
    previous: 'הקודם',
    next: 'הבא',
    examples: 'דוגמאות',
    blitzMode: 'מצב בליץ',
    bulletMode: 'מצב בולט',
    focusMode: 'מצב פוקוס',
    pause: 'השהה',
    stop: 'עצור',
    correct: 'נכון',
    incorrect: 'לא נכון',
    completed: 'הושלם!',
    reviewedWords: 'סקרת {count} מילים',
    restart: 'התחל מחדש',
    noWords: 'אין מילים זמינות',
    focusSummary: 'סיכום מצב פוקוס',
    correctWords: 'מילים נכונות: {count}',
    incorrectWords: 'מילים שגויות: {count}',
    totalWords: 'סה"כ: {count}',
    practice: 'תרגול',
    writing: 'כתיבה',
    quiz: 'חידון',
    backOnly: 'צד אחורי בלבד',
    favorites: 'מועדפים',
    reviewErrors: 'סקור שגיאות',
    searchPlaceholder: '🔍 חפש לפי משמעות...',
  },
  en: {
    title: 'Hebrew Flashcards',
    selectLanguage: 'Select a language',
    showMenu: 'Show menu',
    hideMenu: 'Hide menu',
    previous: 'Previous',
    next: 'Next',
    examples: 'Examples',
    blitzMode: 'Blitz Mode',
    bulletMode: 'Bullet Mode',
    focusMode: 'Focus Mode',
    pause: 'Pause',
    stop: 'Stop',
    correct: 'Correct',
    incorrect: 'Incorrect',
    completed: 'Completed!',
    reviewedWords: 'You reviewed {count} words',
    restart: 'Restart',
    noWords: 'No words available',
    focusSummary: 'Focus Mode Summary',
    correctWords: 'Correct words: {count}',
    incorrectWords: 'Incorrect words: {count}',
    totalWords: 'Total: {count}',
    practice: 'PRACTICE',
    writing: 'Writing',
    quiz: 'Quiz',
    backOnly: 'Back side only',
    favorites: 'Favorites',
    reviewErrors: 'Review errors',
    searchPlaceholder: '🔍 Search by meaning...',
  },
};

// Topic name translations to Hebrew (for when user is learning Spanish)
export const topicTranslations: Record<string, string> = {
  'Alfabeto': 'אלפבית',
  'Números': 'מספרים',
  'Cardinales': 'מספרים סודרים',
  'Preposiciones y artículos': 'מילות יחס וסתמים',
  'Pronombres': 'כינויי גוף',
  'Adverbios': 'תארי פועל',
  'Locuciones adverbiales': 'ביטויי תואר',
  'Adjetivos': 'שמות תואר',
  'Sustantivos': 'שמות עצם',
  'Verbos': 'פעלים',
  'Raíz': 'שורש',
  'Vocabulario': 'אוצר מילים',
  'Slang': 'סלנג',
  'Frases útiles': 'ביטויים שימושיים',
  'Expresiones Idiomáticas (Nivim)': 'ביטויים אידיומטיים',
  'Gramática': 'דקדוק',
};

export const getUILanguage = (learningLanguage: string): Language => {
  // The UI language is the opposite of what the user is learning
  // Learning Hebrew → UI in Spanish (native speaker is Spanish)
  // Learning Spanish → UI in Hebrew (native speaker is Hebrew)
  if (learningLanguage === 'Hebreo') return 'es';
  if (learningLanguage === 'Español') return 'he';
  return 'es';
};

// Derive UI language from the user's NATIVE language (what they speak)
export const getUILanguageFromNative = (nativeLanguage: string): Language => {
  if (nativeLanguage === 'Hebreo') return 'he';
  if (nativeLanguage === 'Español') return 'es';
  if (nativeLanguage === 'Inglés') return 'en';
  return 'he'; // default: Hebrew (app is for Israelis)
};

export const isRTL = (language: string): boolean => {
  return language === 'Hebreo';
};
