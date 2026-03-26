import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getStreak } from '../utils/streak';
import { getSRSStats } from '../utils/srs';
import { getErrors } from '../utils/errorHistory';
import { getFavorites } from '../utils/favorites';
import { getUnlocked, ALL_ACHIEVEMENTS, Achievement } from '../utils/achievements';
import { Language } from '../types/Word';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const labels: Record<Language, {
  title: string; streak: string; longest: string; studied: string;
  mastery: string; due: string; errors: string; favorites: string;
  achievements: string; locked: string; close: string;
}> = {
  he: {
    title: 'הסטטיסטיקות שלי', streak: 'רצף נוכחי', longest: 'הרצף הארוך ביותר',
    studied: 'מילים שנלמדו', mastery: 'שליטה ממוצעת', due: 'לחזרה היום',
    errors: 'שגיאות שמורות', favorites: 'מועדפים', achievements: 'הישגים',
    locked: 'נעול', close: 'סגור',
  },
  es: {
    title: 'Mis estadísticas', streak: 'Racha actual', longest: 'Racha más larga',
    studied: 'Palabras estudiadas', mastery: 'Dominio promedio', due: 'Para repasar hoy',
    errors: 'Errores guardados', favorites: 'Favoritos', achievements: 'Logros',
    locked: 'Bloqueado', close: 'Cerrar',
  },
  en: {
    title: 'My stats', streak: 'Current streak', longest: 'Longest streak',
    studied: 'Words studied', mastery: 'Avg mastery', due: 'Due today',
    errors: 'Saved errors', favorites: 'Favorites', achievements: 'Achievements',
    locked: 'Locked', close: 'Close',
  },
};

interface Props {
  language: string;
  uiLanguage: Language;
  onClose: () => void;
}

interface Stats {
  currentStreak: number;
  longestStreak: number;
  srsTotal: number;
  avgMastery: number;
  due: number;
  errors: number;
  favorites: number;
}

export const StatsScreen: React.FC<Props> = ({ language, uiLanguage, onClose }) => {
  const { colors } = useTheme();
  const t = labels[uiLanguage] ?? labels.he;
  const [stats, setStats] = useState<Stats | null>(null);
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      getStreak(),
      getSRSStats(language),
      getErrors(language),
      getFavorites(),
      getUnlocked(),
    ]).then(([streak, srs, errors, favs, unlockedMap]) => {
      setStats({
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        srsTotal: srs.total,
        avgMastery: srs.avgMastery,
        due: srs.due,
        errors: errors.length,
        favorites: favs.length,
      });
      setUnlocked(unlockedMap);
    });
  }, [language]);

  const masteryStars = (avg: number) => {
    const full = Math.round(avg);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
          <Text style={[styles.closeBtnText, { color: colors.text2 }]}>{t.close} ✕</Text>
        </TouchableOpacity>
      </View>

      {/* Streak cards */}
      <View style={styles.row}>
        <StatCard emoji="🔥" label={t.streak} value={`${stats?.currentStreak ?? 0}`} colors={colors} accent="#ff9800" />
        <StatCard emoji="🏆" label={t.longest} value={`${stats?.longestStreak ?? 0}`} colors={colors} accent="#f5576c" />
      </View>

      <View style={styles.row}>
        <StatCard emoji="📚" label={t.studied} value={`${stats?.srsTotal ?? 0}`} colors={colors} accent="#4facfe" />
        <StatCard emoji="📅" label={t.due} value={`${stats?.due ?? 0}`} colors={colors} accent="#a18cd1" />
      </View>

      <View style={styles.row}>
        <StatCard emoji="❌" label={t.errors} value={`${stats?.errors ?? 0}`} colors={colors} accent="#f44336" />
        <StatCard emoji="⭐" label={t.favorites} value={`${stats?.favorites ?? 0}`} colors={colors} accent="#f6c90e" />
      </View>

      {/* Mastery */}
      <View style={[styles.masteryCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.masteryLabel, { color: colors.text2 }]}>{t.mastery}</Text>
        <Text style={[styles.masteryStars, { color: '#f6c90e' }]}>
          {masteryStars(stats?.avgMastery ?? 0)}
        </Text>
        <Text style={[styles.masteryValue, { color: colors.text }]}>
          {((stats?.avgMastery ?? 0) / 5 * 100).toFixed(0)}%
        </Text>
      </View>

      {/* Achievements */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.achievements}</Text>
      <View style={styles.achievementsGrid}>
        {ALL_ACHIEVEMENTS.map(a => {
          const isUnlocked = !!unlocked[a.id];
          const title = uiLanguage === 'he' ? a.titleHe : uiLanguage === 'es' ? a.titleEs : a.titleEn;
          const desc = uiLanguage === 'he' ? a.descHe : uiLanguage === 'es' ? a.descEs : a.descEn;
          return (
            <View
              key={a.id}
              style={[styles.achievementCard, { backgroundColor: colors.surface },
                !isUnlocked && styles.achievementLocked,
              ]}
            >
              <Text style={[styles.achievementEmoji, !isUnlocked && { opacity: 0.3 }]}>{a.emoji}</Text>
              <Text style={[styles.achievementTitle, { color: isUnlocked ? colors.text : colors.text2 }]}>{title}</Text>
              <Text style={[styles.achievementDesc, { color: colors.text2 }]} numberOfLines={2}>
                {isUnlocked ? desc : t.locked}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const StatCard = ({ emoji, label, value, colors, accent }: {
  emoji: string; label: string; value: string; colors: any; accent: string;
}) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: accent }]}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.text2 }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: s(20), paddingTop: s(24),
  },
  title: { fontSize: s(22), fontWeight: '700' },
  closeBtn: { paddingVertical: s(8), paddingHorizontal: s(14), borderRadius: s(20) },
  closeBtnText: { fontSize: s(13), fontWeight: '600' },
  row: { flexDirection: 'row', gap: s(12), paddingHorizontal: s(16), marginBottom: s(12) },
  statCard: {
    flex: 1, padding: s(16), borderRadius: s(12),
    alignItems: 'center', gap: s(4), borderLeftWidth: s(4),
  },
  statEmoji: { fontSize: s(24) },
  statValue: { fontSize: s(28), fontWeight: '800' },
  statLabel: { fontSize: s(11), textAlign: 'center' },
  masteryCard: {
    marginHorizontal: s(16), marginBottom: s(16),
    padding: s(20), borderRadius: s(12), alignItems: 'center', gap: s(4),
  },
  masteryLabel: { fontSize: s(13), fontWeight: '600' },
  masteryStars: { fontSize: s(28), letterSpacing: s(4) },
  masteryValue: { fontSize: s(20), fontWeight: '700' },
  sectionTitle: { fontSize: s(16), fontWeight: '700', paddingHorizontal: s(16), marginBottom: s(12) },
  achievementsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: s(10),
    paddingHorizontal: s(16), paddingBottom: s(30),
  },
  achievementCard: {
    width: (width - s(52)) / 2,
    padding: s(14), borderRadius: s(12), alignItems: 'center', gap: s(4),
  },
  achievementLocked: { opacity: 0.6 },
  achievementEmoji: { fontSize: s(32) },
  achievementTitle: { fontSize: s(13), fontWeight: '700', textAlign: 'center' },
  achievementDesc: { fontSize: s(11), textAlign: 'center', lineHeight: s(15) },
});
