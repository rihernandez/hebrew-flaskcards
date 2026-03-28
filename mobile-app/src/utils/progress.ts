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
  const values = await Promise.all(
    topics.map(async (topic) => {
      const arr = await stateApi.get<string[]>('learning-state', key(language, topic), []);
      return [topic, arr.length] as const;
    })
  );
  const result: Record<string, number> = {};
  values.forEach(([topic, count]) => {
    result[topic] = count;
  });

  return result;
};

export const getSeenWordKeys = async (language: string, topics: string[]): Promise<Set<string>> => {
  const seen = new Set<string>();
  const values = await Promise.all(
    topics.map((topic) => stateApi.get<string[]>('learning-state', key(language, topic), []))
  );
  values.forEach((arr) => {
    arr.forEach(wordKey => seen.add(wordKey));
  });

  return seen;
};
