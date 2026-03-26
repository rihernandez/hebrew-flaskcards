export interface LanguageOption {
  name: string;
  flag: string;
  available: boolean; // false = próximamente, no seleccionable
}

export const ALL_LANGUAGES: LanguageOption[] = [
  { name: 'Español',   flag: '🇪🇸', available: true  },
  { name: 'Hebreo',    flag: '🇮🇱', available: true  },
  { name: 'Inglés',    flag: '🇺🇸', available: false },
  { name: 'Francés',   flag: '🇫🇷', available: false },
  { name: 'Italiano',  flag: '🇮🇹', available: false },
  { name: 'Portugués', flag: '🇧🇷', available: false },
];

export const AVAILABLE_LANGUAGES = ALL_LANGUAGES.filter(l => l.available).map(l => l.name);
