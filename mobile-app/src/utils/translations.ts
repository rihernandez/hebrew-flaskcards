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
  },
};

export const getUILanguage = (learningLanguage: string): Language => {
  return learningLanguage === 'Hebreo' ? 'es' : 'en';
};

export const isRTL = (language: string): boolean => {
  return language === 'Hebreo';
};
