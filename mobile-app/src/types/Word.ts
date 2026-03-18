export interface Word {
  word: string;
  pronunciation: string;
  meaning: string;
  genre?: string;
  examples: string[];
  language: string;
  topic: string;
}

export type Language = 'es' | 'en';

export interface Translations {
  title: string;
  selectLanguage: string;
  showMenu: string;
  hideMenu: string;
  previous: string;
  next: string;
  examples: string;
  blitzMode: string;
  bulletMode: string;
  focusMode: string;
  pause: string;
  stop: string;
  correct: string;
  incorrect: string;
  completed: string;
  reviewedWords: string;
  restart: string;
  noWords: string;
  focusSummary: string;
  correctWords: string;
  incorrectWords: string;
  totalWords: string;
}
