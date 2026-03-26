import { stateApi } from './stateApi';

const key = (language: string, topic: string) => `seen_${language}_${topic}`;

export const getSeenCount = async (language: string, topic: string): Promise<number> => {
  const seen = await stateApi.get<string[]>('learning-state', key(language, topic), []);
  return seen.length;
};

export const markWordSeen = async (language: string, topic: string, wordKey: string) => {
  const k = key(language, topic);
  const seen = await stateApi.get<string[]>('learning-state', k, []);
  if (!seen.includes(wordKey)) {
    seen.push(wordKey);
    await stateApi.set('learning-state', k, seen);
  }
};

export const getAllSeenCounts = async (language: string, topics: string[]): Promise<Record<string, number>> => {
  const keys = topics.map(t => key(language, t));
  const fallback = Object.fromEntries(keys.map(k => [k, [] as string[]])) as Record<string, string[]>;
  const values = await stateApi.bulkGet<Record<string, string[]>>('learning-state', keys, fallback);

  const result: Record<string, number> = {};
  topics.forEach((topic) => {
    const arr = values[key(language, topic)] ?? [];
    result[topic] = arr.length;
  });

  return result;
};
