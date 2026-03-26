import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { PronunciacionItem } from '../utils/speakingContent';
import { ActivityResult } from '../utils/activityResults';
import { normalizeAndCompare } from '../utils/activityUtils';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

// expo-speech-recognition — dynamic load, safe in Expo Go
let _stt: any = null;
function getStt() {
  if (_stt !== null) return _stt;
  try { const m = require('expo-speech-recognition'); _stt = m?.ExpoSpeechRecognitionModule ?? false; }
  catch { _stt = false; }
  return _stt || null;
}

// Locale para TTS según el idioma de aprendizaje
function getTTSLocale(language: string): string {
  if (language === 'Hebreo' || language === 'Hebrew') return 'he-IL';
  if (language === 'Español' || language === 'Spanish') return 'es-ES';
  return 'es-ES';
}

// Locale para STT según el idioma de aprendizaje
function getSTTLocale(language: string): string {
  if (language === 'Hebreo' || language === 'Hebrew') return 'he-IL';
  return 'es-ES';
}

const L: Record<Language, {
  title: string; sub: string; listenBtn: string; stopBtn: string;
  recordBtn: string; recordingBtn: string; selfAssessLabel: string;
  correct: string; incorrect: string; retry: string; skip: string; next: string;
  summaryTitle: string; done: string; of: string; correctLabel: string;
  noMic: string; tapToListen: string;
}> = {
  he: {
    title: '🔊 הגייה מודרכת', sub: 'האזן למילה וחזור עליה בקול רם',
    listenBtn: '🔊 האזן למילה', stopBtn: '⏹ עצור',
    recordBtn: '🎤 הקלט את עצמך', recordingBtn: '⏹ עצור',
    selfAssessLabel: 'האם הגית נכון?',
    correct: '✅ מצוין!', incorrect: '❌ נסה שוב', retry: '↺ נסה שוב', skip: 'דלג →', next: 'הבא →',
    summaryTitle: '🎉 סיימת!', done: 'סיום ✓', of: 'מתוך', correctLabel: 'נכון',
    noMic: 'נדרשת הרשאת מיקרופון', tapToListen: 'לחץ להאזנה',
  },
  es: {
    title: '🔊 Pronunciación Guiada', sub: 'Escucha la palabra y repítela en voz alta',
    listenBtn: '🔊 Escuchar palabra', stopBtn: '⏹ Detener',
    recordBtn: '🎤 Grabar mi pronunciación', recordingBtn: '⏹ Detener',
    selfAssessLabel: '¿Lo pronunciaste correctamente?',
    correct: '✅ ¡Excelente!', incorrect: '❌ Inténtalo de nuevo', retry: '↺ Reintentar', skip: 'Saltar →', next: 'Siguiente →',
    summaryTitle: '🎉 ¡Terminaste!', done: 'Finalizar ✓', of: 'de', correctLabel: 'Correctas',
    noMic: 'Se necesita permiso de micrófono', tapToListen: 'Toca para escuchar',
  },
  en: {
    title: '🔊 Guided Pronunciation', sub: 'Listen to the word and repeat it aloud',
    listenBtn: '🔊 Listen to word', stopBtn: '⏹ Stop',
    recordBtn: '🎤 Record myself', recordingBtn: '⏹ Stop',
    selfAssessLabel: 'Did you pronounce it correctly?',
    correct: '✅ Excellent!', incorrect: '❌ Try again', retry: '↺ Retry', skip: 'Skip →', next: 'Next →',
    summaryTitle: '🎉 Done!', done: 'Finish ✓', of: 'of', correctLabel: 'Correct',
    noMic: 'Microphone permission required', tapToListen: 'Tap to listen',
  },
};

type Phase = 'presenting' | 'awaiting' | 'recording' | 'self_assess' | 'correct' | 'incorrect' | 'summary';

interface Props {
  items: PronunciacionItem[];
  uiLanguage: Language;
  targetLanguage: string;
  sttAvailable: boolean;
  language: string;
  onComplete: (result: ActivityResult) => void;
  onExit: () => void;
}

