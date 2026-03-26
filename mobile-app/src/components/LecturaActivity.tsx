/**
 * LecturaActivity — Lectura en Voz Alta con karaoke en tiempo real.
 * expo-speech-recognition se carga dinámicamente para no crashear en Expo Go.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { LecturaParagraph } from '../utils/speakingContent';
import { ActivityResult } from '../utils/activityResults';
import { calculateWPM, wpmLabel } from '../utils/activityUtils';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

// ── Safe STT loader — won't crash in Expo Go ──────────────────────────────────
let _stt: any = null;
function getStt() {
  if (_stt !== null) return _stt;
  try {
    const m = require('expo-speech-recognition');
    _stt = m?.ExpoSpeechRecognitionModule ?? false;
  } catch { _stt = false; }
  return _stt || null;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
const L: Record<Language, {
  title: string; sub: string;
  listenBtn: string; stopListenBtn: string;
  startBtn: string; stopBtn: string;
  wpmLabel: string; slow: string; fluent: string; fast: string;
  retryBtn: string; doneBtn: string;
  readingHint: string; noMicPermission: string; noStt: string;
}> = {
  he: {
    title: '📖 קריאה בקול', sub: 'קרא את הפסקה בקול רם',
    listenBtn: '🔊 האזן לדוגמה', stopListenBtn: '⏹ עצור',
    startBtn: '▶ התחל קריאה', stopBtn: '⏹ עצור',
    wpmLabel: 'מילים לדקה', slow: 'איטי', fluent: 'שוטף', fast: 'מהיר',
    retryBtn: '↺ נסה שוב', doneBtn: 'סיום ✓',
    readingHint: 'קרא בקול רם — המילים ישנו צבע בזמן אמת',
    noMicPermission: 'נדרשת הרשאת מיקרופון',
    noStt: 'זיהוי דיבור אינו זמין במכשיר זה',
  },
  es: {
    title: '📖 Lectura en Voz Alta', sub: 'Lee el párrafo en voz alta',
    listenBtn: '🔊 Escuchar ejemplo', stopListenBtn: '⏹ Detener',
    startBtn: '▶ Iniciar lectura', stopBtn: '⏹ Detener',
    wpmLabel: 'palabras por minuto', slow: 'Lento', fluent: 'Fluido', fast: 'Rápido',
    retryBtn: '↺ Reintentar', doneBtn: 'Finalizar ✓',
    readingHint: 'Lee en voz alta — las palabras cambian de color en tiempo real',
    noMicPermission: 'Se necesita permiso de micrófono',
    noStt: 'Reconocimiento de voz no disponible. Instala el APK para usarlo.',
  },
  en: {
    title: '📖 Read Aloud', sub: 'Read the paragraph aloud',
    listenBtn: '🔊 Listen to example', stopListenBtn: '⏹ Stop',
    startBtn: '▶ Start reading', stopBtn: '⏹ Stop',
    wpmLabel: 'words per minute', slow: 'Slow', fluent: 'Fluent', fast: 'Fast',
    retryBtn: '↺ Retry', doneBtn: 'Finish ✓',
    readingHint: 'Read aloud — words change color in real time',
    noMicPermission: 'Microphone permission required',
    noStt: 'Speech recognition not available. Install the APK to use it.',
  },
};

// ─── Word coloring ────────────────────────────────────────────────────────────
type WordState = 'pending' | 'correct' | 'partial' | 'wrong';
const WORD_COLORS: Record<WordState, string> = {
  pending: 'transparent', correct: '#4caf50', partial: '#ffc107', wrong: '#f44336',
};

const cleanWord = (w: string) => w.replace(/[^a-záéíóúüñ]/gi, '').toLowerCase();

function charSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length < b.length ? a : b;
  let matches = 0;
  for (const ch of shorter) { if (longer.includes(ch)) matches++; }
  return matches / longer.length;
}

function computeWordStates(paraWords: string[], tokens: string[], prevStates: WordState[]): WordState[] {
  const states: WordState[] = [...prevStates]; // preserve already-colored words
  let tIdx = 0;

  for (let pIdx = 0; pIdx < paraWords.length; pIdx++) {
    if (tIdx >= tokens.length) break;
    // never go back — skip already colored words
    if (states[pIdx] !== 'pending') {
      // advance transcript pointer to stay in sync
      const pw = cleanWord(paraWords[pIdx]);
      if (pw && tIdx < tokens.length && charSimilarity(pw, cleanWord(tokens[tIdx])) >= 0.55) tIdx++;
      continue;
    }
    const pw = cleanWord(paraWords[pIdx]);
    if (!pw) { states[pIdx] = 'correct'; continue; }
    let bestScore = 0, bestTIdx = tIdx;
    for (let w = 0; w < 4 && tIdx + w < tokens.length; w++) {
      const score = charSimilarity(pw, cleanWord(tokens[tIdx + w]));
      if (score > bestScore) { bestScore = score; bestTIdx = tIdx + w; }
    }
    if (bestScore >= 0.85)      { states[pIdx] = 'correct'; tIdx = bestTIdx + 1; }
    else if (bestScore >= 0.55) { states[pIdx] = 'partial'; tIdx = bestTIdx + 1; }
    else                        { states[pIdx] = 'wrong';   tIdx++; }
  }
  return states;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  paragraph: LecturaParagraph;
  uiLanguage: Language;
  targetLanguage: string;
  sttAvailable: boolean;
  language: string;
  onComplete: (result: ActivityResult) => void;
  onExit: () => void;
}

type Phase = 'ready' | 'previewing' | 'recording' | 'result';

// ─── Component ────────────────────────────────────────────────────────────────
export const LecturaActivity: React.FC<Props> = ({
  paragraph, uiLanguage, targetLanguage, language, onComplete, onExit,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;
  const paraWords = useRef<string[]>(paragraph.text.split(/\s+/)).current;

  const [phase, setPhase]         = useState<Phase>('ready');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [wpm, setWpm]             = useState(0);
  const [wordStates, setWordStates] = useState<WordState[]>(
    () => new Array(paraWords.length).fill('pending')
  );

  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef    = useRef(0);
  const activityStart   = useRef(Date.now());
  const latestTranscript = useRef('');
  const listenersRef    = useRef<(() => void)[]>([]);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const removeListeners = () => {
    listenersRef.current.forEach(fn => fn());
    listenersRef.current = [];
  };

  useEffect(() => () => {
    Speech.stop();
    clearTimer();
    removeListeners();
    getStt()?.stop?.();
  }, []);

  // ── Preview ───────────────────────────────────────────────────────────────
  const previewListen = () => {
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); setPhase('ready'); return; }
    setIsSpeaking(true);
    setPhase('previewing');
    Speech.speak(paragraph.text, {
      language: targetLanguage,
      onDone: () => { setIsSpeaking(false); setPhase('ready'); },
      onError: () => { setIsSpeaking(false); setPhase('ready'); },
    });
  };

  // ── Start ─────────────────────────────────────────────────────────────────
  const startReading = async () => {
    const stt = getStt();
    if (!stt) { Alert.alert(t.noStt); return; }

    const { granted } = await stt.requestPermissionsAsync();
    if (!granted) { Alert.alert(t.noMicPermission); return; }

    Speech.stop();
    setWordStates(new Array(paraWords.length).fill('pending'));
    latestTranscript.current = '';
    setPhase('recording');
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Register event listeners via addListener
    removeListeners();
    try {
      const m = require('expo-speech-recognition');
      const r1 = m.ExpoSpeechRecognitionModule.addListener('result', (e: any) => {
        const transcript: string = e.results?.[0]?.transcript ?? '';
        latestTranscript.current = transcript;
        const tokens = transcript.trim().split(/\s+/).filter(Boolean);
        setWordStates(prev => computeWordStates(paraWords, tokens, prev));
      });
      const r2 = m.ExpoSpeechRecognitionModule.addListener('end', () => {
        // auto-restart on silence to keep listening
        if (phase === 'recording') {
          stt.start({ lang: targetLanguage, interimResults: true, continuous: true });
        }
      });
      listenersRef.current = [() => r1?.remove?.(), () => r2?.remove?.()];
    } catch { /* ignore */ }

    stt.start({ lang: targetLanguage, interimResults: true, continuous: true });
  };

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stopReading = () => {
    clearTimer();
    removeListeners();
    getStt()?.stop?.();
    const elapsedSec = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    setElapsed(elapsedSec);
    const tokens = latestTranscript.current.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) setWordStates(prev => computeWordStates(paraWords, tokens, prev));
    setWpm(calculateWPM(paragraph.wordCount, elapsedSec));
    setPhase('result');
  };

  const retry = () => {
    setPhase('ready'); setElapsed(0); setWpm(0);
    setWordStates(new Array(paraWords.length).fill('pending'));
    latestTranscript.current = '';
  };

  const finish = () => {
    const duration = Math.round((Date.now() - activityStart.current) / 1000);
    const label = wpmLabel(wpm);
    onComplete({
      id: Date.now().toString(), activityType: 'lectura', language,
      completedAt: new Date().toISOString(),
      score: label === 'Fluido' ? 100 : label === 'Rápido' ? 80 : 50,
      durationSeconds: duration,
    });
  };

  const label      = wpmLabel(wpm);
  const labelColor = label === 'Fluido' ? '#4caf50' : label === 'Rápido' ? '#2196f3' : '#ff9800';
  const labelText  = label === 'Fluido' ? t.fluent   : label === 'Rápido' ? t.fast    : t.slow;
  const correctCount = wordStates.filter(s => s === 'correct').length;
  const partialCount = wordStates.filter(s => s === 'partial').length;
  const wrongCount   = wordStates.filter(s => s === 'wrong').length;

  return (
    <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sub, { color: colors.text2 }]}>{t.sub}</Text>

      <View style={[styles.paraCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {phase === 'recording' && (
          <Text style={[styles.hint, { color: colors.text2 }]}>{t.readingHint}</Text>
        )}
        <Text style={[styles.paraText, { color: colors.text }]}>
          {paraWords.map((word, i) => {
            const state = wordStates[i];
            const color = state === 'pending' ? colors.text : WORD_COLORS[state];
            return (
              <Text key={i} style={{ color, fontWeight: state !== 'pending' ? '700' : '400' }}>
                {word}{' '}
              </Text>
            );
          })}
        </Text>
      </View>

      {phase === 'ready' && (
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: isSpeaking ? '#ff9800' : colors.primary }]}
            onPress={previewListen}
          >
            <Text style={styles.btnText}>{isSpeaking ? t.stopListenBtn : t.listenBtn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={startReading}>
            <Text style={styles.btnText}>{t.startBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'previewing' && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#ff9800' }]} onPress={previewListen}>
          <Text style={styles.btnText}>{t.stopListenBtn}</Text>
        </TouchableOpacity>
      )}

      {phase === 'recording' && (
        <View style={styles.btnGroup}>
          <View style={[styles.timerBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.timerText, { color: colors.primary }]}>⏱ {elapsed}s</Text>
          </View>
          <View style={styles.legend}>
            {(['correct', 'partial', 'wrong'] as WordState[]).map(st => (
              <View key={st} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: WORD_COLORS[st] }]} />
                <Text style={[styles.legendLabel, { color: colors.text2 }]}>
                  {st === 'correct' ? 'Correcto' : st === 'partial' ? 'Dudoso' : 'Incorrecto'}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#f44336' }]} onPress={stopReading}>
            <Text style={styles.btnText}>{t.stopBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'result' && (
        <View style={styles.resultArea}>
          <View style={[styles.wpmBox, { backgroundColor: colors.surface, borderColor: labelColor }]}>
            <Text style={[styles.wpmNum, { color: labelColor }]}>{wpm}</Text>
            <Text style={[styles.wpmLabelText, { color: colors.text2 }]}>{t.wpmLabel}</Text>
            <Text style={[styles.wpmTag, { color: labelColor }]}>{labelText}</Text>
          </View>
          <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#4caf50' }]}>{correctCount}</Text>
              <Text style={[styles.statLabel, { color: colors.text2 }]}>✓ Correctas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#ffc107' }]}>{partialCount}</Text>
              <Text style={[styles.statLabel, { color: colors.text2 }]}>~ Dudosas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#f44336' }]}>{wrongCount}</Text>
              <Text style={[styles.statLabel, { color: colors.text2 }]}>✗ Incorrectas</Text>
            </View>
          </View>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border, flex: 1 }]} onPress={retry}>
              <Text style={[styles.btnText, { color: colors.text }]}>{t.retryBtn}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50', flex: 1 }]} onPress={finish}>
              <Text style={styles.btnText}>{t.doneBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: { padding: s(20), gap: s(14), flexGrow: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: s(18), fontWeight: '800' },
  sub: { fontSize: s(13), lineHeight: s(20) },
  exitBtn: { fontSize: s(20), padding: s(4) },
  hint: { fontSize: s(11), marginBottom: s(8), fontStyle: 'italic' },
  paraCard: { padding: s(16), borderRadius: s(14), borderWidth: 1 },
  paraText: { fontSize: s(16), lineHeight: s(32), flexWrap: 'wrap' },
  btnGroup: { gap: s(10) },
  btn: { padding: s(14), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  timerBox: { padding: s(12), borderRadius: s(10), alignItems: 'center' },
  timerText: { fontSize: s(20), fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: s(16) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  legendDot: { width: s(10), height: s(10), borderRadius: s(5) },
  legendLabel: { fontSize: s(11) },
  resultArea: { gap: s(12) },
  wpmBox: { padding: s(20), borderRadius: s(14), borderWidth: 2, alignItems: 'center', gap: s(4) },
  wpmNum: { fontSize: s(48), fontWeight: '800' },
  wpmLabelText: { fontSize: s(13) },
  wpmTag: { fontSize: s(18), fontWeight: '700' },
  statsRow: { flexDirection: 'row', borderRadius: s(12), borderWidth: 1, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', padding: s(12), gap: s(2) },
  statNum: { fontSize: s(22), fontWeight: '800' },
  statLabel: { fontSize: s(11) },
  rowBtns: { flexDirection: 'row', gap: s(10) },
});
