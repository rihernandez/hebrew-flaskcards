/**
 * InteractiveStory — Historia interactiva
 * Un cuento con huecos. El usuario debe decir la palabra correcta en voz alta
 * (o escribirla como fallback) para avanzar la historia.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Dimensions, Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { normalizeAndCompare } from '../utils/activityUtils';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

let _stt: any = null;
function getStt() {
  if (_stt !== null) return _stt;
  try { const m = require('expo-speech-recognition'); _stt = m?.ExpoSpeechRecognitionModule ?? false; }
  catch { _stt = false; }
  return _stt || null;
}

// ── Story content ─────────────────────────────────────────────────────────────
interface StorySegment {
  text: string;       // narrative text shown to user
  blank: string;      // the word they need to say
  hint: string;       // translation hint
  ttsLocale: string;
}

const STORIES_ES: { title: string; segments: StorySegment[] }[] = [
  {
    title: '🏪 En el mercado',
    segments: [
      { text: 'María entra al mercado. Ve muchas frutas. Quiere comprar una', blank: 'manzana', hint: '(תפוח)', ttsLocale: 'es-ES' },
      { text: 'El vendedor le pregunta: "¿Cuántas quiere?" María responde: "Tres, por', blank: 'favor', hint: '(בבקשה)', ttsLocale: 'es-ES' },
      { text: 'El vendedor le dice el precio. María abre su', blank: 'bolso', hint: '(תיק)', ttsLocale: 'es-ES' },
      { text: 'Saca su', blank: 'dinero', hint: '(כסף)', ttsLocale: 'es-ES' },
      { text: 'María paga y dice "muchas', blank: 'gracias', hint: '(תודה רבה)', ttsLocale: 'es-ES' },
    ],
  },
  {
    title: '🏥 En el médico',
    segments: [
      { text: 'Juan no se siente bien. Tiene', blank: 'fiebre', hint: '(חום)', ttsLocale: 'es-ES' },
      { text: 'Va al médico. El médico le pregunta: "¿Dónde le', blank: 'duele', hint: '(כואב)', ttsLocale: 'es-ES' },
      { text: 'Juan señala su', blank: 'cabeza', hint: '(ראש)', ttsLocale: 'es-ES' },
      { text: 'El médico le receta una', blank: 'medicina', hint: '(תרופה)', ttsLocale: 'es-ES' },
      { text: 'Juan debe descansar y beber mucha', blank: 'agua', hint: '(מים)', ttsLocale: 'es-ES' },
    ],
  },
];

const STORIES_HE: { title: string; segments: StorySegment[] }[] = [
  {
    title: '🏪 בשוק',
    segments: [
      { text: 'מרים נכנסת לשוק. היא רואה הרבה פירות. היא רוצה לקנות', blank: 'תפוח', hint: '(manzana)', ttsLocale: 'he-IL' },
      { text: 'המוכר שואל: "כמה אתה רוצה?" מרים עונה: "שלושה,', blank: 'בבקשה', hint: '(por favor)', ttsLocale: 'he-IL' },
      { text: 'המוכר אומר לה את המחיר. מרים פותחת את', blank: 'התיק', hint: '(el bolso)', ttsLocale: 'he-IL' },
      { text: 'היא מוציאה את', blank: 'הכסף', hint: '(el dinero)', ttsLocale: 'he-IL' },
      { text: 'מרים משלמת ואומרת "תודה', blank: 'רבה', hint: '(muchas gracias)', ttsLocale: 'he-IL' },
    ],
  },
];

const L: Record<Language, {
  title: string; speakBtn: string; stopBtn: string; typeHint: string;
  correct: string; incorrect: string; next: string; done: string;
  summaryTitle: string; close: string; selectStory: string; noMic: string;
  orType: string; checkBtn: string;
}> = {
  he: {
    title: '📖 סיפור אינטראקטיבי', speakBtn: '🎤 אמור את המילה', stopBtn: '⏹ עצור',
    typeHint: 'כתוב את המילה...', correct: '✅ נכון!', incorrect: '❌ נסה שוב',
    next: 'הבא →', done: 'סיום ✓', summaryTitle: '🎉 סיימת את הסיפור!',
    close: 'סגור', selectStory: 'בחר סיפור', noMic: 'נדרשת הרשאת מיקרופון',
    orType: 'או כתוב:', checkBtn: '✓ בדוק',
  },
  es: {
    title: '📖 Historia Interactiva', speakBtn: '🎤 Di la palabra', stopBtn: '⏹ Detener',
    typeHint: 'Escribe la palabra...', correct: '✅ ¡Correcto!', incorrect: '❌ Inténtalo de nuevo',
    next: 'Siguiente →', done: 'Finalizar ✓', summaryTitle: '🎉 ¡Terminaste la historia!',
    close: 'Cerrar', selectStory: 'Elige una historia', noMic: 'Se necesita permiso de micrófono',
    orType: 'O escribe:', checkBtn: '✓ Verificar',
  },
  en: {
    title: '📖 Interactive Story', speakBtn: '🎤 Say the word', stopBtn: '⏹ Stop',
    typeHint: 'Type the word...', correct: '✅ Correct!', incorrect: '❌ Try again',
    next: 'Next →', done: 'Finish ✓', summaryTitle: '🎉 Story complete!',
    close: 'Close', selectStory: 'Choose a story', noMic: 'Microphone permission required',
    orType: 'Or type:', checkBtn: '✓ Check',
  },
};

type Phase = 'select' | 'reading' | 'speaking' | 'recording' | 'correct' | 'incorrect' | 'done';

interface Props {
  uiLanguage: Language;
  language: string;
  onExit: () => void;
}

export const InteractiveStory: React.FC<Props> = ({ uiLanguage, language, onExit }) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const isHebrew = language === 'Hebreo' || language === 'Hebrew';
  const stories = isHebrew ? STORIES_HE : STORIES_ES;
  const sttLocale = isHebrew ? 'he-IL' : 'es-ES';

  const [selectedStory, setSelectedStory] = useState<number | null>(null);
  const [segIndex, setSegIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('select');
  const [textInput, setTextInput] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const listenersRef = useRef<(() => void)[]>([]);

  const story = selectedStory !== null ? stories[selectedStory] : null;
  const segment = story?.segments[segIndex];

  const removeListeners = () => { listenersRef.current.forEach(fn => fn()); listenersRef.current = []; };

  const startStory = (idx: number) => {
    setSelectedStory(idx);
    setSegIndex(0);
    setCorrectCount(0);
    setPhase('reading');
    // Read the text aloud
    Speech.speak(stories[idx].segments[0].text, { language: sttLocale, rate: 0.9 });
  };

  const startSpeaking = async () => {
    const stt = getStt();
    if (!stt) { setPhase('speaking'); return; } // fallback to text input
    const { granted } = await stt.requestPermissionsAsync();
    if (!granted) { Alert.alert(t.noMic); return; }

    setPhase('recording');
    removeListeners();
    try {
      const m = require('expo-speech-recognition');
      const r1 = m.ExpoSpeechRecognitionModule.addListener('result', (e: any) => {
        const text: string = e.results?.[0]?.transcript ?? '';
        getStt()?.stop?.();
        removeListeners();
        checkAnswer(text);
      });
      const r2 = m.ExpoSpeechRecognitionModule.addListener('error', () => {
        removeListeners();
        setPhase('speaking');
      });
      listenersRef.current = [() => r1?.remove?.(), () => r2?.remove?.()];
    } catch { setPhase('speaking'); return; }
    stt.start({ lang: sttLocale, interimResults: false, continuous: false });
  };

  const checkAnswer = (answer: string) => {
    if (!segment) return;
    if (normalizeAndCompare(answer, segment.blank)) {
      setCorrectCount(c => c + 1);
      setPhase('correct');
      Speech.speak(segment.blank, { language: sttLocale });
    } else {
      setPhase('incorrect');
    }
  };

  const advance = () => {
    if (!story) return;
    const next = segIndex + 1;
    if (next >= story.segments.length) { setPhase('done'); return; }
    setSegIndex(next);
    setPhase('reading');
    setTextInput('');
    Speech.speak(story.segments[next].text, { language: sttLocale, rate: 0.9 });
  };

  // Story selection
  if (phase === 'select') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
          <TouchableOpacity onPress={onExit}><Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text></TouchableOpacity>
        </View>
        <Text style={[styles.sub, { color: colors.text2 }]}>{t.selectStory}</Text>
        <ScrollView contentContainerStyle={{ gap: s(12), paddingTop: s(8) }}>
          {stories.map((s, i) => (
            <TouchableOpacity key={i} style={[styles.storyCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => startStory(i)}>
              <Text style={[styles.storyTitle, { color: colors.text }]}>{s.title}</Text>
              <Text style={[styles.storyCount, { color: colors.text2 }]}>{s.segments.length} palabras</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Done
  if (phase === 'done' && story) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>🎉</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.summaryTitle}</Text>
          <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>{correctCount}/{story.segments.length}</Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onExit}>
            <Text style={styles.btnText}>{t.done}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!segment) return null;

  return (
    <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>{story?.title}</Text>
        <TouchableOpacity onPress={onExit}><Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text></TouchableOpacity>
      </View>
      <Text style={[styles.progress, { color: colors.text2 }]}>{segIndex + 1}/{story?.segments.length}</Text>

      {/* Story text with blank */}
      <View style={[styles.storyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.storyText, { color: colors.text }]}>
          {segment.text}{' '}
          <Text style={[styles.blank, { borderBottomColor: colors.primary }]}>
            {(phase === 'correct') ? segment.blank : '________'}
          </Text>
        </Text>
        <Text style={[styles.hint, { color: colors.text2 }]}>{segment.hint}</Text>
      </View>

      {phase === 'reading' && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={startSpeaking}>
          <Text style={styles.btnText}>{t.speakBtn}</Text>
        </TouchableOpacity>
      )}

      {phase === 'recording' && (
        <View style={[styles.statusBox, { backgroundColor: colors.surface }]}>
          <Text style={styles.statusEmoji}>🔴</Text>
          <Text style={[styles.statusLabel, { color: colors.text2 }]}>Escuchando...</Text>
        </View>
      )}

      {(phase === 'speaking' || phase === 'incorrect') && (
        <View style={styles.inputArea}>
          {phase === 'incorrect' && (
            <Text style={[styles.feedback, { color: '#f44336' }]}>{t.incorrect}</Text>
          )}
          <Text style={[styles.orType, { color: colors.text2 }]}>{t.orType}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]}
            value={textInput} onChangeText={setTextInput}
            placeholder={t.typeHint} placeholderTextColor={colors.text2}
            autoCorrect={false} autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }, !textInput.trim() && styles.btnDisabled]}
            onPress={() => { checkAnswer(textInput); setTextInput(''); }}
            disabled={!textInput.trim()}
          >
            <Text style={styles.btnText}>{t.checkBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'correct' && (
        <View style={styles.inputArea}>
          <Text style={[styles.feedback, { color: '#4caf50' }]}>{t.correct}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={advance}>
            <Text style={styles.btnText}>{segIndex + 1 >= (story?.segments.length ?? 0) ? t.done : t.next}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: s(20), gap: s(14) },
  card: { padding: s(20), gap: s(14), flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: s(16) },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: s(18), fontWeight: '800' },
  sub: { fontSize: s(13) },
  exitBtn: { fontSize: s(20), padding: s(4) },
  progress: { fontSize: s(12), alignSelf: 'flex-end' },
  storyCard: { padding: s(16), borderRadius: s(12), borderWidth: 1, gap: s(4) },
  storyTitle: { fontSize: s(16), fontWeight: '700' },
  storyCount: { fontSize: s(12) },
  storyBox: { padding: s(20), borderRadius: s(14), borderWidth: 1, gap: s(8) },
  storyText: { fontSize: s(17), lineHeight: s(28) },
  blank: { borderBottomWidth: 2, color: 'transparent' },
  hint: { fontSize: s(12), fontStyle: 'italic' },
  inputArea: { gap: s(10) },
  orType: { fontSize: s(12) },
  input: { padding: s(14), borderRadius: s(10), borderWidth: 2, fontSize: s(16) },
  feedback: { fontSize: s(18), fontWeight: '700', textAlign: 'center' },
  statusBox: { padding: s(20), borderRadius: s(12), alignItems: 'center', gap: s(8) },
  statusEmoji: { fontSize: s(28) },
  statusLabel: { fontSize: s(14) },
  btn: { padding: s(16), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  bigEmoji: { fontSize: s(56) },
  scoreBox: { padding: s(24), borderRadius: s(16), borderWidth: 1, alignItems: 'center' },
  scoreNum: { fontSize: s(48), fontWeight: '800' },
});
