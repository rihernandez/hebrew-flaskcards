import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Language, Word } from '../types/Word';
import { getAllWords } from '../utils/dataService';
import { getCompletedStreak } from '../utils/dailyChallenge';
import {
  getShadowPhrases, getDailySituations, getPronunciacionItems,
  getDictadoItems, getTranslationPairs, getLecturaParagraph,
  ShadowPhrase, ConversationSituation, PronunciacionItem,
  DictadoItem, TranslationPair, LecturaParagraph,
} from '../utils/speakingContent';
import { ActivityHub } from '../components/ActivityHub';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

interface Props {
  uiLanguage: Language;
  language: string;
  isAdvanced: boolean;
}

export const SpeakingScreen: React.FC<Props> = ({ uiLanguage, language, isAdvanced }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [phrases, setPhrases] = useState<ShadowPhrase[]>([]);
  const [situations, setSituations] = useState<ConversationSituation[]>([]);
  const [pronunciacionItems, setPronunciacionItems] = useState<PronunciacionItem[]>([]);
  const [dictadoItems, setDictadoItems] = useState<DictadoItem[]>([]);
  const [translationPairs, setTranslationPairs] = useState<TranslationPair[]>([]);
  const [lecturaParagraph, setLecturaParagraph] = useState<LecturaParagraph | null>(null);

  useEffect(() => {
    (async () => {
      const allWords: Word[] = getAllWords().filter(w => w.language === language);
      const [streak, ph, pr] = await Promise.all([
        getCompletedStreak(),
        getShadowPhrases(allWords),
        getPronunciacionItems(allWords),
      ]);
      setChallengeStreak(streak);
      setPhrases(ph);
      setSituations(getDailySituations(2, language));
      setPronunciacionItems(pr);
      setDictadoItems(getDictadoItems());
      setTranslationPairs(getTranslationPairs());
      setLecturaParagraph(getLecturaParagraph());
      setLoading(false);
    })();
  }, [language]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ActivityHub
      uiLanguage={uiLanguage}
      language={language}
      isAdvanced={isAdvanced}
      challengeStreak={challengeStreak}
      phrases={phrases}
      situations={situations}
      pronunciacionItems={pronunciacionItems}
      dictadoItems={dictadoItems}
      translationPairs={translationPairs}
      lecturaParagraph={lecturaParagraph}
      onSessionDone={() => {}}
    />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
