import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
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
  nativeLanguage: string;
  onTopicChange: (topic: string) => void;
  onBlitzMode: () => void;
  onBulletMode: () => void;
  onFocusMode: () => void;
  onWriteMode: () => Promise<boolean>;
  onQuizMode: () => Promise<boolean>;
  onErrorsMode: () => void;
  errorCount: number;
  translations: any;
}

export const TopicMenu: React.FC<TopicMenuProps> = ({
  topics, selectedTopic, language, uiLanguage, nativeLanguage,
  onTopicChange, onBlitzMode, onBulletMode, onFocusMode, onWriteMode, onQuizMode,
  onErrorsMode, errorCount, translations,
}) => {
  const { colors } = useTheme();
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
  const [practiceHint, setPracticeHint] = useState('');
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (topics.length > 0) getAllSeenCounts(language, topics).then(setSeenCounts);
  }, [language, topics]);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  const getTopicLabel = (topic: string) => {
    if (uiLanguage === 'he' && topicTranslations[topic]) {
      return `${topic} - ${topicTranslations[topic]}`;
    }
    return topic;
  };

  const showPracticeHint = (message: string) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setPracticeHint(message);
    hintOpacity.stopAnimation();
    hintOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(hintOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setPracticeHint('');
      }
    });
    hintTimerRef.current = setTimeout(() => {
      setPracticeHint('');
    }, 2300);
  };

  const handleWritePress = async () => {
    const started = await onWriteMode();
    if (!started) {
      showPracticeHint('Aun no has aprendido vocabulario');
    }
  };

  const handleQuizPress = async () => {
    const started = await onQuizMode();
    if (!started) {
      showPracticeHint('Aun no has aprendido vocabulario');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView style={styles.container}>

      <View style={[styles.langContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.langLabel, { color: colors.text2 }]}>Idiomas</Text>
        <View style={styles.langChipsRow}>
          <View style={[styles.langChip, styles.langChipNeutral, { backgroundColor: '#ffffff', borderColor: colors.border }]}>
            <Text style={[styles.langChipText, { color: colors.text }]}>{nativeLanguage}</Text>
          </View>
          <View style={[styles.langChip, styles.langChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Text style={[styles.langChipText, { color: '#fff' }]}>{language}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionLabelWrap}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.text2 }]}>Aprende</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
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

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.text2 }]}>Practica</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Practice modes */}
      <View style={styles.modesContainer}>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#a18cd1' }]} onPress={handleWritePress}>
          <Text style={styles.modeButtonText}>✍️ {translations.writing}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f7971e' }]} onPress={handleQuizPress}>
          <Text style={styles.modeButtonText}>🧠 {translations.quiz}</Text>
        </TouchableOpacity>
        {errorCount > 0 && (
          <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f44336' }]} onPress={onErrorsMode}>
            <Text style={styles.modeButtonText}>❌ {translations.reviewErrors} ({errorCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sectionLabelWrap}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.text2 }]}>Retos</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Game modes */}
      <View style={styles.modesContainer}>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f6d365' }]} onPress={onFocusMode}>
          <Text style={styles.modeButtonText}>🎯 Focus • 5 segs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#f093fb' }]} onPress={onBlitzMode}>
          <Text style={styles.modeButtonText}>⚡ Blitz • 3 segs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: '#4facfe' }]} onPress={onBulletMode}>
          <Text style={styles.modeButtonText}>🚀 Bullet • 1 seg</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {practiceHint ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingHintWrap,
            {
              opacity: hintOpacity,
            },
          ]}
        >
          <View style={styles.floatingHintArrow} />
          <View style={styles.floatingHintBubble}>
            <Text style={styles.floatingHintText}>{practiceHint}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  langContainer: {
    margin: s(15), marginBottom: 0,
    padding: s(12), borderRadius: s(10), borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s(12),
  },
  langLabel: { fontSize: s(12), fontWeight: '700' },
  langChipsRow: { flexDirection: 'row', gap: s(8), alignItems: 'center' },
  langChip: {
    paddingVertical: s(8),
    paddingHorizontal: s(14),
    borderRadius: s(18),
    borderWidth: 1.5,
  },
  langChipNeutral: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  langChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  langChipText: { fontSize: s(15), fontWeight: '800' },
  modesContainer: { padding: s(15), paddingBottom: 0, gap: s(10) },
  modeButton: { padding: s(15), borderRadius: s(8), alignItems: 'center' },
  modeButtonText: { color: '#fff', fontSize: s(16), fontWeight: '600' },
  floatingHintWrap: {
    position: 'absolute',
    left: s(20),
    right: s(20),
    bottom: s(140),
    alignItems: 'center',
  },
  floatingHintArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: s(10),
    borderRightWidth: s(10),
    borderTopWidth: s(12),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1f2937',
    marginTop: s(-1),
  },
  floatingHintBubble: {
    backgroundColor: '#1f2937',
    borderRadius: s(12),
    paddingVertical: s(12),
    paddingHorizontal: s(14),
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingHintText: { color: '#fff', fontSize: s(13), fontWeight: '700', textAlign: 'center' },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: s(15), marginTop: s(16), marginBottom: s(4), gap: s(8),
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: s(11), fontWeight: '700', letterSpacing: 1 },
  sectionLabelWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: s(15), marginTop: s(16), marginBottom: s(4), gap: s(8),
  },
  topicsContainer: { padding: s(15), gap: s(10) },
  topicButton: { padding: s(14), borderRadius: s(8), borderWidth: 1, gap: s(6) },
  topicRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topicName: { fontSize: s(15) },
  progressLabel: { fontSize: s(11) },
  progressTrack: { height: s(4), borderRadius: s(2), overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: s(2) },
});
