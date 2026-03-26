import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { DictadoItem, DICTADO_LEVELS, DictadoProgress, getDictadoProgress, saveDictadoLevelResult, isLevelUnlocked } from '../utils/speakingContent';
import { ActivityResult } from '../utils/activityResults';
import { normalizeAndCompare, calculateAccuracy } from '../utils/activityUtils';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));
const MAX_REPLAYS = 3;
const MIN_ACCURACY = 70;

const L: Record<Language, {
  title: string; sub: string; replayBtn: string; replayLeft: string;
  inputPlaceholder: string; submitBtn: string; correct: string; incorrect: string;
  correctPhrase: string; next: string; summaryTitle: string; accuracy: string;
  done: string; of: string; selectLevel: string; locked: string; unlockHint: string;
  back: string; bestLabel: string;
}> = {
  he: {
    title: '✍️ כתיב', sub: 'האזן לביטוי וכתוב מה ששמעת',
    replayBtn: '🔊 נגן שוב', replayLeft: 'ניגונים נותרו',
    inputPlaceholder: 'כתוב מה ששמעת...',
    submitBtn: '✓ בדוק', correct: '✓ נכון!', incorrect: '✗ לא מדויק',
    correctPhrase: 'הביטוי הנכון:', next: 'הבא →',
    summaryTitle: '🎉 סיימת!', accuracy: 'דיוק', done: 'סיום ✓', of: 'מתוך',
    selectLevel: 'בחר רמה', locked: '🔒 נעול', unlockHint: `השג ${MIN_ACCURACY}% כדי לפתוח`,
    back: '← חזור', bestLabel: 'הטוב ביותר',
  },
  es: {
    title: '✍️ Dictado', sub: 'Escucha la frase y escribe lo que oyes',
    replayBtn: '🔊 Reproducir', replayLeft: 'reproducciones restantes',
    inputPlaceholder: 'Escribe lo que escuchaste...',
    submitBtn: '✓ Verificar', correct: '✓ ¡Correcto!', incorrect: '✗ No exacto',
    correctPhrase: 'La frase correcta:', next: 'Siguiente →',
    summaryTitle: '🎉 ¡Terminaste!', accuracy: 'Precisión', done: 'Finalizar ✓', of: 'de',
    selectLevel: 'Selecciona un nivel', locked: '🔒 Bloqueado', unlockHint: `Logra ${MIN_ACCURACY}% para desbloquear`,
    back: '← Volver', bestLabel: 'Mejor',
  },
  en: {
    title: '✍️ Dictation', sub: 'Listen to the phrase and write what you hear',
    replayBtn: '🔊 Replay', replayLeft: 'replays left',
    inputPlaceholder: 'Write what you heard...',
    submitBtn: '✓ Check', correct: '✓ Correct!', incorrect: '✗ Not exact',
    correctPhrase: 'The correct phrase:', next: 'Next →',
    summaryTitle: '🎉 Done!', accuracy: 'Accuracy', done: 'Finish ✓', of: 'of',
    selectLevel: 'Select a level', locked: '🔒 Locked', unlockHint: `Reach ${MIN_ACCURACY}% to unlock`,
    back: '← Back', bestLabel: 'Best',
  },
};

type Phase = 'level_select' | 'playing' | 'awaiting' | 'correct' | 'incorrect' | 'summary';

interface Props {
  items: DictadoItem[];
  uiLanguage: Language;
  targetLanguage: string;
  language: string;
  onComplete: (result: ActivityResult) => void;
  onExit: () => void;
}

