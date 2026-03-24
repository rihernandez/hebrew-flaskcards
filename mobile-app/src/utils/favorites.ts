import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'favorites';

const wordKey = (language: string, word: string, topic: string) =>
  `${language}_${word}_${topic}`;

export const getFavorites = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
};

export const isFavorite = async (language: string, word: string, topic: string): Promise<boolean> => {
  const favs = await getFavorites();
  return favs.includes(wordKey(language, word, topic));
};

export const toggleFavorite = async (language: string, word: string, topic: string): Promise<boolean> => {
  const k = wordKey(language, word, topic);
  const favs = await getFavorites();
  const idx = favs.indexOf(k);
  if (idx >= 0) {
    favs.splice(idx, 1);
    await AsyncStorage.setItem(KEY, JSON.stringify(favs));
    return false;
  } else {
    favs.push(k);
    await AsyncStorage.setItem(KEY, JSON.stringify(favs));
    return true;
  }
};
