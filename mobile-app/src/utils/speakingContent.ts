import { Word } from '../types/Word';
import { getSRSData } from './srs';
import { stateApi } from './stateApi';

export interface ShadowPhrase { phrase: string; translation: string; keywords: string[]; }
export interface ConversationSituation { id: string; emoji: string; title: string; prompt: string; expectedKeywords: string[]; exampleAnswer: string; }
export interface PronunciacionItem { word: string; translation: string; ttsLocale: string; }
export interface DictadoItem { phrase: string; ttsLocale: string; }
export interface DictadoLevel { level: number; label: string; description: string; items: DictadoItem[]; }
export interface TranslationPair { sourceText: string; targetText: string; keywords: string[]; }
export interface LecturaParagraph { text: string; wordCount: number; ttsLocale: string; }

// ── Dictado progress ──────────────────────────────────────────────────────────
const DICTADO_PROGRESS_KEY = 'dictado_level_progress';
const MIN_ACCURACY_TO_UNLOCK = 70; // %

export interface DictadoProgress { [level: number]: { completed: boolean; bestAccuracy: number; }; }

export const getDictadoProgress = async (): Promise<DictadoProgress> => {
  return stateApi.get<DictadoProgress>('learning-state', DICTADO_PROGRESS_KEY, {
    1: { completed: false, bestAccuracy: 0 },
  });
};

export const saveDictadoLevelResult = async (level: number, accuracy: number): Promise<void> => {
  const progress = await getDictadoProgress();
  const prev = progress[level] ?? { completed: false, bestAccuracy: 0 };
  const completed = accuracy >= MIN_ACCURACY_TO_UNLOCK;
  progress[level] = { completed: completed || prev.completed, bestAccuracy: Math.max(prev.bestAccuracy, accuracy) };
  // unlock next level if passed
  if (completed && !progress[level + 1]) {
    progress[level + 1] = { completed: false, bestAccuracy: 0 };
  }
  await stateApi.set('learning-state', DICTADO_PROGRESS_KEY, progress);
};

export const isLevelUnlocked = (level: number, progress: DictadoProgress): boolean => {
  if (level === 1) return true;
  return !!(progress[level - 1]?.completed);
};

// ── Situations ────────────────────────────────────────────────────────────────
const SITUATIONS: ConversationSituation[] = [
  { id: 'restaurant', emoji: '🍽️', title: 'En el restaurante', prompt: 'El camarero te pregunta: ¿Qué desea pedir?', expectedKeywords: ['quiero', 'quisiera', 'por favor', 'gracias', 'agua', 'mesa'], exampleAnswer: 'Quisiera una mesa para dos, por favor. Y agua.' },
  { id: 'directions', emoji: '🗺️', title: 'Pidiendo direcciones', prompt: 'Un turista te pregunta: ¿Dónde está el banco más cercano?', expectedKeywords: ['derecha', 'izquierda', 'recto', 'calle', 'cerca', 'lejos'], exampleAnswer: 'Sigue recto dos cuadras y gira a la derecha.' },
  { id: 'introduction', emoji: '👋', title: 'Presentándote', prompt: 'Conoces a alguien nuevo. Preséntate.', expectedKeywords: ['me llamo', 'soy', 'mucho gusto', 'encantado', 'vivo', 'trabajo'], exampleAnswer: 'Hola, me llamo Daniel. Soy de Israel. Mucho gusto.' },
  { id: 'shopping', emoji: '🛍️', title: 'De compras', prompt: 'El vendedor te pregunta: ¿En qué le puedo ayudar?', expectedKeywords: ['busco', 'necesito', 'cuánto', 'precio', 'talla', 'color'], exampleAnswer: 'Busco una camisa azul. ¿Cuánto cuesta?' },
  { id: 'work', emoji: '💼', title: 'En el trabajo', prompt: 'Tu jefe te pregunta: ¿Cómo va el proyecto?', expectedKeywords: ['bien', 'terminé', 'falta', 'problema', 'listo', 'mañana'], exampleAnswer: 'Va bien. Terminé la primera parte. Mañana entrego el resto.' },
  { id: 'doctor', emoji: '🏥', title: 'En el médico', prompt: 'El médico te pregunta: ¿Qué síntomas tiene?', expectedKeywords: ['dolor', 'cabeza', 'fiebre', 'días', 'cansado', 'mal'], exampleAnswer: 'Tengo dolor de cabeza y fiebre desde dos días.' },
];

