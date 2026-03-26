import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated,
} from 'react-native';
import { Word, Language } from '../types/Word';
import { useTheme } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { stateApi } from '../utils/stateApi';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const wodLabels: Record<Language, { label: string; btn: string }> = {
  he: { label: '✨ מילת היום',   btn: 'התחל ←' },
  es: { label: '✨ Palabra del día', btn: 'Empezar →' },
  en: { label: '✨ Word of the day', btn: 'Start →' },
};

interface Props {
  allWords: Word[];
  uiLanguage: Language;
}

export const WordOfDay: React.FC<Props> = ({ allWords, uiLanguage }) => {
  const { colors } = useTheme();
  const [word, setWord] = useState<Word | null>(null);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = new Animated.Value(0);
  const lbl = wodLabels[uiLanguage] ?? wodLabels.he;

  useEffect(() => {
    if (allWords.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      stateApi.get<string>('preferences', 'wod_seen', ''),
      stateApi.get<string>('preferences', 'wod_date', ''),
      stateApi.get<string>('preferences', 'wod_id', ''),
    ]).then(([seen, date, id]) => {

      if (seen === today) return; // ya se mostró hoy

      const pool = allWords.filter(w => !['Gramática', 'Raíz'].includes(w.topic));
      let wod: Word | undefined;

      if (date === today && id) {
        wod = pool.find(w => `${w.word}_${w.topic}` === id);
      }
      if (!wod) {
        wod = pool[Math.floor(Math.random() * pool.length)];
        const wodId = `${wod.word}_${wod.topic}`;
        stateApi.bulkSet('preferences', [
          { key: 'wod_date', value: today },
          { key: 'wod_id', value: wodId },
        ]).catch(() => {});
      }

      stateApi.set('preferences', 'wod_seen', today).catch(() => {});
      setWord(wod);
    });
  }, [allWords.length]);

  // Auto-flip after 3s, auto-close after 8s
  useEffect(() => {
    if (!word) return;
    const flipTimer = setTimeout(() => {
      setFlipped(true);
      Animated.timing(flipAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 3000);
    const closeTimer = setTimeout(() => setWord(null), 8000);
    return () => { clearTimeout(flipTimer); clearTimeout(closeTimer); };
  }, [word?.word]);

  if (!word) return null;

  return (
    <Modal transparent animationType="fade" visible={!!word}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.primary }]}>{lbl.label}</Text>

          <View style={[styles.card, flipped
            ? { backgroundColor: colors.cardBack }
            : { backgroundColor: colors.cardFront, borderColor: colors.border, borderWidth: 1 }
          ]}>
            {!flipped ? (
              <View style={styles.cardContent}>
                <Text style={[styles.word, { color: colors.text }]}>{word.word}</Text>
                {word.genre ? <Text style={[styles.genre, { color: colors.text2 }]}>({word.genre})</Text> : null}
              </View>
            ) : (
              <View style={styles.cardContent}>
                <Text style={styles.pronunciation}>({word.pronunciation})</Text>
                <Text style={styles.meaning}>{word.meaning}</Text>
                {word.examples.slice(0, 2).map((ex, i) => (
                  <Text key={i} style={styles.example}>• {ex}</Text>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => setWord(null)}
          >
            <Text style={styles.btnText}>{lbl.btn}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(20),
  },
  modal: {
    width: '100%',
    maxWidth: s(380),
    borderRadius: s(20),
    padding: s(28),
    alignItems: 'center',
    gap: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  label: {
    fontSize: s(13),
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    borderRadius: s(14),
    minHeight: s(180),
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(20),
  },
  cardContent: {
    alignItems: 'center',
    gap: s(8),
  },
  word: {
    fontSize: s(52),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  genre: {
    fontSize: s(13),
    fontStyle: 'italic',
  },
  pronunciation: {
    fontSize: s(16),
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  meaning: {
    fontSize: s(26),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  example: {
    fontSize: s(12),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  btn: {
    paddingVertical: s(12),
    paddingHorizontal: s(40),
    borderRadius: s(10),
  },
  btnText: {
    color: '#fff',
    fontSize: s(16),
    fontWeight: 'bold',
  },
});
