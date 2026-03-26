/**
 * CinemaMode — Modo Cine
 * Muestra una escena con diálogo. El usuario tiene que decir la línea
 * del personaje antes de que aparezca en pantalla. Cuenta regresiva visual.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Alert,
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

const COUNTDOWN_SECS = 6;

interface SceneLine {
  character: string;
  emoji: string;
  line: string;           // the line to say
  isUserLine: boolean;    // true = user must say it
  context?: string;       // stage direction / context
}

interface Scene {
  title: string;
  setting: string;
  lines: SceneLine[];
}

const SCENES_ES: Scene[] = [
  {
    title: '🍽️ En el restaurante',
    setting: 'Un restaurante en Madrid. Tú eres el cliente.',
    lines: [
      { character: 'Camarero', emoji: '🧑‍🍳', line: 'Buenas noches, ¿tiene reserva?', isUserLine: false },
      { character: 'Tú', emoji: '🧑', line: 'Sí, a nombre de García, para dos personas.', isUserLine: true, context: 'Confirma tu reserva' },
      { character: 'Camarero', emoji: '🧑‍🍳', line: 'Perfecto, síganme por favor.', isUserLine: false },
      { character: 'Tú', emoji: '🧑', line: 'Gracias. ¿Nos puede traer la carta?', isUserLine: true, context: 'Pide el menú' },
      { character: 'Camarero', emoji: '🧑‍🍳', line: 'Por supuesto, enseguida.', isUserLine: false },
      { character: 'Tú', emoji: '🧑', line: 'Quisiera el menú del día, por favor.', isUserLine: true, context: 'Ordena tu comida' },
    ],
  },
  {
    title: '🏨 En el hotel',
    setting: 'La recepción de un hotel. Acabas de llegar.',
    lines: [
      { character: 'Recepcionista', emoji: '💁', line: 'Bienvenido, ¿en qué le puedo ayudar?', isUserLine: false },
      { character: 'Tú', emoji: '🧑', line: 'Tengo una reserva a nombre de López.', isUserLine: true, context: 'Preséntate' },
      { character: 'Recepcionista', emoji: '💁', line: 'Un momento, voy a verificar.', isUserLine: false },
      { character: 'Tú', emoji: '🧑', line: '¿A qué hora es el desayuno?', isUserLine: true, context: 'Pregunta por el desayuno' },
      { character: 'Recepcionista', emoji: '💁', line: 'El desayuno es de siete a diez de la mañana.', isUserLine: false },
      { character: 'Tú', emoji: '🧑', line: 'Perfecto, muchas gracias.', isUserLine: true, context: 'Agradece' },
    ],
  },
];

const SCENES_HE: Scene[] = [
  {
    title: '🍽️ במסעדה',
    setting: 'מסעדה בתל אביב. אתה הלקוח.',
    lines: [
      { character: 'מלצר', emoji: '🧑‍🍳', line: 'ערב טוב, יש לך הזמנה?', isUserLine: false },
      { character: 'אתה', emoji: '🧑', line: 'כן, על שם כהן, לשניים.', isUserLine: true, context: 'אשר את ההזמנה שלך' },
      { character: 'מלצר', emoji: '🧑‍🍳', line: 'מצוין, בוא אחריי בבקשה.', isUserLine: false },
      { character: 'אתה', emoji: '🧑', line: 'תודה. אפשר לקבל את התפריט?', isUserLine: true, context: 'בקש את התפריט' },
      { character: 'מלצר', emoji: '🧑‍🍳', line: 'כמובן, מיד.', isUserLine: false },
      { character: 'אתה', emoji: '🧑', line: 'אני רוצה את מנת היום, בבקשה.', isUserLine: true, context: 'הזמן את האוכל שלך' },
    ],
  },
];

const L: Record<Language, {
  title: string; yourLine: string; speakBtn: string; stopBtn: string;
  correct: string; incorrect: string; next: string; done: string;
  summaryTitle: string; close: string; selectScene: string;
  noMic: string; countdown: string; revealed: string; score: string;
}> = {
  he: {
    title: '🎬 מצב קולנוע', yourLine: 'השורה שלך:', speakBtn: '🎤 אמור את השורה', stopBtn: '⏹ עצור',
    correct: '✅ מצוין!', incorrect: '❌ לא מדויק', next: 'הבא →', done: 'סיום ✓',
    summaryTitle: '🎬 סצנה הושלמה!', close: 'סגור', selectScene: 'בחר סצנה',
    noMic: 'נדרשת הרשאת מיקרופון', countdown: 'שניות לדיבור', revealed: 'השורה נחשפה',
    score: 'ניקוד',
  },
  es: {
    title: '🎬 Modo Cine', yourLine: 'Tu línea:', speakBtn: '🎤 Di la línea', stopBtn: '⏹ Detener',
    correct: '✅ ¡Excelente!', incorrect: '❌ No fue exacto', next: 'Siguiente →', done: 'Finalizar ✓',
    summaryTitle: '🎬 ¡Escena completada!', close: 'Cerrar', selectScene: 'Elige una escena',
    noMic: 'Se necesita permiso de micrófono', countdown: 'segundos para hablar', revealed: 'Línea revelada',
    score: 'Puntuación',
  },
  en: {
    title: '🎬 Cinema Mode', yourLine: 'Your line:', speakBtn: '🎤 Say the line', stopBtn: '⏹ Stop',
    correct: '✅ Excellent!', incorrect: '❌ Not quite', next: 'Next →', done: 'Finish ✓',
    summaryTitle: '🎬 Scene complete!', close: 'Close', selectScene: 'Choose a scene',
    noMic: 'Microphone permission required', countdown: 'seconds to speak', revealed: 'Line revealed',
    score: 'Score',
  },
};

type Phase = 'select' | 'showing' | 'countdown' | 'recording' | 'correct' | 'incorrect' | 'revealed' | 'done';

interface Props {
  uiLanguage: Language;
  language: string;
  onExit: () => void;
}

export const CinemaMode: React.FC<Props> = ({ uiLanguage, language, onExit }) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const isHebrew = language === 'Hebreo' || language === 'Hebrew';
  const scenes = isHebrew ? SCENES_HE : SCENES_ES;
  const sttLocale = isHebrew ? 'he-IL' : 'es-ES';

  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('select');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [score, setScore] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersRef = useRef<(() => void)[]>([]);
  const countdownAnim = useRef(new Animated.Value(1)).current;

  const scene = selectedScene !== null ? scenes[selectedScene] : null;
  const line = scene?.lines[lineIndex];

  useEffect(() => () => {
    Speech.stop();
    clearCountdown();
    removeListeners();
    getStt()?.stop?.();
  }, []);

  const clearCountdown = () => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } };
  const removeListeners = () => { listenersRef.current.forEach(fn => fn()); listenersRef.current = []; };

  const startScene = (idx: number) => {
    setSelectedScene(idx);
    setLineIndex(0);
    setScore(0);
    setPhase('showing');
    // Read first non-user line
    const firstLine = scenes[idx].lines[0];
    if (!firstLine.isUserLine) {
      Speech.speak(firstLine.line, { language: sttLocale, rate: 0.9 });
    }
  };

  const advance = () => {
    if (!scene) return;
    const next = lineIndex + 1;
    if (next >= scene.lines.length) { setPhase('done'); return; }
    setLineIndex(next);
    setPhase('showing');
    const nextLine = scene.lines[next];
    if (!nextLine.isUserLine) {
      Speech.speak(nextLine.line, { language: sttLocale, rate: 0.9 });
    } else {
      startCountdown();
    }
  };

  const startCountdown = () => {
    setCountdown(COUNTDOWN_SECS);
    setPhase('countdown');
    let remaining = COUNTDOWN_SECS;
    countdownRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      Animated.sequence([
        Animated.timing(countdownAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.timing(countdownAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      if (remaining <= 0) { clearCountdown(); startRecording(); }
    }, 1000);
  };

  const startRecording = async () => {
    const stt = getStt();
    if (!stt) { setPhase('revealed'); return; }
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
        if (line && normalizeAndCompare(text, line.line)) {
          setScore(s => s + 1);
          setPhase('correct');
          Speech.speak(line.line, { language: sttLocale });
        } else {
          setPhase('incorrect');
        }
      });
      const r2 = m.ExpoSpeechRecognitionModule.addListener('error', () => {
        removeListeners();
        setPhase('revealed');
      });
      listenersRef.current = [() => r1?.remove?.(), () => r2?.remove?.()];
    } catch { setPhase('revealed'); return; }
    stt.start({ lang: sttLocale, interimResults: false, continuous: false });
  };

  const userLines = scene?.lines.filter(l => l.isUserLine).length ?? 0;

  if (phase === 'select') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
          <TouchableOpacity onPress={onExit}><Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text></TouchableOpacity>
        </View>
        <Text style={[styles.sub, { color: colors.text2 }]}>{t.selectScene}</Text>
        <View style={{ gap: s(12), marginTop: s(8) }}>
          {scenes.map((sc, i) => (
            <TouchableOpacity key={i} style={[styles.sceneCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => startScene(i)}>
              <Text style={[styles.sceneTitle, { color: colors.text }]}>{sc.title}</Text>
              <Text style={[styles.sceneSetting, { color: colors.text2 }]}>{sc.setting}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (phase === 'done' && scene) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>🎬</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.summaryTitle}</Text>
          <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>{score}/{userLines}</Text>
            <Text style={[styles.scoreSub, { color: colors.text2 }]}>{t.score}</Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onExit}>
            <Text style={styles.btnText}>{t.done}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!line) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>{scene?.title}</Text>
        <TouchableOpacity onPress={onExit}><Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text></TouchableOpacity>
      </View>
      <Text style={[styles.progress, { color: colors.text2 }]}>{lineIndex + 1}/{scene?.lines.length}</Text>

      {/* Scene card */}
      <View style={[styles.sceneBox, {
        backgroundColor: line.isUserLine ? colors.primary + '15' : colors.surface,
        borderColor: line.isUserLine ? colors.primary : colors.border,
      }]}>
        <View style={styles.characterRow}>
          <Text style={styles.characterEmoji}>{line.emoji}</Text>
          <Text style={[styles.characterName, { color: line.isUserLine ? colors.primary : colors.text2 }]}>
            {line.character}
          </Text>
        </View>
        {line.isUserLine && phase !== 'correct' && phase !== 'incorrect' && phase !== 'revealed' ? (
          <>
            {line.context && <Text style={[styles.context, { color: colors.text2 }]}>{line.context}</Text>}
            <Text style={[styles.lineHidden, { color: colors.text2 }]}>
              {phase === 'showing' ? '...' : '🎤 ...'}
            </Text>
          </>
        ) : (
          <Text style={[styles.lineText, { color: colors.text }]}>{line.line}</Text>
        )}
      </View>

      {/* Countdown */}
      {phase === 'countdown' && (
        <View style={styles.countdownArea}>
          <Animated.Text style={[styles.countdownNum, { color: countdown <= 2 ? '#f44336' : colors.primary, transform: [{ scale: countdownAnim }] }]}>
            {countdown}
          </Animated.Text>
          <Text style={[styles.countdownLabel, { color: colors.text2 }]}>{t.countdown}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.btnArea}>
        {phase === 'showing' && !line.isUserLine && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={advance}>
            <Text style={styles.btnText}>{t.next}</Text>
          </TouchableOpacity>
        )}
        {phase === 'showing' && line.isUserLine && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={startCountdown}>
            <Text style={styles.btnText}>{t.speakBtn}</Text>
          </TouchableOpacity>
        )}
        {phase === 'recording' && (
          <View style={[styles.statusBox, { backgroundColor: colors.surface }]}>
            <Text style={styles.statusEmoji}>🔴</Text>
            <Text style={[styles.statusLabel, { color: colors.text2 }]}>Grabando...</Text>
          </View>
        )}
        {(phase === 'correct' || phase === 'incorrect' || phase === 'revealed') && (
          <View style={{ gap: s(10) }}>
            <Text style={[styles.feedback, {
              color: phase === 'correct' ? '#4caf50' : phase === 'incorrect' ? '#f44336' : '#ff9800',
            }]}>
              {phase === 'correct' ? t.correct : phase === 'incorrect' ? t.incorrect : t.revealed}
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={advance}>
              <Text style={styles.btnText}>{lineIndex + 1 >= (scene?.lines.length ?? 0) ? t.done : t.next}</Text>
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
  sub: { fontSize: s(13) },
  exitBtn: { fontSize: s(20), padding: s(4) },
  progress: { fontSize: s(12), alignSelf: 'flex-end' },
  sceneCard: { padding: s(16), borderRadius: s(12), borderWidth: 1, gap: s(4) },
  sceneTitle: { fontSize: s(16), fontWeight: '700' },
  sceneSetting: { fontSize: s(12) },
  sceneBox: { padding: s(20), borderRadius: s(16), borderWidth: 1.5, gap: s(8) },
  characterRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  characterEmoji: { fontSize: s(24) },
  characterName: { fontSize: s(13), fontWeight: '700' },
  context: { fontSize: s(12), fontStyle: 'italic' },
  lineHidden: { fontSize: s(18), fontStyle: 'italic' },
  lineText: { fontSize: s(17), lineHeight: s(26), fontWeight: '500' },
  countdownArea: { alignItems: 'center', gap: s(4) },
  countdownNum: { fontSize: s(56), fontWeight: '900' },
  countdownLabel: { fontSize: s(12) },
  btnArea: { marginTop: 'auto' as any, gap: s(10) },
  statusBox: { padding: s(16), borderRadius: s(12), alignItems: 'center', gap: s(8) },
  statusEmoji: { fontSize: s(24) },
  statusLabel: { fontSize: s(13) },
  btn: { padding: s(16), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  feedback: { fontSize: s(18), fontWeight: '800', textAlign: 'center' },
  bigEmoji: { fontSize: s(56) },
  scoreBox: { padding: s(24), borderRadius: s(16), borderWidth: 1, alignItems: 'center', gap: s(4) },
  scoreNum: { fontSize: s(48), fontWeight: '800' },
  scoreSub: { fontSize: s(13) },
});
