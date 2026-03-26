/**
 * TraduccionActivity — Traducción Oral con voz
 * - Muestra frase en idioma nativo
 * - Usuario la pronuncia en el idioma objetivo
 * - 3 intentos por frase, con indicadores ❌
 * - Palabras falladas se guardan para repetición inteligente
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Alert, Animated,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { TranslationPair } from '../utils/speakingContent';
import { ActivityResult } from '../utils/activityResults';
import { keywordScore } from '../utils/activityUtils';
import { stateApi } from '../utils/stateApi';

// expo-speech-recognition loads dynamically — safe in Expo Go
let _stt: any = null;
function getStt() {
  if (_stt !== null) return _stt;
  try {
    const m = require('expo-speech-recognition');
    _stt = m?.ExpoSpeechRecognitionModule ?? false;
  } catch { _stt = false; }
  return _stt || null;
}

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const MAX_ATTEMPTS = 3;
const ERRORS_KEY = 'traduccion_errors';

// ─── i18n ─────────────────────────────────────────────────────────────────────
const L: Record<Language, {
  title: string; sub: string;
  tapToSpeak: string; listening: string; stopBtn: string;
  correct: string; tryAgain: string; noMoreTries: string;
  modelAnswer: string; next: string;
  summaryTitle: string; done: string; of: string;
  correctLabel: string; incorrectLabel: string;
  attemptsLeft: string; noMicPermission: string;
  listenExample: string;
}> = {
  he: {
    title: '🔄 תרגום בעל פה', sub: 'ראה ביטוי בעברית ואמר אותו בספרדית',
    tapToSpeak: '🎤 לחץ לדיבור', listening: '🔴 מקשיב...', stopBtn: '⏹ עצור',
    correct: '✅ כל הכבוד!', tryAgain: '❌ נסה שוב', noMoreTries: '❌ עברת את מגבלת הניסיונות',
    modelAnswer: 'תשובה לדוגמה:', next: 'הבא →',
    summaryTitle: '🎉 סיימת!', done: 'סיום ✓', of: 'מתוך',
    correctLabel: 'נכון', incorrectLabel: 'שגוי',
    attemptsLeft: 'ניסיונות שנותרו', noMicPermission: 'נדרשת הרשאת מיקרופון',
    listenExample: '🔊 האזן',
  },
  es: {
    title: '🔄 Traducción Oral', sub: 'Ve la frase en hebreo y dila en español',
    tapToSpeak: '🎤 Toca para hablar', listening: '🔴 Escuchando...', stopBtn: '⏹ Detener',
    correct: '✅ ¡Muy bien!', tryAgain: '❌ Inténtalo de nuevo', noMoreTries: '❌ Sin más intentos',
    modelAnswer: 'Respuesta modelo:', next: 'Siguiente →',
    summaryTitle: '🎉 ¡Terminaste!', done: 'Finalizar ✓', of: 'de',
    correctLabel: 'Correctas', incorrectLabel: 'Incorrectas',
    attemptsLeft: 'intentos restantes', noMicPermission: 'Se necesita permiso de micrófono',
    listenExample: '🔊 Escuchar',
  },
  en: {
    title: '🔄 Oral Translation', sub: 'See the phrase in Hebrew and say it in Spanish',
    tapToSpeak: '🎤 Tap to speak', listening: '🔴 Listening...', stopBtn: '⏹ Stop',
    correct: '✅ Well done!', tryAgain: '❌ Try again', noMoreTries: '❌ No more attempts',
    modelAnswer: 'Model answer:', next: 'Next →',
    summaryTitle: '🎉 Done!', done: 'Finish ✓', of: 'of',
    correctLabel: 'Correct', incorrectLabel: 'Incorrect',
    attemptsLeft: 'attempts left', noMicPermission: 'Microphone permission required',
    listenExample: '🔊 Listen',
  },
};

type ItemPhase = 'idle' | 'listening' | 'correct' | 'failed';

interface Props {
  items: TranslationPair[];
  uiLanguage: Language;
  targetLanguage: string;
  sttAvailable: boolean;
  language: string;
  onComplete: (result: ActivityResult) => void;
  onExit: () => void;
}

export const TraduccionActivity: React.FC<Props> = ({
  items, uiLanguage, targetLanguage, language, onComplete, onExit,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const [index, setIndex]           = useState(0);
  const [phase, setPhase]           = useState<ItemPhase>('idle');
  const [attempts, setAttempts]     = useState(0);       // intentos fallidos en item actual
  const [transcript, setTranscript] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [failedItems, setFailedItems]   = useState<TranslationPair[]>([]);
  const [showSummary, setShowSummary]   = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const startTime = useRef(Date.now());

  const current = items[index];

  const listenersRef = useRef<(() => void)[]>([]);
  const removeListeners = () => { listenersRef.current.forEach(fn => fn()); listenersRef.current = []; };

  useEffect(() => () => { removeListeners(); getStt()?.stop?.(); }, []);

  const registerListeners = (onResult: (text: string) => void) => {
    removeListeners();
    try {
      const m = require('expo-speech-recognition');
      const r1 = m.ExpoSpeechRecognitionModule.addListener('result', (e: any) => {
        const text: string = e.results?.[0]?.transcript ?? '';
        getStt()?.stop?.();
        setPhase('idle');
        onResult(text);
      });
      const r2 = m.ExpoSpeechRecognitionModule.addListener('error', () => setPhase('idle'));
      listenersRef.current = [() => r1?.remove?.(), () => r2?.remove?.()];
    } catch { /* ignore */ }
  };

  // ── Shake animation for wrong answer ─────────────────────────────────────
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ── Check answer ──────────────────────────────────────────────────────────
  const checkAnswer = (text: string) => {
    const score = keywordScore(text, current.keywords);
    if (score >= 0.6) {
      setPhase('correct');
      setCorrectCount(c => c + 1);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      shake();
      if (newAttempts >= MAX_ATTEMPTS) {
        setPhase('failed');
        setFailedItems(f => [...f, current]);
      }
      // else stays idle — user can try again
    }
  };

  // ── Start listening ───────────────────────────────────────────────────────
  const startListening = async () => {
    const stt = getStt();
    if (!stt) { Alert.alert(t.noMicPermission); return; }
    const { granted } = await stt.requestPermissionsAsync();
    if (!granted) { Alert.alert(t.noMicPermission); return; }
    setTranscript('');
    setPhase('listening');
    registerListeners((text) => { setTranscript(text); checkAnswer(text); });
    stt.start({ lang: targetLanguage, interimResults: false, continuous: false });
  };

  const stopListening = () => {
    getStt()?.stop?.();
    setPhase('idle');
  };

  // ── Listen to example ─────────────────────────────────────────────────────
  const listenExample = () => {
    Speech.speak(current.targetText, { language: targetLanguage });
  };

  // ── Advance to next item ──────────────────────────────────────────────────
  const advance = async () => {
    const next = index + 1;
    if (next >= items.length) {
      // Save failed items for spaced repetition
      if (failedItems.length > 0) {
        const existing = await stateApi.get<TranslationPair[]>('learning-state', ERRORS_KEY, []);
        const existingKeys = new Set(existing.map(i => i.sourceText));
        const toAdd = failedItems.filter(i => !existingKeys.has(i.sourceText));
        await stateApi.set('learning-state', ERRORS_KEY, [...existing, ...toAdd]);
      }
      setShowSummary(true);
      return;
    }
    setIndex(next);
    setPhase('idle');
    setAttempts(0);
    setTranscript('');
  };

  // ── Finish ────────────────────────────────────────────────────────────────
  const finish = () => {
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    onComplete({
      id: Date.now().toString(),
      activityType: 'traduccion',
      language,
      completedAt: new Date().toISOString(),
      score: Math.round((correctCount / items.length) * 100),
      durationSeconds: duration,
    });
  };

  // ── Summary screen ────────────────────────────────────────────────────────
  if (showSummary) {
    const incorrect = items.length - correctCount;
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>🎉</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.summaryTitle}</Text>
          <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>
              {correctCount}/{items.length}
            </Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryItem, { color: '#4caf50' }]}>✅ {correctCount} {t.correctLabel}</Text>
              <Text style={[styles.summaryItem, { color: '#f44336' }]}>❌ {incorrect} {t.incorrectLabel}</Text>
            </View>
            {failedItems.length > 0 && (
              <Text style={[styles.savedNote, { color: colors.text2 }]}>
                🔁 {failedItems.length} guardadas para repetición
              </Text>
            )}
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={finish}>
            <Text style={styles.btnText}>{t.done}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!current) return null;

  const attemptsLeft = MAX_ATTEMPTS - attempts;
  const isCorrect = phase === 'correct';
  const isFailed  = phase === 'failed';
  const isDone    = isCorrect || isFailed;

  return (
    <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sub, { color: colors.text2 }]}>{t.sub}</Text>

      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={[styles.counter, { color: colors.text2 }]}>
          {index + 1} {t.of} {items.length}
        </Text>
        <View style={styles.dotsRow}>
          {items.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < index
                    ? (failedItems.some(f => f.sourceText === items[i].sourceText) ? '#f44336' : '#4caf50')
                    : i === index ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Source phrase */}
      <Animated.View
        style={[
          styles.sourceCard,
          { backgroundColor: colors.primary + '15', borderColor: colors.primary },
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <Text style={[styles.sourceText, { color: colors.text }]}>{current.sourceText}</Text>
      </Animated.View>

      {/* Attempt indicators */}
      {!isDone && (
        <View style={styles.attemptsRow}>
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <Text key={i} style={styles.attemptDot}>
              {i < attempts ? '❌' : '⬜'}
            </Text>
          ))}
          <Text style={[styles.attemptsLabel, { color: colors.text2 }]}>
            {attemptsLeft} {t.attemptsLeft}
          </Text>
        </View>
      )}

      {/* Transcript feedback */}
      {transcript !== '' && !isDone && (
        <View style={[styles.transcriptBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.transcriptText, { color: colors.text2 }]}>"{transcript}"</Text>
        </View>
      )}

      {/* Controls */}
      {!isDone && (
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.btn, {
              backgroundColor: phase === 'listening' ? '#f44336' : '#4caf50',
            }]}
            onPress={phase === 'listening' ? stopListening : startListening}
          >
            <Text style={styles.btnText}>
              {phase === 'listening' ? t.stopBtn : t.tapToSpeak}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnOutline, { borderColor: colors.border }]}
            onPress={listenExample}
          >
            <Text style={[styles.btnOutlineText, { color: colors.text2 }]}>{t.listenExample}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Result */}
      {isDone && (
        <View style={styles.resultArea}>
          <Text style={[styles.feedback, { color: isCorrect ? '#4caf50' : '#f44336' }]}>
            {isCorrect ? t.correct : t.noMoreTries}
          </Text>
          <View style={[styles.modelBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modelLabel, { color: colors.text2 }]}>{t.modelAnswer}</Text>
            <Text style={[styles.modelText, { color: colors.text }]}>{current.targetText}</Text>
            <TouchableOpacity onPress={listenExample} style={styles.listenSmall}>
              <Text style={[styles.listenSmallText, { color: colors.primary }]}>🔊</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={advance}>
            <Text style={styles.btnText}>
              {index + 1 >= items.length ? t.done : t.next}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: s(32), gap: s(16) },
  card: { padding: s(20), gap: s(14), flexGrow: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: s(18), fontWeight: '800' },
  sub: { fontSize: s(13), lineHeight: s(20) },
  exitBtn: { fontSize: s(20), padding: s(4) },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: s(12) },
  dotsRow: { flexDirection: 'row', gap: s(4) },
  dot: { width: s(8), height: s(8), borderRadius: s(4) },
  sourceCard: { padding: s(24), borderRadius: s(16), borderWidth: 1.5, alignItems: 'center' },
  sourceText: { fontSize: s(22), fontWeight: '700', textAlign: 'center', lineHeight: s(32) },
  attemptsRow: { flexDirection: 'row', alignItems: 'center', gap: s(8), justifyContent: 'center' },
  attemptDot: { fontSize: s(18) },
  attemptsLabel: { fontSize: s(12) },
  transcriptBox: { padding: s(12), borderRadius: s(10) },
  transcriptText: { fontSize: s(13), fontStyle: 'italic', textAlign: 'center' },
  btnGroup: { gap: s(10) },
  btn: { padding: s(16), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  btnOutline: { padding: s(12), borderRadius: s(12), alignItems: 'center', borderWidth: 1.5 },
  btnOutlineText: { fontSize: s(14), fontWeight: '600' },
  resultArea: { gap: s(12) },
  feedback: { fontSize: s(20), fontWeight: '800', textAlign: 'center' },
  modelBox: { padding: s(16), borderRadius: s(12), borderWidth: 1, gap: s(6) },
  modelLabel: { fontSize: s(12) },
  modelText: { fontSize: s(16), fontWeight: '600', lineHeight: s(24) },
  listenSmall: { alignSelf: 'flex-start' },
  listenSmallText: { fontSize: s(20) },
  bigEmoji: { fontSize: s(56), textAlign: 'center' },
  scoreBox: { padding: s(24), borderRadius: s(16), borderWidth: 1, alignItems: 'center', gap: s(10), width: '100%' },
  scoreNum: { fontSize: s(48), fontWeight: '800' },
  summaryRow: { gap: s(6), alignItems: 'center' },
  summaryItem: { fontSize: s(15), fontWeight: '600' },
  savedNote: { fontSize: s(12), fontStyle: 'italic', textAlign: 'center' },
});
