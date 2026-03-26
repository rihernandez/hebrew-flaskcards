/**
 * SpeakingSession — flujo diario de speaking
 * Fase 1: Shadowing (leer frases en voz alta)
 * Fase 2: Conversación guiada (situaciones)
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Dimensions, TextInput, Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { ShadowPhrase, ConversationSituation } from '../utils/speakingContent';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

// ─── i18n ────────────────────────────────────────────────────────────────────
const L: Record<Language, {
  shadowTitle: string; shadowSub: string; listenBtn: string; readAloud: string;
  gotIt: string; next: string; skip: string;
  convTitle: string; convSub: string; yourAnswer: string; checkBtn: string;
  showExample: string; wellDone: string; missing: string; nextSit: string;
  doneTitle: string; doneSub: string; finish: string;
  phaseOf: string;
}> = {
  he: {
    shadowTitle: '🗣️ שאדואינג', shadowSub: 'קרא את המשפט בקול רם',
    listenBtn: '🔊 האזן', readAloud: 'קרא בקול רם ולחץ המשך',
    gotIt: '✓ הבנתי', next: 'הבא →', skip: 'דלג',
    convTitle: '💬 שיחה', convSub: 'ענה בספרדית בקול רם',
    yourAnswer: 'מה אמרת? (כתוב אם אין מיקרופון)',
    checkBtn: '✓ בדוק', showExample: '👁 הצג דוגמה', wellDone: '✓ כל הכבוד!',
    missing: 'מילים שחסרו:', nextSit: 'מצב הבא →',
    doneTitle: '🎉 כל הכבוד!', doneSub: 'סיימת את אימון הדיבור של היום',
    finish: 'סיום ✓', phaseOf: 'מתוך',
  },
  es: {
    shadowTitle: '🗣️ Shadowing', shadowSub: 'Lee la frase en voz alta',
    listenBtn: '🔊 Escuchar', readAloud: 'Lee en voz alta y presiona continuar',
    gotIt: '✓ Entendido', next: 'Siguiente →', skip: 'Saltar',
    convTitle: '💬 Conversación', convSub: 'Responde en español en voz alta',
    yourAnswer: '¿Qué dijiste? (escribe si no hay micrófono)',
    checkBtn: '✓ Verificar', showExample: '👁 Ver ejemplo', wellDone: '✓ ¡Muy bien!',
    missing: 'Palabras que faltaron:', nextSit: 'Siguiente situación →',
    doneTitle: '🎉 ¡Muy bien!', doneSub: 'Completaste el entrenamiento de speaking de hoy',
    finish: 'Finalizar ✓', phaseOf: 'de',
  },
  en: {
    shadowTitle: '🗣️ Shadowing', shadowSub: 'Read the phrase out loud',
    listenBtn: '🔊 Listen', readAloud: 'Read aloud and press continue',
    gotIt: '✓ Got it', next: 'Next →', skip: 'Skip',
    convTitle: '💬 Conversation', convSub: 'Answer in Spanish out loud',
    yourAnswer: 'What did you say? (type if no microphone)',
    checkBtn: '✓ Check', showExample: '👁 Show example', wellDone: '✓ Well done!',
    missing: 'Missing words:', nextSit: 'Next situation →',
    doneTitle: '🎉 Well done!', doneSub: "You completed today's speaking training",
    finish: 'Finish ✓', phaseOf: 'of',
  },
};

type Phase = 'shadow' | 'conversation' | 'done';

interface Props {
  phrases: ShadowPhrase[];
  situations: ConversationSituation[];
  uiLanguage: Language;
  onDone: () => void;
  onSkip: () => void;
}

export const SpeakingSession: React.FC<Props> = ({
  phrases, situations, uiLanguage, onDone, onSkip,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.he;

  const [phase, setPhase] = useState<Phase>('shadow');
  const [shadowIndex, setShadowIndex] = useState(0);
  const [sitIndex, setSitIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentPhrase = phrases[shadowIndex];
  const currentSit = situations[sitIndex];

  const speak = (text: string) => {
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); return; }
    setIsSpeaking(true);
    // detect locale from phrases language
    const isHebrew = phrases[0]?.phrase?.match(/[\u0590-\u05FF]/);
    const locale = isHebrew ? 'he-IL' : 'es-ES';
    Speech.speak(text, {
      language: locale,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  useEffect(() => { return () => { Speech.stop(); }; }, []);

  const checkAnswer = () => {
    setChecked(true);
  };

  const matchedKeywords = (sit: ConversationSituation): string[] => {
    const lower = userInput.toLowerCase();
    return sit.expectedKeywords.filter(k => lower.includes(k.toLowerCase()));
  };

  const missingKeywords = (sit: ConversationSituation): string[] => {
    const lower = userInput.toLowerCase();
    return sit.expectedKeywords.filter(k => !lower.includes(k.toLowerCase()));
  };

  // ─── PHASE: shadow ───────────────────────────────────────────────────────
  if (phase === 'shadow' && currentPhrase) {
    return (
      <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.phaseLabel, { color: colors.primary }]}>{t.shadowTitle}</Text>
        <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.shadowSub}</Text>
        <Text style={[styles.counter, { color: colors.text2 }]}>
          {shadowIndex + 1} {t.phaseOf} {phrases.length}
        </Text>

        <View style={[styles.phraseCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
          <Text style={[styles.phraseText, { color: colors.text }]}>{currentPhrase.phrase}</Text>
          <Text style={[styles.translation, { color: colors.text2 }]}>{currentPhrase.translation}</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: isSpeaking ? '#ff9800' : colors.primary }]}
          onPress={() => speak(currentPhrase.phrase)}
        >
          <Text style={styles.btnText}>{isSpeaking ? '⏹ Detener' : t.listenBtn}</Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.text2 }]}>{t.readAloud}</Text>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#4caf50' }]}
          onPress={() => {
            Speech.stop();
            const next = shadowIndex + 1;
            if (next >= phrases.length) setPhase('conversation');
            else setShadowIndex(next);
          }}
        >
          <Text style={styles.btnText}>{shadowIndex + 1 >= phrases.length ? t.convTitle : t.next}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.text2 }]}>{t.skip}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── PHASE: conversation ─────────────────────────────────────────────────
  if (phase === 'conversation' && currentSit) {
    const matched = checked ? matchedKeywords(currentSit) : [];
    const missing = checked ? missingKeywords(currentSit) : [];
    const score = checked ? Math.round((matched.length / currentSit.expectedKeywords.length) * 100) : 0;

    return (
      <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.phaseLabel, { color: colors.primary }]}>{t.convTitle}</Text>
        <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.convSub}</Text>
        <Text style={[styles.counter, { color: colors.text2 }]}>
          {sitIndex + 1} {t.phaseOf} {situations.length}
        </Text>

        <View style={[styles.situationCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Text style={styles.sitEmoji}>{currentSit.emoji}</Text>
          <Text style={[styles.sitTitle, { color: colors.text }]}>{currentSit.title}</Text>
          <Text style={[styles.sitPrompt, { color: colors.text2 }]}>{currentSit.prompt}</Text>
        </View>

        {!checked ? (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.primary, color: colors.text }]}
              value={userInput} onChangeText={setUserInput}
              placeholder={t.yourAnswer} placeholderTextColor={colors.text2}
              multiline autoCorrect={false} autoCapitalize="none"
            />
            <View style={styles.rowBtns}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }, !userInput.trim() && styles.btnDisabled]}
                onPress={checkAnswer} disabled={!userInput.trim()}
              >
                <Text style={styles.btnText}>{t.checkBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.outlineBtn, { borderColor: colors.border, flex: 1 }]}
                onPress={() => setShowExample(!showExample)}
              >
                <Text style={[styles.btnText, { color: colors.text2 }]}>{t.showExample}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.resultArea}>
            <Text style={[styles.scoreText, { color: score >= 60 ? '#4caf50' : '#ff9800' }]}>{score}%</Text>
            {matched.length > 0 && (
              <Text style={[styles.wellDone, { color: '#4caf50' }]}>
                {t.wellDone} {matched.join(', ')}
              </Text>
            )}
            {missing.length > 0 && (
              <Text style={[styles.missing, { color: '#f44336' }]}>
                {t.missing} {missing.join(', ')}
              </Text>
            )}
            <View style={[styles.exampleBox, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.exampleText, { color: colors.text2 }]}>{currentSit.exampleAnswer}</Text>
            </View>
          </View>
        )}

        {showExample && !checked && (
          <View style={[styles.exampleBox, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.exampleText, { color: colors.text2 }]}>{currentSit.exampleAnswer}</Text>
          </View>
        )}

        {checked && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#4caf50' }]}
            onPress={() => {
              const next = sitIndex + 1;
              if (next >= situations.length) setPhase('done');
              else { setSitIndex(next); setUserInput(''); setChecked(false); setShowExample(false); }
            }}
          >
            <Text style={styles.btnText}>
              {sitIndex + 1 >= situations.length ? t.doneTitle : t.nextSit}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ─── PHASE: done ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.card, styles.centerCard, { backgroundColor: colors.surface }]}>
      <Text style={styles.doneEmoji}>🎉</Text>
      <Text style={[styles.doneTitle, { color: colors.text }]}>{t.doneTitle}</Text>
      <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.doneSub}</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50', marginTop: s(24) }]} onPress={onDone}>
        <Text style={styles.btnText}>{t.finish}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: s(20), gap: s(12), flexGrow: 1 },
  centerCard: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  phaseLabel: { fontSize: s(13), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  phaseSub: { fontSize: s(14), textAlign: 'center', lineHeight: s(20) },
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  phraseCard: { width: '100%', padding: s(20), borderRadius: s(14), borderWidth: 1.5, alignItems: 'center', gap: s(8) },
  phraseText: { fontSize: s(22), fontWeight: '700', textAlign: 'center' },
  translation: { fontSize: s(14), textAlign: 'center', fontStyle: 'italic' },
  hint: { fontSize: s(12), textAlign: 'center' },
  situationCard: { width: '100%', padding: s(16), borderRadius: s(14), borderWidth: 1, alignItems: 'center', gap: s(6) },
  sitEmoji: { fontSize: s(36) },
  sitTitle: { fontSize: s(18), fontWeight: '700', textAlign: 'center' },
  sitPrompt: { fontSize: s(14), textAlign: 'center', lineHeight: s(20) },
  input: { width: '100%', padding: s(14), fontSize: s(16), borderWidth: 2, borderRadius: s(10), minHeight: s(80), textAlignVertical: 'top' },
  rowBtns: { flexDirection: 'row', gap: s(10), width: '100%' },
  btn: { padding: s(14), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnDisabled: { opacity: 0.4 },
  outlineBtn: { backgroundColor: 'transparent', borderWidth: 1.5 },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: s(8) },
  skipText: { fontSize: s(13) },
  resultArea: { width: '100%', gap: s(8), alignItems: 'center' },
  scoreText: { fontSize: s(48), fontWeight: '800' },
  wellDone: { fontSize: s(14), textAlign: 'center' },
  missing: { fontSize: s(14), textAlign: 'center' },
  exampleBox: { width: '100%', padding: s(14), borderRadius: s(10) },
  exampleText: { fontSize: s(14), fontStyle: 'italic', textAlign: 'center' },
  doneEmoji: { fontSize: s(56), textAlign: 'center' },
  doneTitle: { fontSize: s(24), fontWeight: '800', textAlign: 'center' },
});
