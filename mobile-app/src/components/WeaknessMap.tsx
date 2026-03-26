/**
 * WeaknessMap — Mapa de debilidades
 * Muestra un heatmap de temas ordenados por mastery promedio + errores.
 * Verde = dominado, amarillo = en progreso, rojo = débil.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { getSRSData, SRSCard } from '../utils/srs';
import { getErrors } from '../utils/errorHistory';
import { getTopics, getWords } from '../utils/dataService';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const L: Record<Language, {
  title: string; sub: string; close: string;
  strong: string; medium: string; weak: string; unseen: string;
  masteryLabel: string; errorsLabel: string; wordsLabel: string;
  noData: string;
}> = {
  he: {
    title: '🗺️ מפת חולשות', sub: 'ראה אילו נושאים דורשים תשומת לב',
    close: 'סגור', strong: 'חזק', medium: 'בינוני', weak: 'חלש', unseen: 'לא נראה',
    masteryLabel: 'שליטה', errorsLabel: 'שגיאות', wordsLabel: 'מילים',
    noData: 'אין נתונים עדיין. התחל ללמוד!',
  },
  es: {
    title: '🗺️ Mapa de Debilidades', sub: 'Ve qué temas necesitan más atención',
    close: 'Cerrar', strong: 'Fuerte', medium: 'Medio', weak: 'Débil', unseen: 'Sin ver',
    masteryLabel: 'Dominio', errorsLabel: 'Errores', wordsLabel: 'Palabras',
    noData: 'Sin datos aún. ¡Empieza a estudiar!',
  },
  en: {
    title: '🗺️ Weakness Map', sub: 'See which topics need more attention',
    close: 'Close', strong: 'Strong', medium: 'Medium', weak: 'Weak', unseen: 'Unseen',
    masteryLabel: 'Mastery', errorsLabel: 'Errors', wordsLabel: 'Words',
    noData: 'No data yet. Start studying!',
  },
};

interface TopicStats {
  topic: string;
  totalWords: number;
  seenWords: number;
  avgMastery: number; // 0-5
  errorCount: number;
  strength: 'strong' | 'medium' | 'weak' | 'unseen';
}

function strengthColor(s: TopicStats['strength']): string {
  switch (s) {
    case 'strong': return '#4caf50';
    case 'medium': return '#ffc107';
    case 'weak':   return '#f44336';
    default:       return '#9e9e9e';
  }
}

interface Props {
  language: string;
  uiLanguage: Language;
  onClose: () => void;
}

export const WeaknessMap: React.FC<Props> = ({ language, uiLanguage, onClose }) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;
  const [stats, setStats] = useState<TopicStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [srsData, errors] = await Promise.all([getSRSData(), getErrors(language)]);
      const errorKeys = new Set(errors.map(w => `${w.language}_${w.word}_${w.topic}`));
      const topics = getTopics(language);

      const result: TopicStats[] = topics.map(topic => {
        const words = getWords(language, topic);
        const cards: SRSCard[] = words
          .map(w => srsData[`${w.language}_${w.word}_${w.topic}`])
          .filter(Boolean) as SRSCard[];

        const seenWords = cards.length;
        const avgMastery = seenWords > 0
          ? cards.reduce((sum, c) => sum + c.mastery, 0) / seenWords
          : 0;
        const errorCount = words.filter(w => errorKeys.has(`${w.language}_${w.word}_${w.topic}`)).length;

        let strength: TopicStats['strength'];
        if (seenWords === 0) strength = 'unseen';
        else if (avgMastery >= 3.5 && errorCount === 0) strength = 'strong';
        else if (avgMastery >= 2) strength = 'medium';
        else strength = 'weak';

        return { topic, totalWords: words.length, seenWords, avgMastery, errorCount, strength };
      });

      // Sort: weak first, then medium, then strong, then unseen
      const order = { weak: 0, medium: 1, strong: 2, unseen: 3 };
      result.sort((a, b) => order[a.strength] - order[b.strength]);
      setStats(result);
      setLoading(false);
    })();
  }, [language]);

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

      {/* Legend */}
      <View style={styles.legend}>
        {(['strong', 'medium', 'weak', 'unseen'] as const).map(s => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: strengthColor(s) }]} />
            <Text style={[styles.legendLabel, { color: colors.text2 }]}>
              {t[s]}
            </Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: s(40) }} />
      ) : stats.length === 0 ? (
        <Text style={[styles.noData, { color: colors.text2 }]}>{t.noData}</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {stats.map(item => {
            const color = strengthColor(item.strength);
            const masteryPct = (item.avgMastery / 5) * 100;
            const seenPct = item.totalWords > 0 ? (item.seenWords / item.totalWords) * 100 : 0;
            return (
              <View key={item.topic} style={[styles.card, { backgroundColor: colors.surface, borderColor: color }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.strengthDot, { backgroundColor: color }]} />
                  <Text style={[styles.topicName, { color: colors.text }]}>{item.topic}</Text>
                  <Text style={[styles.topicBadge, { backgroundColor: color + '22', color }]}>
                    {item.strength === 'strong' ? t.strong
                      : item.strength === 'medium' ? t.medium
                      : item.strength === 'weak' ? t.weak : t.unseen}
                  </Text>
                </View>

                {/* Mastery bar */}
                <View style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.text2 }]}>{t.masteryLabel}</Text>
                  <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${masteryPct}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.barValue, { color }]}>{item.avgMastery.toFixed(1)}/5</Text>
                </View>

                {/* Seen bar */}
                <View style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.text2 }]}>{t.wordsLabel}</Text>
                  <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${seenPct}%` as any, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.barValue, { color: colors.text2 }]}>{item.seenWords}/{item.totalWords}</Text>
                </View>

                {item.errorCount > 0 && (
                  <Text style={[styles.errorBadge, { color: '#f44336' }]}>
                    ⚠️ {item.errorCount} {t.errorsLabel}
                  </Text>
                )}
              </View>
            );
          })}
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
  legend: { flexDirection: 'row', gap: s(12), flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  legendDot: { width: s(10), height: s(10), borderRadius: s(5) },
  legendLabel: { fontSize: s(11) },
  noData: { textAlign: 'center', marginTop: s(40), fontSize: s(14) },
  card: { borderRadius: s(12), borderWidth: 1.5, padding: s(14), marginBottom: s(10), gap: s(8) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  strengthDot: { width: s(10), height: s(10), borderRadius: s(5) },
  topicName: { flex: 1, fontSize: s(14), fontWeight: '700' },
  topicBadge: { fontSize: s(11), fontWeight: '600', paddingHorizontal: s(8), paddingVertical: s(2), borderRadius: s(10) },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  barLabel: { width: s(56), fontSize: s(11) },
  barBg: { flex: 1, height: s(6), borderRadius: s(3), overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: s(3) },
  barValue: { width: s(36), fontSize: s(11), textAlign: 'right' },
  errorBadge: { fontSize: s(12), fontWeight: '600' },
});
