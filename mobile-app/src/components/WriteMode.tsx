import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Word } from '../types/Word';
import { useTheme } from '../context/ThemeContext';
import { addErrors } from '../utils/errorHistory';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').trim();
}

interface Props {
  words: Word[];
  onFinish: (correct: number, incorrect: number) => void;
}

export const WriteMode: React.FC<Props> = ({ words, onFinish }) => {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [failedWords, setFailedWords] = useState<Word[]>([]);
  const inputRef = useRef<TextInput>(null);

  const current = words[index];

  useEffect(() => {
    setInput(''); setStatus('idle');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [index]);

  const check = () => {
    if (!input.trim()) return;
    if (normalize(input) === normalize(current.word)) {
      setStatus('correct'); setCorrectCount(c => c + 1);
    } else {
      setStatus('wrong'); setIncorrectCount(c => c + 1);
      setFailedWords(prev => [...prev, current]);
    }
  };

  const reveal = () => {
    setStatus('revealed'); setIncorrectCount(c => c + 1);
    setFailedWords(prev => [...prev, current]);
  };

  const next = () => {
    if (index < words.length - 1) {
      setIndex(i => i + 1);
    } else {
      if (failedWords.length > 0) addErrors(failedWords);
      onFinish(correctCount, incorrectCount);
    }
  };

  const isLast = index === words.length - 1;
  const answered = status !== 'idle';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.counter, { color: colors.text2 }]}>{index + 1} / {words.length}</Text>

        <Text style={[styles.meaning, { color: colors.primary }]}>{current.meaning}</Text>
        {current.pronunciation ? <Text style={[styles.hint, { color: colors.text2 }]}>({current.pronunciation})</Text> : null}

        {status === 'idle' && (
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.primary, color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe la palabra en español..."
            placeholderTextColor={colors.text2}
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={check}
          />
        )}

        {status === 'correct' && (
          <Text style={styles.resultCorrect}>✓ {current.word}</Text>
        )}
        {(status === 'wrong' || status === 'revealed') && (
          <View style={styles.resultWrong}>
            <Text style={styles.userAnswer}>✗ {input || '—'}</Text>
            <Text style={styles.correctAnswer}>→ {current.word}</Text>
          </View>
        )}

        {answered && current.examples?.slice(0, 2).map((ex, i) => (
          <Text key={i} style={[styles.example, { backgroundColor: colors.surface2, color: colors.text2 }]}>• {ex}</Text>
        ))}

        <View style={styles.actions}>
          {!answered ? (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }, !input.trim() && styles.btnDisabled]}
                onPress={check} disabled={!input.trim()}
              >
                <Text style={styles.btnText}>✓ Verificar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.revealBtn, { borderColor: colors.border }]} onPress={reveal}>
                <Text style={[styles.btnText, { color: colors.text2 }]}>👁 Revelar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.btn, styles.nextBtn]} onPress={next}>
              <Text style={styles.btnText}>{isLast ? '🏁 Finalizar' : 'Siguiente →'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  card: { padding: s(20), alignItems: 'center', gap: s(14), flexGrow: 1 },
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  meaning: { fontSize: s(36), fontWeight: 'bold', textAlign: 'center', direction: 'rtl' } as any,
  hint: { fontSize: s(14), fontStyle: 'italic' },
  input: {
    width: '100%', padding: s(14), fontSize: s(20),
    borderWidth: 2, borderRadius: s(10), textAlign: 'center',
  },
  resultCorrect: { fontSize: s(24), fontWeight: 'bold', color: '#4caf50' },
  resultWrong: { alignItems: 'center', gap: s(4) },
  userAnswer: { fontSize: s(18), color: '#f44336' },
  correctAnswer: { fontSize: s(22), fontWeight: 'bold', color: '#4caf50' },
  example: { width: '100%', padding: s(8), borderRadius: s(6), fontSize: s(13) },
  actions: { flexDirection: 'row', gap: s(10), width: '100%', marginTop: s(8) },
  btn: { flex: 1, padding: s(14), borderRadius: s(10), alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  revealBtn: { backgroundColor: 'transparent', borderWidth: 1.5 },
  nextBtn: { backgroundColor: '#4caf50' },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: 'bold' },
});
