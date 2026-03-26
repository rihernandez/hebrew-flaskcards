import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DailyChallenge } from '../utils/dailyChallenge';
import { Language } from '../types/Word';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const labels: Record<Language, {
  title: string; sub: string; btn: string; done: string; words: string;
}> = {
  he: {
    title: '🧠 מילות היום',
    sub: 'שנן את 10 המילים של היום',
    btn: 'התחל לשנן ←',
    done: '✅ שוננו היום!',
    words: 'מילים',
  },
  es: {
    title: '🧠 Palabras de hoy',
    sub: 'Memoriza las 10 palabras del día',
    btn: 'Empezar a memorizar →',
    done: '✅ ¡Memorizadas hoy!',
    words: 'palabras',
  },
  en: {
    title: "🧠 Today's words",
    sub: "Memorize today's 10 words",
    btn: 'Start memorizing →',
    done: '✅ Memorized today!',
    words: 'words',
  },
};

interface Props {
  challenge: DailyChallenge;
  uiLanguage: Language;
  onStart: () => void;
}

export const DailyChallengeCard: React.FC<Props> = ({ challenge, uiLanguage, onStart }) => {
  const { colors } = useTheme();
  const t = labels[uiLanguage] ?? labels.he;
  const accent = '#a18cd1';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: accent }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.sub, { color: colors.text2 }]}>
            {challenge.words.length} {t.words} · {t.sub}
          </Text>
        </View>

        {challenge.memorizeCompleted ? (
          <Text style={styles.done}>{t.done}</Text>
        ) : (
          <TouchableOpacity style={[styles.btn, { backgroundColor: accent }]} onPress={onStart}>
            <Text style={styles.btnText}>{t.btn}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {challenge.words.slice(0, 10).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, {
              backgroundColor: challenge.memorizeCompleted ? accent : colors.border,
            }]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: s(15), marginTop: s(10),
    padding: s(14), borderRadius: s(12),
    borderLeftWidth: s(4), gap: s(10),
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: s(10) },
  left: { flex: 1, gap: s(4) },
  title: { fontSize: s(15), fontWeight: '700' },
  sub: { fontSize: s(12) },
  btn: { paddingVertical: s(10), paddingHorizontal: s(14), borderRadius: s(10) },
  btnText: { color: '#fff', fontSize: s(13), fontWeight: '700' },
  done: { fontSize: s(13), fontWeight: '700', color: '#4caf50' },
  dots: { flexDirection: 'row', gap: s(4), flexWrap: 'wrap' },
  dot: { width: s(8), height: s(8), borderRadius: s(4) },
});
