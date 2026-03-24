import AsyncStorage from '@react-native-async-storage/async-storage';
import { Word } from '../types/Word';

const KEY = 'error_history';

export const addErrors = async (words: Word[]): Promise<void> => {
  if (words.length === 0) return;
  const raw = await AsyncStorage.getItem(KEY);
  const existing: Word[] = raw ? JSON.parse(raw) : [];
  // Merge — avoid duplicates by word+language+topic
  const keys = new Set(existing.map(w => `${w.language}_${w.word}_${w.topic}`));
  const toAdd = words.filter(w => !keys.has(`${w.language}_${w.word}_${w.topic}`));
  await AsyncStorage.setItem(KEY, JSON.stringify([...existing, ...toAdd]));
};

export const getErrors = async (language?: string): Promise<Word[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const all: Word[] = JSON.parse(raw);
  return language ? all.filter(w => w.language === language) : all;
};

export const clearErrors = async (language?: string): Promise<void> => {
  if (!language) {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return;
  const all: Word[] = JSON.parse(raw);
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(w => w.language !== language)));
};

export const getErrorCount = async (language?: string): Promise<number> => {
  const errors = await getErrors(language);
  return errors.length;
};
