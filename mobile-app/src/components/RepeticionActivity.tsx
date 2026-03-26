/**
 * RepeticionActivity — Repite lo que escuchas
 * El app dice una frase; el usuario tiene X segundos para repetirla exactamente.
 * Mide memoria auditiva y velocidad de respuesta.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { ActivityResult } from '../utils/activityResults';
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

const REPEAT_SECS = 8; // seconds to repeat after hearing

// Phrases per language
const PHRASES_ES = [
  'Buenos días, ¿cómo estás hoy?',
  'Necesito un vaso de agua, por favor.',
  'El tren sale a las ocho de la mañana.',
  'Me gustaría reservar una mesa para dos.',
  'La farmacia está en la esquina de la calle.',
  'Estudio español todos los días por la mañana.',
  'El vuelo tiene una escala de dos horas en Madrid.',
  'Quiero aprender español para viajar por América Latina.',
  'La reunión empieza a las tres y termina a las cinco.',
  'Necesito renovar mi pasaporte antes de viajar al extranjero.',
];

const PHRASES_HE = [
  'בוקר טוב, מה שלומך היום?',
  'אני צריך כוס מים, בבקשה.',
  'הרכבת יוצאת בשמונה בבוקר.',
  'אני רוצה להזמין שולחן לשניים.',
  'בית המרקחת נמצא בפינת הרחוב.',
  'אני לומד עברית כל יום בבוקר.',
  'הטיסה עם עצירה של שעתיים בתל אביב.',
  'אני רוצה ללמוד עברית כדי לנסוע בישראל.',
  'הפגישה מתחילה בשלוש ומסתיימת בחמש.',
  'אני צריך לחדש את הדרכון שלי לפני הנסיעה.',
];

const L: Record<Language, {
  title: string; sub: string; listenBtn: string; repeatBtn: string; stopBtn: string;
  correct: string; incorrect: string; next: string; done: string; retry: string;
  summaryTitle: string; of: string; correctLabel: string; timeUp: string;
  noMic: string; noStt: string; listenFirst: string; nowRepeat: string;
  countdown: string;
}> = {
  he: {
    title: '🔁 חזור על מה ששמעת', sub: 'האזן לביטוי וחזור עליו תוך שמונה שניות',
    listenBtn: '🔊 האזן', repeatBtn: '🎤 חזור עכשיו', stopBtn: '⏹ עצור',
    correct: '✅ מצוין!', incorrect: '❌ לא מדויק', next: 'הבא →', done: 'סיום ✓',
    retry: '↺ נסה שוב', summaryTitle: '🎉 סיימת!', of: 'מתוך', correctLabel: 'נכון',
    timeUp: '⏰ הזמן נגמר', noMic: 'נדרשת הרשאת מיקרופון', noStt: 'זיהוי דיבור אינו זמין',
    listenFirst: 'האזן לביטוי תחילה', nowRepeat: 'עכשיו חזור על הביטוי!',
    countdown: 'שניות לחזרה',
  },
  es: {
    title: '🔁 Repite lo que Escuchas', sub: 'Escucha la frase y repítela en 8 segundos',
    listenBtn: '🔊 Escuchar', repeatBtn: '🎤 Repetir ahora', stopBtn: '⏹ Detener',
    correct: '✅ ¡Excelente!', incorrect: '❌ No fue exacto', next: 'Siguiente →', done: 'Finalizar ✓',
    retry: '↺ Reintentar', summaryTitle: '🎉 ¡Terminaste!', of: 'de', correctLabel: 'Correctas',
    timeUp: '⏰ Tiempo agotado', noMic: 'Se necesita permiso de micrófono', noStt: 'Reconocimiento de voz no disponible',
    listenFirst: 'Escucha la frase primero', nowRepeat: '¡Ahora repite la frase!',
    countdown: 'segundos para repetir',
  },
  en: {
    title: '🔁 Repeat What You Hear', sub: 'Listen to the phrase and repeat it in 8 seconds',
    listenBtn: '🔊 Listen', repeatBtn: '🎤 Repeat now', stopBtn: '⏹ Stop',
    correct: '✅ Excellent!', incorrect: '❌ Not quite right', next: 'Next →', done: 'Finish ✓',
    retry: '↺ Retry', summaryTitle: '🎉 Done!', of: 'of', correctLabel: 'Correct',
    timeUp: '⏰ Time\'s up', noMic: 'Microphone permission required', noStt: 'Speech recognition not available',
    listenFirst: 'Listen to the phrase first', nowRepeat: 'Now repeat the phrase!',
    countdown: 'seconds to repeat',
  },
};

type Phase = 'idle' | 'listening' | 'countdown' | 'recording' | 'correct' | 'incorrect' | 'timeup' | 'summary';

interface Props {
  uiLanguage: Language;
  language: string;
  onComplete: (result: ActivityResult) => void;
  onExit: () => void;
}

export const RepeticionActivity: React.FC<Props> = ({
  uiLanguage, language, onComplete, onExit,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const isHebrew = language === 'Hebreo' || language === 'Hebrew';
  const phrases = isHebrew ? PHRASES_HE : PHRASES_ES;
  const ttsLocale = isHebrew ? 'he-IL' : 'es-ES';
  const sttLocale = ttsLocale;

  const [index, setIndex]         = useState(0);
  const [phase, setPhase]         = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(REPEAT_SECS);
  const [correctCount, setCorrectCount] = useState(0);
  const [transcript, setTranscript] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersRef = useRef<(() => void)[]>([]);
  const activityStart = useRef(Date.now());
  const countdownAnim = useRef(new Animated.Value(1)).current;

  const current = phrases[index];

  useEffect(() => () => {
    Speech.stop();
    clearCountdown();
    removeListeners();
    getStt()?.stop?.();
  }, []);

  const clearCountdown = () => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } };
  const removeListeners = () => { listenersRef.current.forEach(fn => fn()); listenersRef.current = []; };

  const listenPhrase = () => {
    setPhase('listening');
    Speech.speak(current, {
      language: ttsLocale,
      rate: 0.85,
      onDone: () => startCountdown(),
      onError: () => startCountdown(),
    });
  };

  const startCountdown = () => {
    setCountdown(REPEAT_SECS);
    setPhase('countdown');
    let remaining = REPEAT_SECS;
    countdownRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      // pulse animation
      Animated.sequence([
        Animated.timing(countdownAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.timing(countdownAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      if (remaining <= 0) {
        clearCountdown();
        setPhase('timeup');
      }
    }, 1000);
  };

  const startRecording = async () => {
    clearCountdown();
    const stt = getStt();
    if (!stt) { setPhase('incorrect'); return; }
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
        if (normalizeAndCompare(text, current)) {
          setCorrectCount(c => c + 1);
          setPhase('correct');
        } else {
          setPhase('incorrect');
        }
      });
      const r2 = m.ExpoSpeechRecognitionModule.addListener('error', () => {
        removeListeners();
        setPhase('incorrect');
      });
      listenersRef.current = [() => r1?.remove?.(), () => r2?.remove?.()];
    } catch { setPhase('incorrect'); return; }

    stt.start({ lang: sttLocale, interimResults: false, continuous: false });
  };

  const advance = () => {
    const next = index + 1;
    if (next >= phrases.length) { setPhase('summary'); return; }
    setIndex(next);
    setPhase('idle');
    setTranscript('');
  };

  const finish = () => {
    const duration = Math.round((Date.now() - activityStart.current) / 1000);
    onComplete({
      id: Date.now().toString(), activityType: 'repeticion' as any,
      language, completedAt: new Date().toISOString(),
      score: Math.round((correctCount / phrases.length) * 100),
      durationSeconds: duration,
    });
  };

  if (phase === 'summary') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>🎉</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.summaryTitle}</Text>
          <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>{correctCount}/{phrases.length}</Text>
            <Text style={[styles.scoreSub, { color: colors.text2 }]}>{t.correctLabel}</Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={finish}>
            <Text style={styles.btnText}>{t.done}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sub, { color: colors.text2 }]}>{t.sub}</Text>
      <Text style={[styles.counter, { color: colors.text2 }]}>{index + 1} {t.of} {phrases.length}</Text>

      {/* Phrase card — hidden until listened */}
      <View style={[styles.phraseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {phase === 'idle' ? (
          <Text style={[styles.phraseHidden, { color: colors.text2 }]}>{t.listenFirst}</Text>
        ) : (
          <Text style={[styles.phraseText, { color: colors.text }]}>{current}</Text>
        )}
      </View>

      {/* Countdown ring */}
      {(phase === 'countdown' || phase === 'recording') && (
        <View style={styles.countdownArea}>
          <Animated.Text style={[styles.countdownNum, { color: countdown <= 3 ? '#f44336' : colors.primary, transform: [{ scale: countdownAnim }] }]}>
            {countdown}
          </Animated.Text>
          <Text style={[styles.countdownLabel, { color: colors.text2 }]}>{t.countdown}</Text>
          {phase === 'countdown' && (
            <Text style={[styles.nowRepeat, { color: colors.primary }]}>{t.nowRepeat}</Text>
          )}
        </View>
      )}

      {/* Controls */}
      <View style={styles.btnArea}>
        {phase === 'idle' && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={listenPhrase}>
            <Text style={styles.btnText}>{t.listenBtn}</Text>
          </TouchableOpacity>
        )}

        {phase === 'listening' && (
          <View style={[styles.listeningBox, { backgroundColor: colors.surface }]}>
            <Text style={styles.listeningEmoji}>🔊</Text>
            <Text style={[styles.listeningLabel, { color: colors.text2 }]}>Escuchando...</Text>
          </View>
        )}

        {phase === 'countdown' && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={startRecording}>
            <Text style={styles.btnText}>{t.repeatBtn}</Text>
          </TouchableOpacity>
        )}

        {phase === 'recording' && (
          <View style={[styles.listeningBox, { backgroundColor: colors.surface }]}>
            <Text style={styles.listeningEmoji}>🔴</Text>
            <Text style={[styles.listeningLabel, { color: colors.text2 }]}>Grabando...</Text>
          </View>
        )}

        {phase === 'timeup' && (
          <View style={styles.resultArea}>
            <Text style={[styles.feedback, { color: '#ff9800' }]}>{t.timeUp}</Text>
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]} onPress={() => setPhase('idle')}>
                <Text style={styles.btnText}>{t.retry}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border, flex: 1 }]} onPress={advance}>
                <Text style={[styles.btnText, { color: colors.text }]}>{t.next}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(phase === 'correct' || phase === 'incorrect') && (
          <View style={styles.resultArea}>
            {transcript !== '' && (
              <Text style={[styles.transcript, { color: colors.text2 }]}>"{transcript}"</Text>
            )}
            <Text style={[styles.feedback, { color: phase === 'correct' ? '#4caf50' : '#f44336' }]}>
              {phase === 'correct' ? t.correct : t.incorrect}
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={advance}>
              <Text style={styles.btnText}>{index + 1 >= phrases.length ? t.done : t.next}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: s(20), gap: s(14) },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: s(16) },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: s(18), fontWeight: '800' },
  sub: { fontSize: s(13), lineHeight: s(20) },
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  exitBtn: { fontSize: s(20), padding: s(4) },
  phraseCard: { padding: s(24), borderRadius: s(16), borderWidth: 1, minHeight: s(100), justifyContent: 'center', alignItems: 'center' },
  phraseHidden: { fontSize: s(14), fontStyle: 'italic' },
  phraseText: { fontSize: s(18), fontWeight: '600', textAlign: 'center', lineHeight: s(28) },
  countdownArea: { alignItems: 'center', gap: s(4) },
  countdownNum: { fontSize: s(64), fontWeight: '900' },
  countdownLabel: { fontSize: s(13) },
  nowRepeat: { fontSize: s(15), fontWeight: '700' },
  btnArea: { marginTop: 'auto' as any, gap: s(12) },
  listeningBox: { padding: s(20), borderRadius: s(12), alignItems: 'center', gap: s(8) },
  listeningEmoji: { fontSize: s(32) },
  listeningLabel: { fontSize: s(14) },
  btn: { padding: s(16), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  resultArea: { gap: s(12) },
  transcript: { fontSize: s(13), fontStyle: 'italic', textAlign: 'center' },
  feedback: { fontSize: s(20), fontWeight: '800', textAlign: 'center' },
  rowBtns: { flexDirection: 'row', gap: s(10) },
  bigEmoji: { fontSize: s(56) },
  scoreBox: { padding: s(24), borderRadius: s(16), borderWidth: 1, alignItems: 'center', gap: s(4) },
  scoreNum: { fontSize: s(48), fontWeight: '800' },
  scoreSub: { fontSize: s(13) },
});
