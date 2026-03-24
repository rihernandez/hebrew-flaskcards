import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getAllSeenCounts } from '../utils/progress';
import { getWords } from '../utils/dataService';
import { topicTranslations } from '../utils/translations';

const { width } = Dimensions.get('window');
const s = (size: number) => Math.round(size * Math.min(width / 390, 1.8));

interface TopicMenuProps {
  topics: string[];
  selectedTopic: string;
  language: string;
  uiLanguage: string;
  availableLanguages: string[];
  onLanguageChange: (lang: string) => void;
  onTopicChange: (topic: string) => void;
  onBlitzMode: () => void;
  onBulletMode: () => void;
  onFocusMode: () => void;
  onWriteMode: () => void;
  onQuizMode: () => void;
  onFavoritesMode: () => void;
  onErrorsMode: () => void;
  errorCount: number;
  translations: any;
}

export const TopicMenu: React.FC<TopicMenuProps> = ({
  topics, selectedTopic, language, uiLanguage, availableLanguages, onLanguageChange,
  onTopicChange, onBlitzMode, onBulletMode, onFocusMode, onWriteMode, onQuizMode,
  onFavoritesMode, onErrorsMode, errorCount, translations,
}) => {
  const { colors } = useTheme();
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (topics.length > 0) getAllSeenCounts(language, topics).then(setSeenCounts);
  }, [language, topics]);

  const getTopicLabel = (topic: string) => {
    if (uiLanguage === 'he' && topicTranslations[topic]) {
      return `${topic} - ${topicTranslations[topic]}`;
    }
    return topic;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* Language selector */}
      {availableLanguages.length > 0 && (
        <View style={[styles.langContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.langLabel, { color: colors.text2 }]}>🌐 Idioma:</Text>
          <View style={styles.langButtons}>
            {availableLanguages.map(lang => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn,
                  { borderColor: colors.primary },
                  lang === language && { backgroundColor: colors.primary },
                ]}
                onPress={() => onLanguageChange(lang)}
              >
                <Text style={[styles.langBtnText, { color: lang === language ? '#fff' : colors.primary }]}>
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Game modes */}
      <View style={styles.modesContainer}>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#4facfe' }]} onPress={onBulletMode}>
          <Text style={styles.modeButtonText}>🚀 {translations.bulletMode}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f093fb' }]} onPress={onBlitzMode}>
          <Text style={styles.modeButtonText}>⚡ {translations.blitzMode}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f6d365' }]} onPress={onFocusMode}>
          <Text style={styles.modeButtonText}>🎯 {translations.focusMode}</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.text2 }]}>{translations.practice}</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Practice modes */}
      <View style={styles.modesContainer}>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#a18cd1' }]} onPress={onWriteMode}>
          <Text style={styles.modeButtonText}>✍️ {translations.writing}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f7971e' }]} onPress={onQuizMode}>
          <Text style={styles.modeButtonText}>🧠 {translations.quiz}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f6c90e' }]} onPress={onFavoritesMode}>
          <Text style={styles.modeButtonText}>⭐ {translations.favorites}</Text>
        </TouchableOpacity>
        {errorCount > 0 && (
          <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f44336' }]} onPress={onErrorsMode}>
            <Text style={styles.modeButtonText}>❌ {translations.reviewErrors} ({errorCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Topics with progress */}
      <View style={styles.topicsContainer}>
        {topics.map((topic) => {
          const total = getWords(language, topic).length;
          const seen = seenCounts[topic] ?? 0;
          const pct = total > 0 ? Math.min(seen / total, 1) : 0;
          const isActive = selectedTopic === topic;

          return (
            <TouchableOpacity
              key={topic}
              style={[styles.topicButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => onTopicChange(topic)}
            >
              <View style={styles.topicRow}>
                <Text style={[styles.topicName, { color: isActive ? '#fff' : colors.text }]}>{getTopicLabel(topic)}</Text>
                <Text style={[styles.progressLabel, { color: isActive ? 'rgba(255,255,255,0.8)' : colors.text2 }]}>
                  {seen}/{total}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                <View style={[styles.progressFill, {
                  width: `${pct * 100}%` as any,
                  backgroundColor: isActive ? '#fff' : colors.primary,
                }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  langContainer: {
    margin: s(15), marginBottom: 0,
    padding: s(12), borderRadius: s(10), borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: s(10),
  },
  langLabel: { fontSize: s(13), fontWeight: '600' },
  langButtons: { flexDirection: 'row', gap: s(8), flexWrap: 'wrap' },
  langBtn: {
    paddingVertical: s(6), paddingHorizontal: s(14),
    borderRadius: s(20), borderWidth: 1.5,
  },
  langBtnText: { fontSize: s(13), fontWeight: '600' },
  modesContainer: { padding: s(15), paddingBottom: 0, gap: s(10) },
  modeButton: { padding: s(15), borderRadius: s(8), alignItems: 'center' },
  modeButtonText: { color: '#fff', fontSize: s(16), fontWeight: '600' },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: s(15), marginTop: s(16), marginBottom: s(4), gap: s(8),
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: s(11), fontWeight: '700', letterSpacing: 1 },
  topicsContainer: { padding: s(15), gap: s(10) },
  topicButton: { padding: s(14), borderRadius: s(8), borderWidth: 1, gap: s(6) },
  topicRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topicName: { fontSize: s(15) },
  progressLabel: { fontSize: s(11) },
  progressTrack: { height: s(4), borderRadius: s(2), overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: s(2) },
});
