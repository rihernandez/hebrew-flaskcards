/**
 * NightReview — Repaso nocturno
 * 5 palabras que el usuario falló hoy, presentadas como flashcards rápidas.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language, Word } from '../types/Word';
import { getErrors } from '../utils/errorHistory';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const L: Record<Language, {
  title: string; sub: string; close: string;
  tapToFlip: string; knew: string; didntKnow: string;
  summaryTitle: string; done: string; noErrors: string;
  of: string; correct: string; incorrect: string;
}> = {
  he: {
    title: '🌙 חזרה לילית', sub: 'חזור על המילים שטעית בהן היום',
    close: 'סגור', tapToFlip: 'לחץ להפוך', knew: '✓ ידעתי', didntKnow: '✗ לא ידעתי',
    summaryTitle: '🌙 סיום חזרה', done: 'סיום', noErrors: 'אין שגיאות להיום. כל הכבוד!',
    of: 'מתוך', correct: 'ידעתי', incorrect: 'לא ידעתי',
  },
  es: {
    title: '🌙 Repaso Nocturno', sub: 'Repasa las palabras que fallaste hoy',
    close: 'Cerrar', tapToFlip: 'Toca para voltear', knew: '✓ Lo sabía', didntKnow: '✗ No lo sabía',
    summaryTitle: '🌙 Repaso completado', done: 'Cerrar', noErrors: 'Sin errores hoy. ¡Excelente!',
    of: 'de', correct: 'Sabía', incorrect: 'No sabía',
  },
  en: {
    title: '🌙 Night Review', sub: 'Review the words you missed today',
    close: 'Close', tapToFlip: 'Tap to flip', knew: '✓ I knew it', didntKnow: '✗ Didn\'t know',
    summaryTitle: '🌙 Review complete', done: 'Close', noErrors: 'No errors today. Excellent!',
    of: 'of', correct: 'Knew', incorrect: 'Didn\'t know',
  },
};

function getTTSLocale(language: string): string {
  if (language === 'Hebreo' || language === 'Hebrew') return 'he-IL';
  return 'es-ES';
}

interface Props {
  language: string;
  uiLanguage: Language;
  onClose: () => void;
}

export const NightReview: React.FC<Props> = ({ language, uiLanguage, onClose }) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;

  const [words, setWords] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const flipAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    getErrors(language).then(errors => {
      const shuffled = [...errors].sort(() => Math.random() - 0.5).slice(0, 5);
      setWords(shuffled);
    });
    return () => { Speech.stop(); };
  }, [language]);

  const flip = () => {
    if (flipped) return;
    Animated.spring(flipAnim, { toValue: 1, useNativeDriver: true }).start();
    setFlipped(true);
    // auto-speak the word
    if (words[index]) {
      Speech.speak(words[index].word, { language: getTTSLocale(language) });
    }
  };

  const answer = (knew: boolean) => {
    const newResults = [...results, knew];
    setResults(newResults);
    if (index + 1 >= words.length) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setFlipped(false);
    flipAnim.setValue(0);
  };

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  if (words.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeBtn, { color: colors.text2 }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={[styles.noErrors, { color: colors.text2 }]}>{t.noErrors}</Text>
        </View>
      </View>
    );
  }

  if (done) {
    const correct = results.filter(Boolean).length;
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t.summaryTitle}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeBtn, { color: colors.text2 }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryEmoji}>{correct >= words.length * 0.8 ? '🌟' : correct >= words.length * 0.5 ? '👍' : '💪'}</Text>
          <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>{correct}/{words.length}</Text>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreItem, { color: '#4caf50' }]}>✓ {correct} {t.correct}</Text>
              <Text style={[styles.scoreItem, { color: '#f44336' }]}>✗ {words.length - correct} {t.incorrect}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={styles.btnText}>{t.done}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const current = words[index];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.closeBtn, { color: colors.text2 }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.counter, { color: colors.text2 }]}>{index + 1} {t.of} {words.length}</Text>

      {/* Flip card */}
      <TouchableOpacity style={styles.cardArea} onPress={flip} activeOpacity={0.9}>
        {/* Front */}
        <Animated.View style={[
          styles.card, styles.cardFront,
          { backgroundColor: colors.primary + '15', borderColor: colors.primary },
          { transform: [{ rotateY: frontRotate }] },
        ]}>
          <Text style={[styles.cardWord, { color: colors.text }]}>{current.word}</Text>
          <Text style={[styles.cardHint, { color: colors.text2 }]}>{t.tapToFlip}</Text>
        </Animated.View>

        {/* Back */}
        <Animated.View style={[
          styles.card, styles.cardBack,
          { backgroundColor: colors.primary, borderColor: colors.primary },
          { transform: [{ rotateY: backRotate }] },
        ]}>
          <Text style={[styles.cardMeaning, { color: '#fff' }]}>{current.meaning}</Text>
          {current.pronunciation && (
            <Text style={[styles.cardPronunciation, { color: 'rgba(255,255,255,0.8)' }]}>({current.pronunciation})</Text>
          )}
          <Text style={[styles.cardTopic, { color: 'rgba(255,255,255,0.7)' }]}>{current.topic}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Answer buttons — only shown when flipped */}
      {flipped && (
        <View style={styles.answerRow}>
          <TouchableOpacity style={[styles.answerBtn, { backgroundColor: '#f44336' }]} onPress={() => answer(false)}>
            <Text style={styles.answerBtnText}>{t.didntKnow}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.answerBtn, { backgroundColor: '#4caf50' }]} onPress={() => answer(true)}>
            <Text style={styles.answerBtnText}>{t.knew}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: s(20), gap: s(14) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: s(18), fontWeight: '800' },
  closeBtn: { fontSize: s(22), padding: s(4) },
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: s(12) },
  emptyEmoji: { fontSize: s(56) },
  noErrors: { fontSize: s(15), textAlign: 'center' },
  cardArea: { flex: 1, justifyContent: 'center' },
  card: { position: 'absolute', width: '100%', aspectRatio: 1.4, borderRadius: s(20), borderWidth: 2, justifyContent: 'center', alignItems: 'center', gap: s(8), backfaceVisibility: 'hidden', padding: s(20) },
  cardFront: {},
  cardBack: {},
  cardWord: { fontSize: s(32), fontWeight: '800', textAlign: 'center' },
  cardHint: { fontSize: s(12), fontStyle: 'italic' },
  cardMeaning: { fontSize: s(24), fontWeight: '700', textAlign: 'center' },
  cardPronunciation: { fontSize: s(14) },
  cardTopic: { fontSize: s(12) },
  answerRow: { flexDirection: 'row', gap: s(12) },
  answerBtn: { flex: 1, padding: s(16), borderRadius: s(12), alignItems: 'center' },
  answerBtnText: { color: '#fff', fontSize: s(15), fontWeight: '700' },
  summary: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: s(16) },
  summaryEmoji: { fontSize: s(56) },
  scoreBox: { padding: s(24), borderRadius: s(16), borderWidth: 1, alignItems: 'center', gap: s(8), width: '100%' },
  scoreNum: { fontSize: s(48), fontWeight: '800' },
  scoreRow: { flexDirection: 'row', gap: s(16) },
  scoreItem: { fontSize: s(14), fontWeight: '600' },
  btn: { padding: s(16), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
});
