// ── Favoritos ──────────────────────────────────────────────
export const getFavorites = (): string[] => {
  const s = localStorage.getItem('favorites');
  return s ? JSON.parse(s) : [];
};

export const toggleFavorite = (wordId: string): boolean => {
  const favs = getFavorites();
  const idx = favs.indexOf(wordId);
  if (idx === -1) { favs.push(wordId); }
  else { favs.splice(idx, 1); }
  localStorage.setItem('favorites', JSON.stringify(favs));
  return idx === -1; // true = ahora es favorito
};

export const isFavorite = (wordId: string): boolean =>
  getFavorites().includes(wordId);

// ── Historial de errores Focus ──────────────────────────────
const ERRORS_KEY = (lang: string) => `focus_errors_${lang}`;

export const getFocusErrors = (lang: string): string[] => {
  const s = localStorage.getItem(ERRORS_KEY(lang));
  return s ? JSON.parse(s) : [];
};

export const addFocusError = (lang: string, wordId: string) => {
  const errs = getFocusErrors(lang);
  if (!errs.includes(wordId)) {
    errs.push(wordId);
    localStorage.setItem(ERRORS_KEY(lang), JSON.stringify(errs));
  }
};

export const clearFocusErrors = (lang: string) => {
  localStorage.removeItem(ERRORS_KEY(lang));
};

// ── Progreso por tema ───────────────────────────────────────
// Devuelve cuántas palabras únicas se han visto en un tema dado
export const getTopicProgress = (lang: string, topicWordIds: string[]): number => {
  const seen = new Set<string>();
  for (const mode of ['blitz', 'bullet', 'focus'] as const) {
    const key = `shown_${mode}_${lang}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      (JSON.parse(stored) as string[]).forEach(id => seen.add(id));
    }
  }
  return topicWordIds.filter(id => seen.has(id)).length;
};

// ── Racha diaria ────────────────────────────────────────────
interface StreakData {
  currentStreak: number;
  lastOpenDate: string; // YYYY-MM-DD
  longestStreak: number;
}

const STREAK_KEY = 'streak_data';
const today = () => new Date().toISOString().split('T')[0];
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const updateStreak = (): StreakData => {
  const t = today();
  const raw = localStorage.getItem(STREAK_KEY);
  if (!raw) {
    const data: StreakData = { currentStreak: 1, lastOpenDate: t, longestStreak: 1 };
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    return data;
  }
  const data: StreakData = JSON.parse(raw);
  if (data.lastOpenDate === t) return data;
  const diff = daysBetween(data.lastOpenDate, t);
  const newStreak = diff === 1 ? data.currentStreak + 1 : 1;
  const updated: StreakData = {
    currentStreak: newStreak,
    lastOpenDate: t,
    longestStreak: Math.max(newStreak, data.longestStreak),
  };
  localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  return updated;
};

export const getStreak = (): StreakData => {
  const raw = localStorage.getItem(STREAK_KEY);
  return raw ? JSON.parse(raw) : { currentStreak: 0, lastOpenDate: '', longestStreak: 0 };
};
