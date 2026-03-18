import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Word } from './interfaces/word.interface';

@Injectable()
export class WordsService {
  private words: Word[] = [];
  private dataPath: string;

  constructor() {
    // Path to flashcards.words.json (two levels up from backend/src)
    this.dataPath = path.join(__dirname, '..', '..', '..', 'flashcards.words.json');
    this.loadWords();
  }

  private loadWords(): void {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf-8');
      this.words = JSON.parse(data);
      console.log(`✅ Loaded ${this.words.length} words from flashcards.words.json`);
    } catch (error) {
      console.error('❌ Error loading flashcards.words.json:', error);
      this.words = [];
    }
  }

  async getLanguages(): Promise<string[]> {
    const languages = [...new Set(this.words.map(w => w.language))];
    return languages;
  }

  async getTopics(language: string): Promise<string[]> {
    const topics = [...new Set(
      this.words
        .filter(w => w.language === language)
        .map(w => w.topic)
    )];
    
    // Orden deseado de los topics
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
    
    // Ordenar los topics según el orden especificado
    return topics.sort((a, b) => {
      const indexA = topicOrder.indexOf(a);
      const indexB = topicOrder.indexOf(b);
      
      // Si ambos están en el orden, ordenar por índice
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // Si solo uno está en el orden, ese va primero
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Si ninguno está en el orden, ordenar alfabéticamente
      return a.localeCompare(b);
    });
  }

  async getWords(language: string, topic: string): Promise<Word[]> {
    return this.words.filter(w => w.language === language && w.topic === topic);
  }
}
