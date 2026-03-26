import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Achievement } from '../utils/achievements';
import { Language } from '../types/Word';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

interface Props {
  achievement: Achievement | null;
  uiLanguage: Language;
  onDone: () => void;
}

export const AchievementToast: React.FC<Props> = ({ achievement, uiLanguage, onDone }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(s(40))).current;

  useEffect(() => {
    if (!achievement) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(2500),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: s(-20), duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => {
      opacity.setValue(0);
      translateY.setValue(s(40));
      onDone();
    });
  }, [achievement?.id]);

  if (!achievement) return null;

  const title = uiLanguage === 'he' ? achievement.titleHe
    : uiLanguage === 'es' ? achievement.titleEs : achievement.titleEn;
  const desc = uiLanguage === 'he' ? achievement.descHe
    : uiLanguage === 'es' ? achievement.descEs : achievement.descEn;

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.emoji}>{achievement.emoji}</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: s(100),
    left: s(20),
    right: s(20),
    backgroundColor: '#1a1a2e',
    borderRadius: s(14),
    padding: s(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  emoji: { fontSize: s(32) },
  textContainer: { flex: 1 },
  title: { color: '#fff', fontSize: s(15), fontWeight: '700' },
  desc: { color: 'rgba(255,255,255,0.7)', fontSize: s(12), marginTop: s(2) },
});
