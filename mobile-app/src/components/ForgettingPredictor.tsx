/**
 * ForgettingPredictor — Predictor de olvido
 * Muestra palabras que el usuario va a olvidar pronto basado en SRS.
 * Agrupa por urgencia: hoy, mañana, esta semana.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { Language, Word } from '../types/Word';
import { getSRSData } from '../utils/srs';
import { getAllWords } from '../utils/dataService';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const L: Record<Language, {
  title: string; sub: string; close: string;
  todayLabel: string; tomorrowLabel: string; weekLabel: string;
  noWords: string; reviewNow: string; wordsAt: string;
  urgencyHigh: string; urgencyMed: string; urgencyLow: string;
}> = {
  he: {
    title: '🔮 חיזוי שכחה', sub: 'מילים שאתה עלול לשכוח בקרוב',
    close: 'סגור', todayLabel: 'היום', tomorrowLabel: 'מחר', weekLabel: 'השבוע',
    noWords: 'אין מילים לחזרה כרגע. כל הכבוד!',
    reviewNow: 'חזור עכשיו', wordsAt: 'מילים',
    urgencyHigh: '🔴 דחוף', urgencyMed: '🟡 בקרוב', urgencyLow: '🟢 השבוע',
  },
  es: {
    title: '🔮 Predictor de Olvido', sub: 'Palabras que podrías olvidar pronto',
    close: 'Cerrar', todayLabel: 'Hoy', tomorrowLabel: 'Mañana', weekLabel: 'Esta semana',
    noWords: 'No hay palabras pendientes. ¡Excelente!',
    reviewNow: 'Repasar ahora', wordsAt: 'palabras',
    urgencyHigh: '🔴 Urgente', urgencyMed: '🟡 Pronto', urgencyLow: '🟢 Esta semana',
  },
  en: {
    title: '🔮 Forgetting Predictor', sub: 'Words you might forget soon',
    close: 'Close', todayLabel: 'Today', tomorrowLabel: 'Tomorrow', weekLabel: 'This week',
    noWords: 'No words due. Excellent!',
    reviewNow: 'Review now', wordsAt: 'words',
    urgencyHigh: '🔴 Urgent', urgencyMed: '🟡 Soon', urgencyLow: '🟢 This week',
  },
};

interface DueWord {
  word: Word;
  daysUntilDue: number;
  mastery: number;
  easeFactor: number;
}

function getTTSLocale(language: string): string {
  if (language === 'Hebreo' || language === 'Hebrew') return 'he-IL';
  return 'es-ES';
}

interface Props {
  language: string;
  uiLanguage: Language;
  onClose: () => void;
}

export const ForgettingPredictor: React.FC<Props> = ({ language, uiLanguage, onClose }) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;
  const [dueWords, setDueWords] = useState<DueWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const srsData = await getSRSData();
      const allWords = getAllWords().filter(w => w.language === language);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result: DueWord[] = [];
      for (const word of allWords) {
        const key = `${word.language}_${word.word}_${word.topic}`;
        const card = srsData[key];
        if (!card) continue;
        const nextReview = new Date(card.nextReview);
        nextReview.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.round((nextReview.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 7) {
          result.push({ word, daysUntilDue, mastery: card.mastery, easeFactor: card.easeFactor });
        }
      }

      result.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      setDueWords(result);
      setLoading(false);
    })();
    return () => { Speech.stop(); };
  }, [language]);

  const speakWord = (word: string) => {
    if (speaking === word) { Speech.stop(); setSpeaking(null); return; }
    setSpeaking(word);
    Speech.speak(word, {
      language: getTTSLocale(language),
      onDone: () => setSpeaking(null),
      onError: () => setSpeaking(null),
    });
  };

  const today = dueWords.filter(w => w.daysUntilDue <= 0);
  const tomorrow = dueWords.filter(w => w.daysUntilDue === 1);
  const thisWeek = dueWords.filter(w => w.daysUntilDue >= 2 && w.daysUntilDue <= 7);

  const renderGroup = (words: DueWord[], label: string, urgency: string, color: string) => {
    if (words.length === 0) return null;
    return (
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Text style={[styles.groupLabel, { color }]}>{urgency}</Text>
          <Text style={[styles.groupCount, { color: colors.text2 }]}>{words.length} {t.wordsAt}</Text>
        </View>
        {words.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.wordCard, { backgroundColor: colors.surface, borderColor: color + '44' }]}
            onPress={() => speakWord(item.word.word)}
          >
            <View style={styles.wordLeft}>
              <Text style={[styles.wordText, { color: colors.text }]}>{item.word.word}</Text>
              <Text style={[styles.wordMeaning, { color: colors.text2 }]}>{item.word.meaning}</Text>
              <Text style={[styles.wordTopic, { color: colors.text2 }]}>{item.word.topic}</Text>
            </View>
            <View style={styles.wordRight}>
              <Text style={[styles.masteryStars, { color }]}>
                {'★'.repeat(item.mastery)}{'☆'.repeat(5 - item.mastery)}
              </Text>
              <Text style={[styles.daysLabel, { color }]}>
                {item.daysUntilDue <= 0 ? '⚠️ Hoy' : `${item.daysUntilDue}d`}
              </Text>
              <Text style={styles.speakIcon}>{speaking === item.word.word ? '🔊' : '🔈'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.sub, { color: colors.text2 }]}>{t.sub}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.closeBtn, { color: colors.text2 }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: s(40) }} />
      ) : dueWords.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={[styles.noWords, { color: colors.text2 }]}>{t.noWords}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderGroup(today, t.todayLabel, t.urgencyHigh, '#f44336')}
          {renderGroup(tomorrow, t.tomorrowLabel, t.urgencyMed, '#ffc107')}
          {renderGroup(thisWeek, t.weekLabel, t.urgencyLow, '#4caf50')}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: s(20), gap: s(12) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: s(18), fontWeight: '800' },
  sub: { fontSize: s(12), marginTop: s(2) },
  closeBtn: { fontSize: s(22), padding: s(4) },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: s(12) },
  emptyEmoji: { fontSize: s(56) },
  noWords: { fontSize: s(15), textAlign: 'center' },
  group: { marginBottom: s(16), gap: s(8) },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupLabel: { fontSize: s(14), fontWeight: '800' },
  groupCount: { fontSize: s(12) },
  wordCard: { flexDirection: 'row', padding: s(12), borderRadius: s(10), borderWidth: 1, justifyContent: 'space-between', alignItems: 'center' },
  wordLeft: { flex: 1, gap: s(2) },
  wordText: { fontSize: s(16), fontWeight: '700' },
  wordMeaning: { fontSize: s(12) },
  wordTopic: { fontSize: s(11), fontStyle: 'italic' },
  wordRight: { alignItems: 'flex-end', gap: s(2) },
  masteryStars: { fontSize: s(12) },
  daysLabel: { fontSize: s(12), fontWeight: '700' },
  speakIcon: { fontSize: s(16) },
});