export const DictadoActivity: React.FC<Props> = ({
  uiLanguage, targetLanguage, language, onComplete, onExit,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const [phase, setPhase] = useState<Phase>('level_select');
  const [progress, setProgress] = useState<DictadoProgress>({});
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [levelItems, setLevelItems] = useState<DictadoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [replaysLeft, setReplaysLeft] = useState(MAX_REPLAYS);
  const [outcomes, setOutcomes] = useState<boolean[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    getDictadoProgress().then(setProgress);
    return () => { Speech.stop(); };
  }, []);

  const startLevel = (level: number) => {
    const lvl = DICTADO_LEVELS.find(l => l.level === level);
    if (!lvl) return;
    setSelectedLevel(level);
    setLevelItems([...lvl.items].sort(() => Math.random() - 0.5));
    setIndex(0);
    setOutcomes([]);
    startTime.current = Date.now();
    setPhase('playing');
  };

  const current = levelItems[index];

  const playAudio = () => {
    if (isSpeaking || !current) return;
    setIsSpeaking(true);
    Speech.speak(current.phrase, {
      language: targetLanguage,
      onDone: () => { setIsSpeaking(false); setPhase('awaiting'); },
      onError: () => { setIsSpeaking(false); setPhase('awaiting'); },
    });
  };

  useEffect(() => {
    if (phase === 'playing' && current) {
      setUserInput('');
      setReplaysLeft(MAX_REPLAYS);
      playAudio();
    }
  }, [index, phase === 'playing']);

  const replay = () => {
    if (replaysLeft <= 0 || isSpeaking) return;
    setReplaysLeft(r => r - 1);
    playAudio();
  };

  const submit = () => {
    const isCorrect = normalizeAndCompare(userInput, current.phrase);
    setOutcomes(o => [...o, isCorrect]);
    setPhase(isCorrect ? 'correct' : 'incorrect');
  };

  const advance = () => {
    Speech.stop();
    const next = index + 1;
    if (next >= levelItems.length) { setPhase('summary'); return; }
    setIndex(next);
    setPhase('playing');
  };

  const finish = async () => {
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    const accuracy = calculateAccuracy(outcomes);
    await saveDictadoLevelResult(selectedLevel, accuracy);
    const updated = await getDictadoProgress();
    setProgress(updated);
    onComplete({
      id: Date.now().toString(), activityType: 'dictado', language,
      completedAt: new Date().toISOString(), score: accuracy, durationSeconds: duration,
    });
  };

  // ── Level selector ────────────────────────────────────────────────────────
  if (phase === 'level_select') {
    return (
      <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.bg }]}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
          <TouchableOpacity onPress={onExit}>
            <Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.sub, { color: colors.text2 }]}>{t.selectLevel}</Text>

        {DICTADO_LEVELS.map(lvl => {
          const unlocked = isLevelUnlocked(lvl.level, progress);
          const prog = progress[lvl.level];
          return (
            <TouchableOpacity
              key={lvl.level}
              style={[
                styles.levelCard,
                { backgroundColor: colors.surface, borderColor: unlocked ? colors.primary : colors.border },
                !unlocked && styles.levelLocked,
              ]}
              onPress={() => unlocked && startLevel(lvl.level)}
              disabled={!unlocked}
            >
              <View style={styles.levelLeft}>
                <Text style={[styles.levelLabel, { color: unlocked ? colors.text : colors.text2 }]}>
                  {unlocked ? lvl.label : `${lvl.label}  ${t.locked}`}
                </Text>
                <Text style={[styles.levelDesc, { color: colors.text2 }]}>
                  {unlocked ? lvl.description : t.unlockHint}
                </Text>
              </View>
              {prog && (
                <View style={styles.levelRight}>
                  <Text style={[styles.levelBest, { color: prog.completed ? '#4caf50' : '#ff9800' }]}>
                    {prog.completed ? '✅' : '🔄'} {prog.bestAccuracy}%
                  </Text>
                  <Text style={[styles.levelBestLabel, { color: colors.text2 }]}>{t.bestLabel}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (phase === 'summary') {
    const accuracy = calculateAccuracy(outcomes);
    const correct = outcomes.filter(Boolean).length;
    const passed = accuracy >= MIN_ACCURACY;
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text style={styles.bigEmoji}>{passed ? '🎉' : '💪'}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.summaryTitle}</Text>
          <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: passed ? '#4caf50' : '#ff9800' }]}>
            <Text style={[styles.scoreNum, { color: passed ? '#4caf50' : '#ff9800' }]}>{accuracy}%</Text>
            <Text style={[styles.scoreSub, { color: colors.text2 }]}>{t.accuracy}</Text>
            <Text style={[styles.scoreSub, { color: colors.text2 }]}>{correct} {t.of} {levelItems.length}</Text>
            {passed && selectedLevel < 5 && (
              <Text style={[styles.unlockMsg, { color: '#4caf50' }]}>
                🔓 Nivel {selectedLevel + 1} desbloqueado
              </Text>
            )}
            {!passed && (
              <Text style={[styles.unlockMsg, { color: '#ff9800' }]}>
                Necesitas {MIN_ACCURACY}% para avanzar
              </Text>
            )}
          </View>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border, flex: 1 }]} onPress={() => setPhase('level_select')}>
              <Text style={[styles.btnText, { color: colors.text }]}>{t.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50', flex: 1 }]} onPress={finish}>
              <Text style={styles.btnText}>{t.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!current) return null;

  return (
    <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => { Speech.stop(); setPhase('level_select'); }}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={[styles.exitBtn, { color: colors.text2 }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.counter, { color: colors.text2 }]}>
        Nivel {selectedLevel} — {index + 1} {t.of} {levelItems.length}
      </Text>

      <View style={[styles.audioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.audioEmoji}>🎧</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: replaysLeft > 0 && !isSpeaking ? colors.primary : colors.border }]}
          onPress={replay} disabled={replaysLeft <= 0 || isSpeaking}
        >
          <Text style={styles.btnText}>{t.replayBtn}</Text>
        </TouchableOpacity>
        <Text style={[styles.replayCount, { color: colors.text2 }]}>{replaysLeft} {t.replayLeft}</Text>
      </View>

      {phase === 'awaiting' && (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]}
            value={userInput} onChangeText={setUserInput}
            placeholder={t.inputPlaceholder} placeholderTextColor={colors.text2}
            autoCorrect={false} autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }, !userInput.trim() && styles.btnDisabled]}
            onPress={submit} disabled={!userInput.trim()}
          >
            <Text style={styles.btnText}>{t.submitBtn}</Text>
          </TouchableOpacity>
        </>
      )}

      {(phase === 'correct' || phase === 'incorrect') && (
        <View style={styles.resultArea}>
          <Text style={[styles.feedback, { color: phase === 'correct' ? '#4caf50' : '#f44336' }]}>
            {phase === 'correct' ? t.correct : t.incorrect}
          </Text>
          <View style={[styles.correctPhraseBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.correctPhraseLabel, { color: colors.text2 }]}>{t.correctPhrase}</Text>
            <Text style={[styles.correctPhraseText, { color: colors.text }]}>{current.phrase}</Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={advance}>
            <Text style={styles.btnText}>{index + 1 >= levelItems.length ? t.done : t.next}</Text>
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
  sub: { fontSize: s(13), lineHeight: s(20), marginBottom: s(4) },
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  exitBtn: { fontSize: s(20), padding: s(4) },
  backBtn: { fontSize: s(14), fontWeight: '600', padding: s(4) },
  levelCard: { padding: s(16), borderRadius: s(14), borderWidth: 1.5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelLocked: { opacity: 0.5 },
  levelLeft: { flex: 1, gap: s(2) },
  levelLabel: { fontSize: s(15), fontWeight: '700' },
  levelDesc: { fontSize: s(12) },
  levelRight: { alignItems: 'center', gap: s(2) },
  levelBest: { fontSize: s(16), fontWeight: '800' },
  levelBestLabel: { fontSize: s(10) },
  audioCard: { padding: s(20), borderRadius: s(14), borderWidth: 1, alignItems: 'center', gap: s(12) },
  audioEmoji: { fontSize: s(40) },
  replayCount: { fontSize: s(12) },
  input: { padding: s(14), borderRadius: s(10), borderWidth: 2, fontSize: s(16) },
  btn: { padding: s(14), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  resultArea: { gap: s(12) },
  feedback: { fontSize: s(18), fontWeight: '700', textAlign: 'center' },
  correctPhraseBox: { padding: s(14), borderRadius: s(10), gap: s(4) },
  correctPhraseLabel: { fontSize: s(12) },
  correctPhraseText: { fontSize: s(16), fontWeight: '600' },
  bigEmoji: { fontSize: s(56), textAlign: 'center' },
  scoreBox: { padding: s(24), borderRadius: s(16), borderWidth: 2, alignItems: 'center', gap: s(6), width: '100%' },
  scoreNum: { fontSize: s(48), fontWeight: '800' },
  scoreSub: { fontSize: s(13) },
  unlockMsg: { fontSize: s(13), fontWeight: '600', textAlign: 'center', marginTop: s(4) },
  rowBtns: { flexDirection: 'row', gap: s(10), width: '100%' },
});
