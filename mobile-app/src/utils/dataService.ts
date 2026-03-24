import { Word } from '../types/Word';
import flashcardsData from '../../assets/flashcards.words.json';

const data: Word[] = flashcardsData as Word[];

export const getLanguages = (): string[] => {
  const languages = [...new Set(data.map(w => w.language))];
  return languages.filter(lang => lang === 'Hebreo' || lang === 'Español');
};

export const getTopics = (language: string): string[] => {
  const topics = [...new Set(
    data
      .filter(w => w.language === language)
      .map(w => w.topic)
  )];
  
  const topicOrder = [
    'Alfabeto',
    'Números',
    'Cardinales',
    'Preposiciones y artículos',
    'Pronombres',
    'Adverbios',
    'Locuciones adverbiales',
    'Adjetivos',
    'Sustantivos',
    'Verbos',
    'Raíz',
    'Vocabulario',
    'Slang',
    'Frases útiles',
    'Expresiones Idiomáticas (Nivim)',
    'Gramática'
  ];
  
  return topics.sort((a, b) => {
    const indexA = topicOrder.indexOf(a);
    const indexB = topicOrder.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    return a.localeCompare(b);
  });
};

export const getWords = (language: string, topic: string): Word[] => {
  return data.filter(w => w.language === language && w.topic === topic);
};

export const getAllWordsExcept = (language: string, excludeTopics: string[]): Word[] => {
  return data.filter(w => 
    w.language === language && !excludeTopics.includes(w.topic)
  );
};

export const getAllWords = (): Word[] => data;
