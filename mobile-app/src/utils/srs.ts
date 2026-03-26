/**
 * Spaced Repetition System (SRS) — simplified SM-2 algorithm
 * Each word has an interval (days), ease factor, and next review date.
 */
import { stateApi } from './stateApi';

const KEY = 'srs_data';

export interface SRSCard {
  wordKey: string;
  interval: number;
  easeFactor: number;
  nextReview: string;
  repetitions: number;
  mastery: number;
}

const today = () => new Date().toISOString().slice(0, 10);

const loadAll = async (): Promise<Record<string, SRSCard>> => {
  return stateApi.get<Record<string, SRSCard>>('progression-state', KEY, {});
};

const saveAll = async (data: Record<string, SRSCard>): Promise<void> => {
  await stateApi.set('progression-state', KEY, data);
};

export const reviewCard = async (wordKey: string, quality: 0 | 1 | 2 | 3 | 4 | 5): Promise<SRSCard> => {
  const all = await loadAll();
  const card: SRSCard = all[wordKey] ?? {
    wordKey, interval: 1, easeFactor: 2.5, nextReview: today(), repetitions: 0, mastery: 0,
  };

  let { interval, easeFactor, repetitions } = card;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const mastery = Math.min(5, Math.floor(repetitions / 2));

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  const updated: SRSCard = {
    wordKey, interval, easeFactor, repetitions, mastery,
    nextReview: nextDate.toISOString().slice(0, 10),
  };

  all[wordKey] = updated;
  await saveAll(all);
  return updated;
};

export const getCard = async (wordKey: string): Promise<SRSCard | null> => {
  const all = await loadAll();
  return all[wordKey] ?? null;
};

export const getMastery = async (wordKey: string): Promise<number> => {
  const card = await getCard(wordKey);
  return card?.mastery ?? 0;
};

export const getDueCards = async (language: string): Promise<string[]> => {
  const all = await loadAll();
  const t = today();
  return Object.values(all)
    .filter(c => c.wordKey.startsWith(`${language}_`) && c.nextReview <= t)
    .map(c => c.wordKey);
};

export const getSRSStats = async (language: string): Promise<{ total: number; avgMastery: number; due: number }> => {
  const all = await loadAll();
  const cards = Object.values(all).filter(c => c.wordKey.startsWith(`${language}_`));
  const t = today();
  const total = cards.length;
  const avgMastery = total > 0 ? cards.reduce((s, c) => s + c.mastery, 0) / total : 0;
  const due = cards.filter(c => c.nextReview <= t).length;
  return { total, avgMastery, due };
};

export const getSRSData = async (): Promise<Record<string, SRSCard>> => {
  return loadAll();
};

export const clearSRS = async (): Promise<void> => {
  await stateApi.remove('progression-state', KEY);
};
