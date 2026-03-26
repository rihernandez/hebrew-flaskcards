/**
 * AcentoActivity — Detector de Acento
 * El app pronuncia una palabra; el usuario la repite.
 * Compara fonéticamente el transcript con la palabra original
 * y da un score de similitud 0-100%.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { PronunciacionItem } from '../utils/speakingContent';
import { ActivityResult } from '../utils/activityResults';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

let _stt: any = null;
function getStt() {
  if (_stt !== null) return _stt;
  try { const m = require('expo-speech-recognition'); _stt = m?.ExpoSpeechRecognitionModule ?? false; }
  catch { _stt = false; }
  return _stt || null;
}

// ── Phonetic similarity ───────────────────────────────────────────────────────
// Simplified phonetic normalization for Spanish/Hebrew
function phoneticNormalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z\u05d0-\u05ea\s]/g, '') // keep letters only
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function phoneticScore(original: string, transcript: string): number {
  const a = phoneticNormalize(original);
  const b = phoneticNormalize(transcript);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

function scoreColor(score: number): string {
  if (score >= 80) return '#4caf50';
  if (score >= 55) return '#ffc107';
  return '#f44336';
}

function scoreEmoji(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 55) return '🟡';
  return '🔴';
}

// ── i18n ──────────────────────────────────────────────────────────────────────
const L: Record<Language, {
  title: string; sub: string; listenBtn: string; recordBtn: string; stopBtn: string;
  scoreLabel: string; nativeScore: string; next: string; done: string; retry: string;
  summaryTitle: string; of: string; avgScore: string;
  noMic: string; noStt: string; tapListen: string; nowSpeak: string;
  perfect: string; good: string; needsWork: string;
}> = {
  he: {
    title: '🎯 גלאי מבטא', sub: 'האזן למילה וחזור עליה — קבל ציון דמיון לדובר מקורי',
    listenBtn: '🔊 האזן למילה', recordBtn: '🎤 אמור את המילה', stopBtn: '⏹ עצור',
    scoreLabel: 'ציון הגייה', nativeScore: 'דמיון לדובר מקורי',
    next: 'הבא →', done: 'סיום ✓', retry: '↺ נסה שוב',
    summaryTitle: '🎉 סיימת!', of: 'מתוך', avgScore: 'ציון ממוצע',
    noMic: 'נדרשת הרשאת מיקרופון', noStt: 'זיהוי דיבור אינו זמין',
    tapListen: 'לחץ להאזנה למילה', nowSpeak: 'עכשיו אמור את המילה',
    perfect: 'מצוין! הגייה מושלמת', good: 'טוב! המשך להתאמן', needsWork: 'צריך תרגול נוסף',
  },
  es: {
    title: '🎯 Detector de Acento', sub: 'Escucha la palabra y repítela — recibe un score de similitud',
    listenBtn: '🔊 Escuchar palabra', recordBtn: '🎤 Decir la palabra', stopBtn: '⏹ Detener',
    scoreLabel: 'Score de pronunciación', nativeScore: 'Similitud con hablante nativo',
    next: 'Siguiente →', done: 'Finalizar ✓', retry: '↺ Reintentar',
    summaryTitle: '🎉 ¡Terminaste!', of: 'de', avgScore: 'Score promedio',
    noMic: 'Se necesita permiso de micrófono', noStt: 'Reconocimiento de voz no disponible',
    tapListen: 'Toca para escuchar la palabra', nowSpeak: 'Ahora di la palabra',
    perfect: '¡Perfecto! Pronunciación excelente', good: '¡Bien! Sigue practicando', needsWork: 'Necesita más práctica',
  },
  en: {
    title: '🎯 Accent Detector', sub: 'Listen to the word and repeat it — get a similarity score',
    listenBtn: '🔊 Listen to word', recordBtn: '🎤 Say the word', stopBtn: '⏹ Stop',
    scoreLabel: 'Pronunciation score', nativeScore: 'Similarity to native speaker',
    next: 'Next →', done: 'Finish ✓', retry: '↺ Retry',
    summaryTitle: '🎉 Done!', of: 'of', avgScore: 'Average score',
    noMic: 'Microphone permission required', noStt: 'Speech recognition not available',
    tapListen: 'Tap to listen to the word', nowSpeak: 'Now say the word',
    perfect: 'Perfect! Excellent pronunciation', good: 'Good! Keep practicing', needsWork: 'Needs more practice',
  },
};

type Phase = 'idle' | 'listening' | 'awaiting' | 'recording' | 'result' | 'summary';

interface Props {
  items: PronunciacionItem[];
  uiLanguage: Language;
  language: string;
  onComplete: (result: ActivityResult) => void;
  onExit: () => void;
}

export const AcentoActivity: React.FC<Props> = ({
  items, uiLanguage, language, onComplete, onExit,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const isHebrew = language === 'Hebreo' || language === 'Hebrew';
  const ttsLocale = isHebrew ? 'he-IL' : 'es-ES';
  const sttLocale = ttsLocale;

  const [index, setIndex]       = useState(0);
  const [phase, setPhase]       = useState<Phase>('idle');
  const [score, setScore]       = useState(0);
  const [transcript, setTranscript] = useState('');
  const [scores, setScores]     = useState<number[]>([]);
  const listenersRef = useRef<(() => void)[]>([]);
  const activityStart = useRef(Date.now());

  const current = items[index];

  useEffect(() => () => {
    Speech.stop();
    removeListeners();
    getStt()?.stop?.();
  }, []);

  const removeListeners = () => { listenersRef.current.forEach(fn => fn()); listenersRef.current = []; };

  const listenWord = () => {
    setPhase('listening');
    Speech.speak(current.word, {
      language: ttsLocale,
      rate: 0.8,
      onDone: () => setPhase('awaiting'),
      onError: () => setPhase('awaiting'),
    });
  };

  const startRecording = async () => {
    const stt = getStt();
    if (!stt) { setPhase('result'); setScore(0); return; }
    const { granted } = await stt.requestPermissionsAsync();
    if (!granted) { Alert.alert(t.noMic); return; }

    setTranscript('');
    setPhase('recording');
    removeListeners();

    try {
      const m = require('expo-speech-recognition');
      const r1 = m.ExpoSpeechRecognitionModule.addListener('result', (e: any) => {
        const text: string = e.results?.[0]?.transcript ?? '';
        setTranscript(text);
        getStt()?.stop?.();
        removeListeners();
        const s = phoneticScore(current.word, text);
        setScore(s);
        setScores(prev => [...prev, s]);
        setPhase('result');
      });
      const r2 = m.ExpoSpeechRecognitionModule.addListener('error', () => {
        removeListeners();
        setScore(0);
        setScores(prev => [...prev, 0]);
        setPhase('result');
      });
      listenersRef.current = [() => r1?.remove?.(), () => r2?.remove?.()];
    } catch {
      setScore(0);
      setPhase('result');
      return;
    }

    stt.start({ lang: sttLocale, interimResults: false, continuous: false });
  };

  const advance = () => {
    const next = index + 1;
    if (next >= items.length) { setPhase('summary'); return; }
    setIndex(next);
    setPhase('idle');
    setTranscript('');
    setScore(0);
  };

  const finish = () => {
    const duration = Math.round((Date.now() - activityStart.current) / 1000);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    onComplete({
      id: Date.now().toString(), activityType: 'acento' as any,
      language, completedAt: new Date().toISOString(),
      score: avg, durationSeconds: duration,
    });
  };

  if (phase === 'summary') {
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>{scoreEmoji(avg)}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.summaryTitle}</Text>
          <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: scoreColor(avg) }]}>
            <Text style={[styles.scoreNum, { color: scoreColor(avg) }]}>{avg}%</Text>
            <Text style={[styles.scoreSub, { color: colors.text2 }]}>{t.avgScore}</Text>
            <Text style={[styles.scoreMsg, { color: scoreColor(avg) }]}>
              {avg >= 80 ? t.perfect : avg >= 55 ? t.good : t.needsWork}
            </Text>
          </View>
          {/* Per-word breakdown */}
          <View style={[styles.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {items.slice(0, scores.length).map((item, i) => (
              <View key={i} style={styles.breakdownRow}>
                <Text style={[styles.breakdownWord, { color: colors.text }]}>{item.word}</Text>
                <View style={[styles.breakdownBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.breakdownFill, { width: `${scores[i]}%` as any, backgroundColor: scoreColor(scores[i]) }]} />
                </View>
                <Text style={[styles.breakdownScore, { color: scoreColor(scores[i]) }]}>{scores[i]}%</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={finish}>
            <Text style={styles.btnText}>{t.done}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!current) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sub, { color: colors.text2 }]}>{t.sub}</Text>
      <Text style={[styles.counter, { color: colors.text2 }]}>{index + 1} {t.of} {items.length}</Text>

      {/* Word card */}
      <View style={[styles.wordCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
        <Text style={[styles.wordText, { color: colors.text }]}>{current.word}</Text>
        <Text style={[styles.translation, { color: colors.text2 }]}>{current.translation}</Text>
      </View>

      {/* Score gauge — shown after result */}
      {phase === 'result' && (
        <View style={styles.gaugeArea}>
          <Text style={[styles.gaugeNum, { color: scoreColor(score) }]}>{score}%</Text>
          <Text style={[styles.gaugeLabel, { color: colors.text2 }]}>{t.nativeScore}</Text>
          <View style={[styles.gaugeBg, { backgroundColor: colors.border }]}>
            <View style={[styles.gaugeFill, { width: `${score}%` as any, backgroundColor: scoreColor(score) }]} />
          </View>
          {transcript !== '' && (
            <Text style={[styles.transcript, { color: colors.text2 }]}>"{transcript}"</Text>
          )}
          <Text style={[styles.scoreMsg, { color: scoreColor(score) }]}>
            {score >= 80 ? t.perfect : score >= 55 ? t.good : t.needsWork}
          </Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.btnArea}>
        {phase === 'idle' && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={listenWord}>
            <Text style={styles.btnText}>{t.listenBtn}</Text>
          </TouchableOpacity>
        )}

        {phase === 'listening' && (
          <View style={[styles.statusBox, { backgroundColor: colors.surface }]}>
            <Text style={styles.statusEmoji}>🔊</Text>
            <Text style={[styles.statusLabel, { color: colors.text2 }]}>Reproduciendo...</Text>
          </View>
        )}

        {phase === 'awaiting' && (
          <View style={styles.btnGroup}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={startRecording}>
              <Text style={styles.btnText}>{t.recordBtn}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.border }]} onPress={listenWord}>
              <Text style={[styles.btnOutlineText, { color: colors.text2 }]}>{t.listenBtn}</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'recording' && (
          <View style={[styles.statusBox, { backgroundColor: colors.surface }]}>
            <Text style={styles.statusEmoji}>🔴</Text>
            <Text style={[styles.statusLabel, { color: colors.text2 }]}>Grabando...</Text>
          </View>
        )}

        {phase === 'result' && (
          <View style={styles.btnGroup}>
            <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.border }]} onPress={() => { setPhase('idle'); setScore(0); setTranscript(''); setScores(prev => prev.slice(0, -1)); }}>
              <Text style={[styles.btnOutlineText, { color: colors.text2 }]}>{t.retry}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={advance}>
              <Text style={styles.btnText}>{index + 1 >= items.length ? t.done : t.next}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: s(20), gap: s(14) },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: s(14), padding: s(12) },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: s(18), fontWeight: '800' },
  sub: { fontSize: s(13), lineHeight: s(20) },
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  exitBtn: { fontSize: s(20), padding: s(4) },
  wordCard: { padding: s(28), borderRadius: s(16), borderWidth: 1.5, alignItems: 'center', gap: s(8) },
  wordText: { fontSize: s(32), fontWeight: '800', textAlign: 'center' },
  translation: { fontSize: s(14), fontStyle: 'italic', textAlign: 'center' },
  gaugeArea: { alignItems: 'center', gap: s(6) },
  gaugeNum: { fontSize: s(52), fontWeight: '900' },
  gaugeLabel: { fontSize: s(12) },
  gaugeBg: { width: '100%', height: s(12), borderRadius: s(6), overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: s(6) },
  transcript: { fontSize: s(13), fontStyle: 'italic', textAlign: 'center' },
  scoreMsg: { fontSize: s(14), fontWeight: '700', textAlign: 'center' },
  btnArea: { marginTop: 'auto' as any, gap: s(10) },
  btnGroup: { gap: s(10) },
  statusBox: { padding: s(20), borderRadius: s(12), alignItems: 'center', gap: s(8) },
  statusEmoji: { fontSize: s(32) },
  statusLabel: { fontSize: s(14) },
  btn: { padding: s(16), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  btnOutline: { padding: s(14), borderRadius: s(12), alignItems: 'center', borderWidth: 1.5 },
  btnOutlineText: { fontSize: s(14), fontWeight: '600' },
  bigEmoji: { fontSize: s(56) },
  scoreBox: { padding: s(20), borderRadius: s(16), borderWidth: 2, alignItems: 'center', gap: s(6), width: '100%' },
  scoreNum: { fontSize: s(48), fontWeight: '800' },
  scoreSub: { fontSize: s(13) },
  breakdown: { width: '100%', padding: s(14), borderRadius: s(12), borderWidth: 1, gap: s(8) },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  breakdownWord: { width: s(80), fontSize: s(13), fontWeight: '600' },
  breakdownBar: { flex: 1, height: s(8), borderRadius: s(4), overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: s(4) },
  breakdownScore: { width: s(36), fontSize: s(12), fontWeight: '700', textAlign: 'right' },
});
