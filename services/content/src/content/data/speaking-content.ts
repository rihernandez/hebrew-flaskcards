export interface ConversationSituation {
  id: string;
  emoji: string;
  title: string;
  prompt: string;
  expectedKeywords: string[];
  exampleAnswer: string;
}

export interface TranslationPair {
  sourceText: string;
  targetText: string;
  keywords: string[];
}

export interface LecturaParagraph {
  text: string;
  wordCount: number;
  ttsLocale: string;
}

export interface DictadoItem {
  phrase: string;
  ttsLocale: string;
}

export interface DictadoLevel {
  level: number;
  label: string;
  description: string;
  items: DictadoItem[];
}

export const SITUATIONS_ES: ConversationSituation[] = [
  { id: 'restaurant', emoji: '🍽️', title: 'En el restaurante', prompt: 'El camarero te pregunta: ¿Qué desea pedir?', expectedKeywords: ['quiero', 'quisiera', 'por favor', 'gracias', 'agua', 'mesa'], exampleAnswer: 'Quisiera una mesa para dos, por favor. Y agua.' },
  { id: 'directions', emoji: '🗺️', title: 'Pidiendo direcciones', prompt: 'Un turista te pregunta: ¿Dónde está el banco más cercano?', expectedKeywords: ['derecha', 'izquierda', 'recto', 'calle', 'cerca', 'lejos'], exampleAnswer: 'Sigue recto dos cuadras y gira a la derecha.' },
  { id: 'introduction', emoji: '👋', title: 'Presentándote', prompt: 'Conoces a alguien nuevo. Preséntate.', expectedKeywords: ['me llamo', 'soy', 'mucho gusto', 'encantado', 'vivo', 'trabajo'], exampleAnswer: 'Hola, me llamo Daniel. Soy de Israel. Mucho gusto.' }
];

export const TRANSLATION_PAIRS: TranslationPair[] = [
  { sourceText: 'אני רוצה כוס מים, בבקשה.', targetText: 'Quiero un vaso de agua, por favor.', keywords: ['quiero', 'agua', 'favor'] },
  { sourceText: 'איפה התחנה הקרובה?', targetText: '¿Dónde está la estación más cercana?', keywords: ['dónde', 'estación', 'cercana'] },
  { sourceText: 'כמה זה עולה?', targetText: '¿Cuánto cuesta esto?', keywords: ['cuánto', 'cuesta'] },
  { sourceText: 'אני לא מבין, תוכל לדבר לאט יותר?', targetText: 'No entiendo, ¿puedes hablar más despacio?', keywords: ['entiendo', 'hablar', 'despacio'] }
];

export const LECTURA_PARAGRAPHS: LecturaParagraph[] = [
  { text: 'Madrid es la capital de España y una de las ciudades más grandes de Europa. Tiene muchos museos famosos, como el Prado y el Reina Sofía.', wordCount: 25, ttsLocale: 'es-ES' },
  { text: 'El español es el segundo idioma más hablado del mundo. Aprender español abre muchas puertas, tanto en el trabajo como en los viajes.', wordCount: 24, ttsLocale: 'es-ES' }
];

export const DICTADO_LEVELS: DictadoLevel[] = [
  {
    level: 1,
    label: 'Nivel 1 — Básico',
    description: 'Frases cortas y simples',
    items: [
      { phrase: 'Hola, ¿cómo estás?', ttsLocale: 'es-ES' },
      { phrase: 'Buenos días.', ttsLocale: 'es-ES' },
      { phrase: 'Me llamo Juan.', ttsLocale: 'es-ES' }
    ]
  },
  {
    level: 2,
    label: 'Nivel 2 — Elemental',
    description: 'Frases de uso cotidiano',
    items: [
      { phrase: 'Necesito comprar pan y leche.', ttsLocale: 'es-ES' },
      { phrase: 'El tren sale a las ocho.', ttsLocale: 'es-ES' },
      { phrase: 'La reunión empieza a las tres.', ttsLocale: 'es-ES' }
    ]
  }
];
