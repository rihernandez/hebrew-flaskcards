import { stateApi } from './stateApi';

const KEY = 'favorites';

const wordKey = (language: string, word: string, topic: string) =>
  `${language}_${word}_${topic}`;

export const getFavorites = async (): Promise<string[]> => {
  return stateApi.get<string[]>('learning-state', KEY, []);
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
    await stateApi.set('learning-state', KEY, favs);
    return false;
  }
  favs.push(k);
  await stateApi.set('learning-state', KEY, favs);
  return true;
};
