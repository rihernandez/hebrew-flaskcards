import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (language: string, topic: string) => `seen_${language}_${topic}`;

export const getSeenCount = async (language: string, topic: string): Promise<number> => {
  const val = await AsyncStorage.getItem(key(language, topic));
  if (!val) return 0;
  return JSON.parse(val).length;
};

export const markWordSeen = async (language: string, topic: string, wordKey: string) => {
  const k = key(language, topic);
  const val = await AsyncStorage.getItem(k);
  const seen: string[] = val ? JSON.parse(val) : [];
  if (!seen.includes(wordKey)) {
    seen.push(wordKey);
    await AsyncStorage.setItem(k, JSON.stringify(seen));
  }
};

// Load all seen counts for multiple topics at once
export const getAllSeenCounts = async (language: string, topics: string[]): Promise<Record<string, number>> => {
  const keys = topics.map(t => key(language, t));
  const pairs = await AsyncStorage.multiGet(keys);
  const result: Record<string, number> = {};
  pairs.forEach(([, val], i) => {
    result[topics[i]] = val ? JSON.parse(val).length : 0;
  });
  return result;
};