const PHRASE_TEMPLATES_ES = [
  (w: Word) => ({ phrase: `Necesito ${w.word} para mañana.`, translation: `אני צריך ${w.meaning} למחר.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `¿Dónde está el ${w.word}?`, translation: `איפה ה${w.meaning}?`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `El ${w.word} es muy importante.`, translation: `ה${w.meaning} מאוד חשוב.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `Me gusta mucho el ${w.word}.`, translation: `אני מאוד אוהב את ה${w.meaning}.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `Hoy voy a usar ${w.word}.`, translation: `היום אני הולך להשתמש ב${w.meaning}.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `El ${w.word} está en la mesa.`, translation: `ה${w.meaning} על השולחן.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `Quiero comprar ${w.word}.`, translation: `אני רוצה לקנות ${w.meaning}.`, keywords: [w.word] }),
];

const PHRASE_TEMPLATES_HE = [
  (w: Word) => ({ phrase: `אני צריך ${w.word} למחר.`, translation: `Necesito ${w.meaning} para mañana.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `איפה ה${w.word}?`, translation: `¿Dónde está el ${w.meaning}?`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `ה${w.word} מאוד חשוב.`, translation: `El ${w.meaning} es muy importante.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `אני מאוד אוהב את ה${w.word}.`, translation: `Me gusta mucho el ${w.meaning}.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `היום אני הולך להשתמש ב${w.word}.`, translation: `Hoy voy a usar ${w.meaning}.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `ה${w.word} על השולחן.`, translation: `El ${w.meaning} está en la mesa.`, keywords: [w.word] }),
  (w: Word) => ({ phrase: `אני רוצה לקנות ${w.word}.`, translation: `Quiero comprar ${w.meaning}.`, keywords: [w.word] }),
];

export const getShadowPhrases = async (learnedWords: Word[], count = 5): Promise<ShadowPhrase[]> => {
  const srsData = await getSRSData();
  const mastered = learnedWords.filter(w => (srsData[`${w.language}_${w.word}_${w.topic}`]?.repetitions ?? 0) >= 2);
  const pool = mastered.length >= count ? mastered : learnedWords;
  const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  // detect language from first word
  const isHebrew = selected[0]?.language === 'Hebreo' || selected[0]?.language === 'Hebrew';
  const templates = isHebrew ? PHRASE_TEMPLATES_HE : PHRASE_TEMPLATES_ES;
  return selected.map((w, i) => templates[i % templates.length](w));
};

export const getDailySituations = (count = 2, language?: string): ConversationSituation[] => {
  const isHebrew = language === 'Hebreo' || language === 'Hebrew';
  const pool = isHebrew ? SITUATIONS_HE : SITUATIONS;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
};

export const checkSpeakingUnlock = (challengeStreak: number, isAdvanced: boolean): boolean =>
  isAdvanced || challengeStreak >= 30;

// ── Dictado levels ────────────────────────────────────────────────────────────
const T = 'es-ES';
export const DICTADO_LEVELS: DictadoLevel[] = [
  {
    level: 1, label: 'Nivel 1 — Básico', description: 'Frases cortas y simples',
    items: [
      { phrase: 'Hola, ¿cómo estás?', ttsLocale: T }, { phrase: 'Buenos días.', ttsLocale: T },
      { phrase: 'Me llamo Juan.', ttsLocale: T }, { phrase: 'Tengo hambre.', ttsLocale: T },
      { phrase: 'Quiero agua.', ttsLocale: T }, { phrase: 'Hace calor hoy.', ttsLocale: T },
      { phrase: 'El libro es azul.', ttsLocale: T }, { phrase: 'Vivo en Madrid.', ttsLocale: T },
      { phrase: 'Tengo un perro.', ttsLocale: T }, { phrase: 'La casa es grande.', ttsLocale: T },
      { phrase: 'Me gusta el café.', ttsLocale: T }, { phrase: 'Hoy es lunes.', ttsLocale: T },
      { phrase: 'Son las tres.', ttsLocale: T }, { phrase: 'Tengo sed.', ttsLocale: T },
      { phrase: 'El gato duerme.', ttsLocale: T }, { phrase: 'Quiero comer.', ttsLocale: T },
      { phrase: 'Ella es alta.', ttsLocale: T }, { phrase: 'El coche es rojo.', ttsLocale: T },
      { phrase: 'Habla más despacio.', ttsLocale: T }, { phrase: 'No entiendo.', ttsLocale: T },
      { phrase: 'Por favor, repite.', ttsLocale: T }, { phrase: 'Gracias por todo.', ttsLocale: T },
      { phrase: 'Hasta luego.', ttsLocale: T }, { phrase: 'De nada.', ttsLocale: T },
      { phrase: 'Lo siento mucho.', ttsLocale: T }, { phrase: 'Tengo frío.', ttsLocale: T },
      { phrase: 'El niño llora.', ttsLocale: T }, { phrase: 'Ella canta bien.', ttsLocale: T },
      { phrase: 'Voy al mercado.', ttsLocale: T }, { phrase: 'El pan está rico.', ttsLocale: T },
    ],
  },
  {
    level: 2, label: 'Nivel 2 — Elemental', description: 'Frases de uso cotidiano',
    items: [
      { phrase: 'El mercado está cerca de la plaza.', ttsLocale: T },
      { phrase: 'Necesito comprar pan y leche.', ttsLocale: T },
      { phrase: 'Mi hermano trabaja en una oficina.', ttsLocale: T },
      { phrase: 'El tren sale a las ocho.', ttsLocale: T },
      { phrase: 'Hoy hace mucho calor en la ciudad.', ttsLocale: T },
      { phrase: 'La reunión empieza a las tres.', ttsLocale: T },
      { phrase: 'Quiero aprender español para viajar.', ttsLocale: T },
      { phrase: 'El restaurante cierra los lunes.', ttsLocale: T },
      { phrase: 'Vivo cerca del centro de la ciudad.', ttsLocale: T },
      { phrase: 'Me gusta caminar por el parque.', ttsLocale: T },
      { phrase: 'Ella trabaja todos los días.', ttsLocale: T },
      { phrase: 'El supermercado está a dos cuadras.', ttsLocale: T },
      { phrase: 'Tengo una reunión esta tarde.', ttsLocale: T },
      { phrase: 'El vuelo sale a las seis.', ttsLocale: T },
      { phrase: 'Necesito un taxi al aeropuerto.', ttsLocale: T },
      { phrase: 'La farmacia está en la esquina.', ttsLocale: T },
      { phrase: 'Quiero una habitación para dos.', ttsLocale: T },
      { phrase: 'El menú del día cuesta diez euros.', ttsLocale: T },
      { phrase: 'Habla español muy bien.', ttsLocale: T },
      { phrase: 'Estudio español desde hace un año.', ttsLocale: T },
      { phrase: 'Mi familia vive en otra ciudad.', ttsLocale: T },
      { phrase: 'El banco abre a las nueve.', ttsLocale: T },
      { phrase: 'Necesito cambiar dinero.', ttsLocale: T },
      { phrase: 'La película empieza a las ocho.', ttsLocale: T },
      { phrase: 'Prefiero el té al café.', ttsLocale: T },
      { phrase: 'El médico me recetó antibióticos.', ttsLocale: T },
      { phrase: 'Voy al gimnasio tres veces por semana.', ttsLocale: T },
      { phrase: 'El autobús llega en diez minutos.', ttsLocale: T },
      { phrase: 'Tengo que llamar a mi madre.', ttsLocale: T },
      { phrase: 'La tienda está cerrada hoy.', ttsLocale: T },
    ],
  },
  {
    level: 3, label: 'Nivel 3 — Intermedio', description: 'Frases más largas y detalladas',
    items: [
      { phrase: 'El mercado está cerca de la plaza central de la ciudad.', ttsLocale: T },
      { phrase: 'Necesito comprar pan y leche esta tarde en el supermercado.', ttsLocale: T },
      { phrase: 'Mi hermano trabaja en una oficina grande en el centro.', ttsLocale: T },
      { phrase: 'El tren sale a las ocho de la mañana desde la estación central.', ttsLocale: T },
      { phrase: 'Hoy hace mucho calor y no quiero salir de casa.', ttsLocale: T },
      { phrase: 'La reunión empieza a las tres y termina a las cinco.', ttsLocale: T },
      { phrase: 'Quiero aprender español para poder viajar por América Latina.', ttsLocale: T },
      { phrase: 'El restaurante cierra los lunes por la noche y los martes.', ttsLocale: T },
      { phrase: 'Me gustaría reservar una mesa para cuatro personas esta noche.', ttsLocale: T },
      { phrase: 'El vuelo tiene una escala de dos horas en Madrid.', ttsLocale: T },
      { phrase: 'Necesito encontrar un hotel cerca del aeropuerto para mañana.', ttsLocale: T },
      { phrase: 'La farmacia de guardia está abierta hasta las doce de la noche.', ttsLocale: T },
      { phrase: 'Estudio español todos los días durante una hora por la mañana.', ttsLocale: T },
      { phrase: 'Mi familia vive en otra ciudad y los visito cada dos semanas.', ttsLocale: T },
      { phrase: 'El banco abre a las nueve y cierra a las dos de la tarde.', ttsLocale: T },
      { phrase: 'Prefiero caminar al trabajo cuando el tiempo es bueno.', ttsLocale: T },
      { phrase: 'El médico me dijo que necesito descansar más y beber agua.', ttsLocale: T },
      { phrase: 'Voy al gimnasio tres veces por semana para mantenerme en forma.', ttsLocale: T },
      { phrase: 'El autobús llega en diez minutos según la aplicación del móvil.', ttsLocale: T },
      { phrase: 'Tengo que llamar a mi madre porque hoy es su cumpleaños.', ttsLocale: T },
      { phrase: 'La tienda está cerrada hoy porque es un día festivo nacional.', ttsLocale: T },
      { phrase: 'Me gustaría practicar español con un hablante nativo cada semana.', ttsLocale: T },
      { phrase: 'El precio del billete de avión ha subido mucho este verano.', ttsLocale: T },
      { phrase: 'Necesito renovar mi pasaporte antes de viajar al extranjero.', ttsLocale: T },
      { phrase: 'La conferencia internacional se celebra en Barcelona este año.', ttsLocale: T },
      { phrase: 'El proyecto debe estar terminado antes del final del mes.', ttsLocale: T },
      { phrase: 'Me han ofrecido un trabajo nuevo con mejor salario y horario.', ttsLocale: T },
      { phrase: 'El niño aprendió a leer en menos de seis meses de clases.', ttsLocale: T },
      { phrase: 'La exposición de arte moderno estará abierta hasta el domingo.', ttsLocale: T },
      { phrase: 'Reservé una habitación doble con vistas al mar para el fin de semana.', ttsLocale: T },
    ],
  },
  {
    level: 4, label: 'Nivel 4 — Avanzado', description: 'Frases complejas con vocabulario rico',
    items: [
      { phrase: 'A pesar del mal tiempo, decidimos salir a dar un paseo por el parque.', ttsLocale: T },
      { phrase: 'El gobierno anunció nuevas medidas para reducir la contaminación urbana.', ttsLocale: T },
      { phrase: 'Aunque estaba cansado, terminó el informe antes de la medianoche.', ttsLocale: T },
      { phrase: 'La empresa ha decidido expandirse a nuevos mercados internacionales.', ttsLocale: T },
      { phrase: 'Los científicos descubrieron una nueva especie de planta en la Amazonia.', ttsLocale: T },
      { phrase: 'El festival de cine atrae a miles de visitantes de todo el mundo cada año.', ttsLocale: T },
      { phrase: 'La tecnología ha transformado completamente la forma en que nos comunicamos.', ttsLocale: T },
      { phrase: 'Es fundamental mantener una dieta equilibrada y hacer ejercicio regularmente.', ttsLocale: T },
      { phrase: 'El acuerdo de paz fue firmado después de meses de negociaciones intensas.', ttsLocale: T },
      { phrase: 'La biblioteca universitaria cuenta con más de un millón de volúmenes.', ttsLocale: T },
      { phrase: 'El arquitecto diseñó un edificio sostenible con paneles solares en la fachada.', ttsLocale: T },
      { phrase: 'La inflación ha afectado significativamente el poder adquisitivo de los ciudadanos.', ttsLocale: T },
      { phrase: 'El programa de becas permite a estudiantes estudiar en el extranjero gratuitamente.', ttsLocale: T },
      { phrase: 'La investigación demostró que el sueño es esencial para la memoria y el aprendizaje.', ttsLocale: T },
      { phrase: 'El museo exhibe una colección permanente de arte contemporáneo latinoamericano.', ttsLocale: T },
      { phrase: 'La reforma educativa busca mejorar la calidad de la enseñanza en las escuelas públicas.', ttsLocale: T },
      { phrase: 'El equipo de fútbol ganó el campeonato después de una temporada extraordinaria.', ttsLocale: T },
      { phrase: 'La contaminación del océano representa una amenaza grave para la biodiversidad marina.', ttsLocale: T },
      { phrase: 'El escritor publicó su primera novela a los setenta años y fue un éxito inmediato.', ttsLocale: T },
      { phrase: 'La ciudad implementó un sistema de transporte público completamente eléctrico.', ttsLocale: T },
      { phrase: 'El voluntariado internacional ofrece experiencias únicas de aprendizaje cultural.', ttsLocale: T },
      { phrase: 'La digitalización de los servicios públicos ha simplificado muchos trámites burocráticos.', ttsLocale: T },
      { phrase: 'El cambio climático requiere una respuesta global coordinada e inmediata.', ttsLocale: T },
      { phrase: 'La inteligencia artificial está revolucionando sectores como la medicina y la educación.', ttsLocale: T },
      { phrase: 'El turismo sostenible busca minimizar el impacto ambiental de los viajeros.', ttsLocale: T },
      { phrase: 'La diversidad cultural enriquece a las sociedades y fomenta la tolerancia.', ttsLocale: T },
      { phrase: 'El sistema judicial debe garantizar la igualdad de todos los ciudadanos ante la ley.', ttsLocale: T },
      { phrase: 'La pandemia aceleró la adopción del trabajo remoto en muchas empresas del mundo.', ttsLocale: T },
      { phrase: 'El desarrollo sostenible equilibra el crecimiento económico con la protección ambiental.', ttsLocale: T },
      { phrase: 'La cooperación internacional es clave para resolver los desafíos globales del siglo veintiuno.', ttsLocale: T },
    ],
  },
  {
    level: 5, label: 'Nivel 5 — Experto', description: 'Frases largas con estructuras complejas',
    items: [
      { phrase: 'A pesar de las dificultades económicas, el país logró mantener un crecimiento sostenido durante la última década.', ttsLocale: T },
      { phrase: 'La investigación científica ha demostrado que el ejercicio físico regular reduce significativamente el riesgo de enfermedades cardiovasculares.', ttsLocale: T },
      { phrase: 'El acuerdo comercial entre los dos países abrirá nuevas oportunidades para las pequeñas y medianas empresas de ambas naciones.', ttsLocale: T },
      { phrase: 'La transformación digital de la economía exige que los trabajadores adquieran nuevas competencias tecnológicas de manera continua.', ttsLocale: T },
      { phrase: 'El programa de conservación del medio ambiente incluye la reforestación de miles de hectáreas de bosque tropical destruido.', ttsLocale: T },
      { phrase: 'La crisis migratoria ha puesto de manifiesto la necesidad de establecer políticas humanitarias más justas y coordinadas a nivel internacional.', ttsLocale: T },
      { phrase: 'El avance de la inteligencia artificial plantea importantes preguntas éticas sobre la privacidad, el empleo y la autonomía humana.', ttsLocale: T },
      { phrase: 'La educación de calidad es el fundamento sobre el cual se construyen sociedades más equitativas, prósperas y democráticas.', ttsLocale: T },
      { phrase: 'El descubrimiento arqueológico reveló que la civilización era mucho más antigua y sofisticada de lo que los historiadores habían supuesto.', ttsLocale: T },
      { phrase: 'La reforma del sistema de pensiones es necesaria para garantizar la sostenibilidad financiera a largo plazo del estado de bienestar.', ttsLocale: T },
      { phrase: 'La globalización ha generado tanto oportunidades de desarrollo como nuevas formas de desigualdad entre países ricos y pobres.', ttsLocale: T },
      { phrase: 'El proyecto de infraestructura contempla la construcción de una red ferroviaria de alta velocidad que conectará las principales ciudades del país.', ttsLocale: T },
      { phrase: 'La biodiversidad del planeta está amenazada por la deforestación, la contaminación y el cambio climático provocado por las actividades humanas.', ttsLocale: T },
      { phrase: 'El sistema educativo debe adaptarse constantemente a los cambios tecnológicos para preparar a los estudiantes para los empleos del futuro.', ttsLocale: T },
      { phrase: 'La cooperación entre universidades de diferentes países facilita el intercambio de conocimientos y el desarrollo de investigaciones conjuntas.', ttsLocale: T },
      { phrase: 'El acceso universal a la atención médica de calidad sigue siendo uno de los grandes desafíos pendientes de muchas sociedades contemporáneas.', ttsLocale: T },
      { phrase: 'La literatura hispanoamericana del siglo veinte produjo obras de una riqueza y originalidad que transformaron la narrativa mundial.', ttsLocale: T },
      { phrase: 'El fortalecimiento de las instituciones democráticas es esencial para garantizar el respeto a los derechos fundamentales de todos los ciudadanos.', ttsLocale: T },
      { phrase: 'La energía renovable representa la alternativa más viable para reducir la dependencia de los combustibles fósiles y combatir el calentamiento global.', ttsLocale: T },
      { phrase: 'El diálogo intercultural promueve la comprensión mutua y contribuye a la construcción de una sociedad más inclusiva y tolerante.', ttsLocale: T },
      { phrase: 'La automatización de los procesos industriales ha aumentado la productividad pero también ha generado importantes desafíos para el mercado laboral.', ttsLocale: T },
      { phrase: 'El patrimonio cultural de una nación refleja su historia, sus valores y la identidad colectiva de sus ciudadanos a lo largo del tiempo.', ttsLocale: T },
      { phrase: 'La seguridad alimentaria mundial depende de la adopción de prácticas agrícolas sostenibles que protejan los recursos naturales para las generaciones futuras.', ttsLocale: T },
      { phrase: 'El desarrollo de vacunas eficaces contra enfermedades infecciosas ha sido uno de los mayores logros de la medicina moderna en el último siglo.', ttsLocale: T },
      { phrase: 'La planificación urbana sostenible busca crear ciudades más habitables, eficientes energéticamente y resilientes frente a los efectos del cambio climático.', ttsLocale: T },
      { phrase: 'El acceso equitativo a las tecnologías digitales es fundamental para reducir la brecha entre los países desarrollados y los países en vías de desarrollo.', ttsLocale: T },
      { phrase: 'La preservación de los idiomas minoritarios es una responsabilidad colectiva que contribuye a mantener la diversidad cultural y lingüística de la humanidad.', ttsLocale: T },
      { phrase: 'El impacto de las redes sociales en la opinión pública ha transformado profundamente la manera en que se forman y difunden las ideas políticas.', ttsLocale: T },
      { phrase: 'La inversión en investigación y desarrollo es el motor principal del crecimiento económico y la innovación tecnológica en las sociedades modernas.', ttsLocale: T },
      { phrase: 'El respeto a los derechos humanos universales debe ser el principio rector de las relaciones internacionales y de las políticas internas de cada estado.', ttsLocale: T },
    ],
  },
];

// ── Other content ─────────────────────────────────────────────────────────────
const TRANSLATION_PAIRS: TranslationPair[] = [
  { sourceText: 'אני רוצה כוס מים, בבקשה.', targetText: 'Quiero un vaso de agua, por favor.', keywords: ['quiero', 'agua', 'favor'] },
  { sourceText: 'איפה התחנה הקרובה?', targetText: '¿Dónde está la estación más cercana?', keywords: ['dónde', 'estación', 'cercana'] },
  { sourceText: 'כמה זה עולה?', targetText: '¿Cuánto cuesta esto?', keywords: ['cuánto', 'cuesta'] },
  { sourceText: 'אני לא מבין, תוכל לדבר לאט יותר?', targetText: 'No entiendo, ¿puedes hablar más despacio?', keywords: ['entiendo', 'hablar', 'despacio'] },
  { sourceText: 'אני מחפש את המלון.', targetText: 'Estoy buscando el hotel.', keywords: ['buscando', 'hotel'] },
  { sourceText: 'יש לי כאב ראש.', targetText: 'Tengo dolor de cabeza.', keywords: ['tengo', 'dolor', 'cabeza'] },
];

const LECTURA_PARAGRAPHS: LecturaParagraph[] = [
  { text: 'Madrid es la capital de España y una de las ciudades más grandes de Europa. Tiene muchos museos famosos, como el Prado y el Reina Sofía. La gente de Madrid es conocida por su hospitalidad y su amor por el fútbol. Por las noches, la ciudad se llena de vida con restaurantes, bares y espectáculos. Si visitas Madrid, no olvides probar la tortilla española y el cocido madrileño.', wordCount: 72, ttsLocale: 'es-ES' },
  { text: 'El español es el segundo idioma más hablado del mundo. Se habla en más de veinte países, principalmente en América Latina y España. Aprender español abre muchas puertas, tanto en el trabajo como en los viajes. Hay muchas formas de practicar: ver películas, escuchar música, hablar con nativos o usar aplicaciones. Lo más importante es practicar todos los días y no tener miedo a cometer errores.', wordCount: 71, ttsLocale: 'es-ES' },
];

export const getPronunciacionItems = async (learnedWords: Word[], count = 6): Promise<PronunciacionItem[]> => {
  const srsData = await getSRSData();
  const mastered = learnedWords.filter(w => (srsData[`${w.language}_${w.word}_${w.topic}`]?.repetitions ?? 0) >= 2);
  const pool = mastered.length >= count ? mastered : learnedWords;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count).map(w => ({ word: w.word, translation: w.meaning, ttsLocale: 'es-ES' }));
};

export const getDictadoItems = (count = 5): DictadoItem[] =>
  [...DICTADO_LEVELS[0].items].sort(() => Math.random() - 0.5).slice(0, count);

export const getTranslationPairs = (count = 5): TranslationPair[] =>
  [...TRANSLATION_PAIRS].sort(() => Math.random() - 0.5).slice(0, count);

export const getLecturaParagraph = (): LecturaParagraph =>
  LECTURA_PARAGRAPHS[Math.floor(Math.random() * LECTURA_PARAGRAPHS.length)];
