/**
 * ImmersionScreen — Hub de inmersión
 * Contiene: Historia Interactiva + Modo Cine
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { InteractiveStory } from '../components/InteractiveStory';
import { CinemaMode } from '../components/CinemaMode';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const L: Record<Language, {
  title: string; sub: string;
  storyTitle: string; storyDesc: string;
  cinemaTitle: string; cinemaDesc: string;
}> = {
  he: {
    title: '🌍 שקיעה', sub: 'למד דרך סיפורים וסצנות',
    storyTitle: 'סיפור אינטראקטיבי', storyDesc: 'השלם מילים חסרות בסיפור כדי להתקדם',
    cinemaTitle: 'מצב קולנוע', cinemaDesc: 'אמור את השורה לפני שהיא מופיעה',
  },
  es: {
    title: '🌍 Inmersión', sub: 'Aprende a través de historias y escenas',
    storyTitle: 'Historia Interactiva', storyDesc: 'Completa las palabras que faltan para avanzar',
    cinemaTitle: 'Modo Cine', cinemaDesc: 'Di la línea antes de que aparezca en pantalla',
  },
  en: {
    title: '🌍 Immersion', sub: 'Learn through stories and scenes',
    storyTitle: 'Interactive Story', storyDesc: 'Complete the missing words to advance the story',
    cinemaTitle: 'Cinema Mode', cinemaDesc: 'Say the line before it appears on screen',
  },
};

type ActiveModal = 'story' | 'cinema' | null;

interface Props {
  uiLanguage: Language;
  language: string;
}

export const ImmersionScreen: React.FC<Props> = ({ uiLanguage, language }) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.es;
  const [active, setActive] = useState<ActiveModal>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <Text style={[styles.sub, { color: colors.text2 }]}>{t.sub}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setActive('story')}
          activeOpacity={0.75}
        >
          <Text style={styles.cardIcon}>📖</Text>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t.storyTitle}</Text>
            <Text style={[styles.cardDesc, { color: colors.text2 }]}>{t.storyDesc}</Text>
          </View>
          <Text style={[styles.cardArrow, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setActive('cinema')}
          activeOpacity={0.75}
        >
          <Text style={styles.cardIcon}>🎬</Text>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t.cinemaTitle}</Text>
            <Text style={[styles.cardDesc, { color: colors.text2 }]}>{t.cinemaDesc}</Text>
          </View>
          <Text style={[styles.cardArrow, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={active === 'story'} animationType="slide">
        <InteractiveStory uiLanguage={uiLanguage} language={language} onExit={() => setActive(null)} />
      </Modal>

      <Modal visible={active === 'cinema'} animationType="slide">
        <CinemaMode uiLanguage={uiLanguage} language={language} onExit={() => setActive(null)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: s(20), paddingBottom: s(8), gap: s(4) },
  title: { fontSize: s(22), fontWeight: '800' },
  sub: { fontSize: s(13) },
  grid: { padding: s(16), gap: s(12) },
  card: { flexDirection: 'row', alignItems: 'center', padding: s(16), borderRadius: s(14), borderWidth: 1, gap: s(12) },
  cardIcon: { fontSize: s(32) },
  cardText: { flex: 1, gap: s(2) },
  cardTitle: { fontSize: s(16), fontWeight: '700' },
  cardDesc: { fontSize: s(12), lineHeight: s(18) },
  cardArrow: { fontSize: s(24), fontWeight: '300' },
});
