/**
 * VelocimetroActivity — Velocímetro de habla en tiempo real
 * El usuario habla libremente; una barra animada muestra WPM en vivo.
 * Verde = fluido, amarillo = lento, rojo = muy rápido o muy lento.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { ActivityResult } from '../utils/activityResults';
import { calculateWPM } from '../utils/activityUtils';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

let _stt: any = null;
function getStt() {
  if (_stt !== null) return _stt;
  try { const m = require('expo-speech-recognition'); _stt = m?.ExpoSpeechRecognitionModule ?? false; }
  catch { _stt = false; }
  return _stt || null;
}

const FLUENT_MIN = 80;
const FLUENT_MAX = 160;
const SESSION_SECS = 60;

const L: Record<Language, {
  title: string; sub: string; startBtn: string; stopBtn: string;
  slow: string; fluent: string; fast: string; wpmLabel: string;
  wordsLabel: string; timeLabel: string; resultTitle: string;
  done: string; retry: string; hint: string; noMic: string; noStt: string;
  tip: string;
}> = {
  he: {
    title: '⚡ מד מהירות דיבור', sub: 'דבר בחופשיות ומדוד את קצב הדיבור שלך',
    startBtn: '▶ התחל לדבר', stopBtn: '⏹ עצור',
    slow: 'איטי', fluent: 'שוטף', fast: 'מהיר מדי',
    wpmLabel: 'מילים לדקה', wordsLabel: 'מילים', timeLabel: 'שניות',
    resultTitle: 'תוצאות', done: 'סיום ✓', retry: '↺ נסה שוב',
    hint: 'דבר בחופשיות — הסרגל ישתנה בזמן אמת',
    noMic: 'נדרשת הרשאת מיקרופון', noStt: 'זיהוי דיבור אינו זמין',
    tip: 'קצב אידיאלי: 80–160 מילים לדקה',
  },
  es: {
    title: '⚡ Velocímetro de Habla', sub: 'Habla libremente y mide tu velocidad',
    startBtn: '▶ Empezar a hablar', stopBtn: '⏹ Detener',
    slow: 'Lento', fluent: 'Fluido', fast: 'Muy rápido',
    wpmLabel: 'palabras por minuto', wordsLabel: 'palabras', timeLabel: 'segundos',
    resultTitle: 'Resultados', done: 'Finalizar ✓', retry: '↺ Reintentar',
    hint: 'Habla libremente — la barra cambia en tiempo real',
    noMic: 'Se necesita permiso de micrófono', noStt: 'Reconocimiento de voz no disponible',
    tip: 'Ritmo ideal: 80–160 palabras por minuto',
  },
  en: {
    title: '⚡ Speech Speedometer', sub: 'Speak freely and measure your speed',
    startBtn: '▶ Start speaking', stopBtn: '⏹ Stop',
    slow: 'Slow', fluent: 'Fluent', fast: 'Too fast',
    wpmLabel: 'words per minute', wordsLabel: 'words', timeLabel: 'seconds',
    resultTitle: 'Results', done: 'Finish ✓', retry: '↺ Retry',
    hint: 'Speak freely — the bar changes in real time',
    noMic: 'Microphone permission required', noStt: 'Speech recognition not available',
    tip: 'Ideal pace: 80–160 words per minute',
  },
};

type Phase = 'idle' | 'recording' | 'result';

interface Props {
  uiLanguage: Language;
  language: string;
  onComplete: (result: ActivityResult) => void;
  onExit: () => void;
}

function getWpmColor(wpm: number): string {
  if (wpm === 0) return '#9e9e9e';
  if (wpm < FLUENT_MIN) return '#ffc107';
  if (wpm <= FLUENT_MAX) return '#4caf50';
  return '#f44336';
}

function getWpmLabel(wpm: number, t: typeof L['es']): string {
  if (wpm === 0) return '—';
  if (wpm < FLUENT_MIN) return t.slow;
  if (wpm <= FLUENT_MAX) return t.fluent;
  return t.fast;
}

export const VelocimetroActivity: React.FC<Props> = ({
  uiLanguage, language, onComplete, onExit,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const [phase, setPhase]       = useState<Phase>('idle');
  const [elapsed, setElapsed]   = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [liveWpm, setLiveWpm]   = useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const listenersRef = useRef<(() => void)[]>([]);
  const activityStart = useRef(Date.now());

  const sttLocale = language === 'Hebreo' || language === 'Hebrew' ? 'he-IL' : 'es-ES';

  useEffect(() => () => { clearTimer(); removeListeners(); getStt()?.stop?.(); }, []);

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const removeListeners = () => { listenersRef.current.forEach(fn => fn()); listenersRef.current = []; };

  const animateBar = (wpm: number) => {
    const pct = Math.min(1, wpm / 200);
    Animated.spring(barAnim, { toValue: pct, useNativeDriver: false, speed: 12 }).start();
  };

  const start = async () => {
    const stt = getStt();
    if (!stt) { Alert.alert(t.noStt); return; }
    const { granted } = await stt.requestPermissionsAsync();
    if (!granted) { Alert.alert(t.noMic); return; }

    setWordCount(0); setLiveWpm(0); setElapsed(0);
    animateBar(0);
    setPhase('recording');
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(sec);
      if (sec >= SESSION_SECS) stop();
    }, 500);

    removeListeners();
    try {
      const m = require('expo-speech-recognition');
      const r1 = m.ExpoSpeechRecognitionModule.addListener('result', (e: any) => {
        const text: string = e.results?.[0]?.transcript ?? '';
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const sec = Math.max(1, (Date.now() - startTimeRef.current) / 1000);
        const wpm = Math.round((words / sec) * 60);
        setWordCount(words);
        setLiveWpm(wpm);
        animateBar(wpm);
      });
      const r2 = m.ExpoSpeechRecognitionModule.addListener('end', () => {
        // restart to keep listening continuously
        stt.start({ lang: sttLocale, interimResults: true, continuous: true });
      });
      listenersRef.current = [() => r1?.remove?.(), () => r2?.remove?.()];
    } catch { stop(); return; }

    stt.start({ lang: sttLocale, interimResults: true, continuous: true });
  };

  const stop = () => {
    clearTimer();
    removeListeners();
    getStt()?.stop?.();
    const sec = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    setElapsed(sec);
    setPhase('result');
  };

  const finish = () => {
    const duration = Math.round((Date.now() - activityStart.current) / 1000);
    const score = liveWpm >= FLUENT_MIN && liveWpm <= FLUENT_MAX ? 100
      : liveWpm > 0 ? 60 : 0;
    onComplete({
      id: Date.now().toString(), activityType: 'velocimetro' as any,
      language, completedAt: new Date().toISOString(),
      score, durationSeconds: duration,
    });
  };

  const wpmColor = getWpmColor(liveWpm);
  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sub, { color: colors.text2 }]}>{t.sub}</Text>

      {/* Big WPM display */}
      <View style={styles.wpmDisplay}>
        <Text style={[styles.wpmNum, { color: wpmColor }]}>{liveWpm}</Text>
        <Text style={[styles.wpmLabel, { color: colors.text2 }]}>{t.wpmLabel}</Text>
        <Text style={[styles.wpmStatus, { color: wpmColor }]}>{getWpmLabel(liveWpm, t)}</Text>
      </View>

      {/* Speedometer bar */}
      <View style={styles.barContainer}>
        {/* Zone markers */}
        <View style={styles.zoneRow}>
          <Text style={[styles.zoneLabel, { color: '#ffc107' }]}>{t.slow}</Text>
          <Text style={[styles.zoneLabel, { color: '#4caf50' }]}>{t.fluent}</Text>
          <Text style={[styles.zoneLabel, { color: '#f44336' }]}>{t.fast}</Text>
        </View>
        <View style={[styles.barBg, { backgroundColor: colors.border }]}>
          {/* Color zones */}
          <View style={[styles.zone, { left: 0, width: '40%', backgroundColor: '#ffc10733' }]} />
          <View style={[styles.zone, { left: '40%', width: '40%', backgroundColor: '#4caf5033' }]} />
          <View style={[styles.zone, { left: '80%', width: '20%', backgroundColor: '#f4433633' }]} />
          {/* Live indicator */}
          <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: wpmColor }]} />
        </View>
        <Text style={[styles.tip, { color: colors.text2 }]}>{t.tip}</Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{wordCount}</Text>
          <Text style={[styles.statLabel, { color: colors.text2 }]}>{t.wordsLabel}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{elapsed}</Text>
          <Text style={[styles.statLabel, { color: colors.text2 }]}>{t.timeLabel}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{SESSION_SECS - elapsed}s</Text>
          <Text style={[styles.statLabel, { color: colors.text2 }]}>restantes</Text>
        </View>
      </View>

      {phase === 'idle' && (
        <View style={styles.btnArea}>
          <Text style={[styles.hint, { color: colors.text2 }]}>{t.hint}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={start}>
            <Text style={styles.btnText}>{t.startBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'recording' && (
        <View style={styles.btnArea}>
          <View style={styles.recordingIndicator}>
            <Text style={styles.recordingDot}>🔴</Text>
            <Text style={[styles.recordingLabel, { color: colors.text2 }]}>Grabando...</Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#f44336' }]} onPress={stop}>
            <Text style={styles.btnText}>{t.stopBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'result' && (
        <View style={styles.btnArea}>
          <View style={[styles.resultBox, { backgroundColor: colors.surface, borderColor: wpmColor }]}>
            <Text style={[styles.resultWpm, { color: wpmColor }]}>{liveWpm}</Text>
            <Text style={[styles.resultLabel, { color: colors.text2 }]}>{t.wpmLabel}</Text>
            <Text style={[styles.resultStatus, { color: wpmColor }]}>{getWpmLabel(liveWpm, t)}</Text>
          </View>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border, flex: 1 }]}
              onPress={() => { setPhase('idle'); setLiveWpm(0); setWordCount(0); setElapsed(0); animateBar(0); }}>
              <Text style={[styles.btnText, { color: colors.text }]}>{t.retry}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50', flex: 1 }]} onPress={finish}>
              <Text style={styles.btnText}>{t.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: s(20), gap: s(16) },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: s(18), fontWeight: '800' },
  sub: { fontSize: s(13), lineHeight: s(20) },
  exitBtn: { fontSize: s(20), padding: s(4) },
  wpmDisplay: { alignItems: 'center', gap: s(4), paddingVertical: s(8) },
  wpmNum: { fontSize: s(72), fontWeight: '900', lineHeight: s(80) },
  wpmLabel: { fontSize: s(13) },
  wpmStatus: { fontSize: s(20), fontWeight: '700' },
  barContainer: { gap: s(6) },
  zoneRow: { flexDirection: 'row', justifyContent: 'space-between' },
  zoneLabel: { fontSize: s(11), fontWeight: '600' },
  barBg: { height: s(20), borderRadius: s(10), overflow: 'hidden', position: 'relative' },
  zone: { position: 'absolute', top: 0, bottom: 0 },
  barFill: { height: '100%', borderRadius: s(10) },
  tip: { fontSize: s(11), textAlign: 'center', fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', borderRadius: s(12), borderWidth: 1, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', padding: s(12), gap: s(2) },
  statNum: { fontSize: s(22), fontWeight: '800' },
  statLabel: { fontSize: s(11) },
  btnArea: { gap: s(12), marginTop: 'auto' as any },
  hint: { fontSize: s(13), textAlign: 'center', fontStyle: 'italic' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(8) },
  recordingDot: { fontSize: s(16) },
  recordingLabel: { fontSize: s(14) },
  btn: { padding: s(16), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  rowBtns: { flexDirection: 'row', gap: s(10) },
  resultBox: { padding: s(20), borderRadius: s(16), borderWidth: 2, alignItems: 'center', gap: s(4) },
  resultWpm: { fontSize: s(56), fontWeight: '900' },
  resultLabel: { fontSize: s(13) },
  resultStatus: { fontSize: s(18), fontWeight: '700' },
});
