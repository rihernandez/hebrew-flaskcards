import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import { Word } from '../types/Word';
import { useTheme } from '../context/ThemeContext';
import { addErrors } from '../utils/errorHistory';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  words: Word[];
  allWords: Word[];
  onFinish: (correct: number, incorrect: number) => void;
}

export const QuizMode: React.FC<Props> = ({ words, allWords, onFinish }) => {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [failedWords, setFailedWords] = useState<Word[]>([]);

  const current = words[index];
  if (!current) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyStateText, { color: colors.text2 }]}>No hay palabras disponibles.</Text>
      </View>
    );
  }
  const wordKey = `${current.word}_${current.topic}`;

  const pool = useMemo(
    () => allWords.filter(w => w.language === current.language && `${w.word}_${w.topic}` !== wordKey),
    [allWords, wordKey]
  );

  const options = useMemo(() => {
    const distractors = shuffle(pool).slice(0, 3);
    return shuffle([current, ...distractors]);
  }, [current, pool]);

  useEffect(() => { setSelected(null); }, [index]);

  const handleSelect = (opt: Word) => {
    if (selected !== null) return;
    const key = `${opt.word}_${opt.topic}`;
    setSelected(key);
    if (key === wordKey) {
      setCorrectCount(c => c + 1);
    } else {
      setIncorrectCount(c => c + 1);
      setFailedWords(prev => [...prev, current]);
    }
  };

  const next = () => {
    if (index < words.length - 1) {
      setIndex(i => i + 1);
    } else {
      if (failedWords.length > 0) addErrors(failedWords);
      onFinish(correctCount, incorrectCount);
    }
  };

  const answered = selected !== null;
  const isLast = index === words.length - 1;

  return (
    <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.counter, { color: colors.text2 }]}>{index + 1} / {words.length}</Text>

      <Text style={[styles.word, { color: colors.text }]}>{current.word}</Text>
      {current.pronunciation ? (
        <Text style={[styles.pronunciation, { color: colors.text2 }]}>({current.pronunciation})</Text>
      ) : null}

      <View style={styles.options}>
        {options.map((opt, i) => {
          const key = `${opt.word}_${opt.topic}`;
          const isCorrect = key === wordKey;
          const isSelected = key === selected;
          let bg = colors.surface2;
          let border = colors.border;
          let textColor = colors.text;
          if (answered) {
            if (isCorrect) { bg = '#e8f5e9'; border = '#4caf50'; textColor = '#2e7d32'; }
            else if (isSelected) { bg = '#ffebee'; border = '#f44336'; textColor = '#c62828'; }
          }
          return (
            <TouchableOpacity
              key={i}
              style={[styles.option, { backgroundColor: bg, borderColor: border }]}
              onPress={() => handleSelect(opt)}
              disabled={answered}
            >
              <Text style={[styles.optionText, { color: textColor }]}>{opt.meaning}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {answered && (
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: '#4caf50' }]} onPress={next}>
          <Text style={styles.nextBtnText}>{isLast ? '🏁 Finalizar' : 'Siguiente →'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: { padding: s(20), alignItems: 'center', gap: s(14), flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: s(20) },
  emptyStateText: { fontSize: s(16), textAlign: 'center' },
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  word: { fontSize: s(48), fontWeight: 'bold', textAlign: 'center' },
  pronunciation: { fontSize: s(14), fontStyle: 'italic' },
  options: { width: '100%', gap: s(10) },
  option: {
    width: '100%', padding: s(16),
    borderRadius: s(10), borderWidth: 2,
    alignItems: 'center',
  },
  optionText: { fontSize: s(18), textAlign: 'center', direction: 'rtl' } as any,
  nextBtn: { width: '100%', padding: s(14), borderRadius: s(10), alignItems: 'center', marginTop: s(8) },
  nextBtnText: { color: '#fff', fontSize: s(16), fontWeight: 'bold' },
});
