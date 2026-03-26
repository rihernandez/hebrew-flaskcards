/**
 * activityUtils.ts
 * Pure logic helpers for speaking activities — no side effects, fully testable.
 */

/** Strip accents, lowercase, remove punctuation */
export const normalizeText = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

/** True if both strings are equal after normalization */
export const normalizeAndCompare = (a: string, b: string): boolean =>
  normalizeText(a) === normalizeText(b);

/**
 * Ratio of keywords found (case-insensitive) in transcript.
 * Returns value in [0, 1].
 */
export const keywordScore = (transcript: string, keywords: string[]): number => {
  if (keywords.length === 0) return 1;
  const lower = transcript.toLowerCase();
  const matched = keywords.filter(k => lower.includes(k.toLowerCase()));
  return matched.length / keywords.length;
};

/** WPM = floor((wordCount / elapsedSeconds) * 60) */
export const calculateWPM = (wordCount: number, elapsedSeconds: number): number => {
  if (elapsedSeconds <= 0) return 0;
  return Math.floor((wordCount / elapsedSeconds) * 60);
};

export type WPMLabel = 'Lento' | 'Fluido' | 'Rápido';

export const wpmLabel = (wpm: number): WPMLabel => {
  if (wpm < 80) return 'Lento';
  if (wpm <= 130) return 'Fluido';
  return 'Rápido';
};

/**
 * Returns words from paragraph that do NOT appear in transcript (case-insensitive).
 */
export const detectMissingWords = (paragraph: string, transcript: string): string[] => {
  const transcriptLower = transcript.toLowerCase();
  const words = paragraph.split(/\s+/).filter(Boolean);
  return words.filter(w => {
    const clean = normalizeText(w);
    return clean.length > 0 && !transcriptLower.includes(clean);
  });
};

/** True only if input has at least one non-whitespace character */
export const isSubmitEnabled = (input: string): boolean => input.trim().length > 0;

/** Accuracy percentage for dictado: round(correct / total * 100) */
export const calculateAccuracy = (outcomes: boolean[]): number => {
  if (outcomes.length === 0) return 0;
  const correct = outcomes.filter(Boolean).length;
  return Math.round((correct / outcomes.length) * 100);
};

export type TranslationOutcome = 'passing' | 'failing' | 'skipped';

export interface TranslationSummary {
  passing: number;
  failing: number;
  skipped: number;
  total: number;
}

export const summarizeTranslation = (outcomes: TranslationOutcome[]): TranslationSummary => {
  const passing = outcomes.filter(o => o === 'passing').length;
  const failing = outcomes.filter(o => o === 'failing').length;
  const skipped = outcomes.filter(o => o === 'skipped').length;
  return { passing, failing, skipped, total: outcomes.length };
};