export const PronunciacionActivity: React.FC<Props> = ({
  items, uiLanguage, language, onComplete, onExit,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const ttsLocale = getTTSLocale(language);
  const sttLocale = getSTTLocale(language);

  const [index, setIndex]           = useState(0);
  const [phase, setPhase]           = useState<Phase>('presenting');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [transcript, setTranscript] = useState('');
  const listenersRef = useRef<(() => void)[]>([]);
  const startTime = useRef(Date.now());

  const current = items[index];

  useEffect(() => () => { Speech.stop(); removeListeners(); getStt()?.stop?.(); }, []);

  const removeListeners = () => { listenersRef.current.forEach(fn => fn()); listenersRef.current = []; };

  // ── TTS: speak the word ───────────────────────────────────────────────────
  const speak = () => {
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); return; }
    setIsSpeaking(true);
    Speech.speak(current.word, {
      language: ttsLocale,
      rate: 0.85, // slightly slower for learning
      onDone: () => { setIsSpeaking(false); setPhase('awaiting'); },
      onError: () => { setIsSpeaking(false); setPhase('awaiting'); },
    });
  };

  // Auto-play when item loads
  useEffect(() => {
    if (phase === 'presenting' && current) {
      setTranscript('');
      // small delay so UI renders first
      const timer = setTimeout(() => speak(), 400);
      return () => clearTimeout(timer);
    }
  }, [index]);

  // ── STT: record pronunciation ─────────────────────────────────────────────
  const startRecord = async () => {
    const stt = getStt();
    if (!stt) { setPhase('self_assess'); return; }

    const { granted } = await stt.requestPermissionsAsync();
    if (!granted) { Alert.alert(t.noMic); return; }

    setPhase('recording');
    setTranscript('');
    removeListeners();

    try {
      const m = require('expo-speech-recognition');
      const r1 = m.ExpoSpeechRecognitionModule.addListener('result', (e: any) => {
        const text: string = e.results?.[0]?.transcript ?? '';
        setTranscript(text);
        getStt()?.stop?.();
        removeListeners();
        // Compare transcript with the word
        if (normalizeAndCompare(text, current.word)) {
          setCorrectCount(c => c + 1);
          setPhase('correct');
        } else {
          setPhase('incorrect');
        }
      });
      const r2 = m.ExpoSpeechRecognitionModule.addListener('error', () => {
        removeListeners();
        setPhase('self_assess');
      });
      listenersRef.current = [() => r1?.remove?.(), () => r2?.remove?.()];
    } catch { setPhase('self_assess'); return; }

    stt.start({ lang: sttLocale, interimResults: false, continuous: false });
  };

  const stopRecord = () => {
    getStt()?.stop?.();
    removeListeners();
    setPhase('self_assess');
  };

  const selfAssess = (wasCorrect: boolean) => {
    if (wasCorrect) { setCorrectCount(c => c + 1); setPhase('correct'); }
    else setPhase('incorrect');
  };

  const advance = () => {
    Speech.stop();
    const next = index + 1;
    if (next >= items.length) { setPhase('summary'); return; }
    setIndex(next);
    setPhase('presenting');
  };

  const finish = () => {
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    onComplete({
      id: Date.now().toString(), activityType: 'pronunciacion', language,
      completedAt: new Date().toISOString(),
      score: Math.round((correctCount / items.length) * 100),
      durationSeconds: duration,
    });
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  if (phase === 'summary') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>🎉</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.summaryTitle}</Text>
          <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>{correctCount}/{items.length}</Text>
            <Text style={[styles.scoreSub, { color: colors.text2 }]}>{t.correctLabel}</Text>
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
    <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.bg }]}>
      {/* Header */}
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

      {/* Listen button — always visible */}
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: isSpeaking ? '#ff9800' : colors.primary }]}
        onPress={speak}
      >
        <Text style={styles.btnText}>{isSpeaking ? t.stopBtn : t.listenBtn}</Text>
      </TouchableOpacity>

      {/* Record — shown after listening */}
      {(phase === 'awaiting') && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={startRecord}>
          <Text style={styles.btnText}>{t.recordBtn}</Text>
        </TouchableOpacity>
      )}

      {phase === 'recording' && (
        <View style={styles.recordingBox}>
          <Text style={styles.recordingDot}>🔴</Text>
          <Text style={[styles.recordingLabel, { color: colors.text2 }]}>{t.recordingBtn}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#f44336' }]} onPress={stopRecord}>
            <Text style={styles.btnText}>{t.stopBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Self-assess fallback (no STT) */}
      {phase === 'self_assess' && (
        <View style={styles.selfAssessRow}>
          <Text style={[styles.selfAssessLabel, { color: colors.text }]}>{t.selfAssessLabel}</Text>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50', flex: 1 }]} onPress={() => selfAssess(true)}>
              <Text style={styles.btnText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#f44336', flex: 1 }]} onPress={() => selfAssess(false)}>
              <Text style={styles.btnText}>✗</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Result */}
      {phase === 'correct' && (
        <View style={styles.feedbackRow}>
          {transcript !== '' && (
            <Text style={[styles.transcriptText, { color: colors.text2 }]}>"{transcript}"</Text>
          )}
          <Text style={[styles.feedback, { color: '#4caf50' }]}>{t.correct}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={advance}>
            <Text style={styles.btnText}>{index + 1 >= items.length ? t.done : t.next}</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'incorrect' && (
        <View style={styles.feedbackRow}>
          {transcript !== '' && (
            <Text style={[styles.transcriptText, { color: colors.text2 }]}>"{transcript}"</Text>
          )}
          <Text style={[styles.feedback, { color: '#f44336' }]}>{t.incorrect}</Text>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50', flex: 1 }]} onPress={() => setPhase('awaiting')}>
              <Text style={styles.btnText}>{t.retry}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border, flex: 1 }]} onPress={advance}>
              <Text style={[styles.btnText, { color: colors.text }]}>{t.skip}</Text>
            </TouchableOpacity>
          </View>
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
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  exitBtn: { fontSize: s(20), padding: s(4) },
  wordCard: { padding: s(32), borderRadius: s(16), borderWidth: 1.5, alignItems: 'center', gap: s(10) },
  wordText: { fontSize: s(32), fontWeight: '800', textAlign: 'center' },
  translation: { fontSize: s(15), fontStyle: 'italic', textAlign: 'center' },
  btn: { padding: s(14), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  recordingBox: { alignItems: 'center', gap: s(8) },
  recordingDot: { fontSize: s(28) },
  recordingLabel: { fontSize: s(13) },
  selfAssessRow: { gap: s(10) },
  selfAssessLabel: { fontSize: s(15), fontWeight: '600', textAlign: 'center' },
  rowBtns: { flexDirection: 'row', gap: s(10) },
  feedbackRow: { gap: s(10) },
  feedback: { fontSize: s(20), fontWeight: '800', textAlign: 'center' },
  transcriptText: { fontSize: s(13), fontStyle: 'italic', textAlign: 'center' },
  bigEmoji: { fontSize: s(56), textAlign: 'center' },
  scoreBox: { padding: s(24), borderRadius: s(16), borderWidth: 1, alignItems: 'center', gap: s(4) },
  scoreNum: { fontSize: s(40), fontWeight: '800' },
  scoreSub: { fontSize: s(13) },
});
