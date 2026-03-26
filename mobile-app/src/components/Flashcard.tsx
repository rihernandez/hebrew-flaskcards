import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Word } from '../types/Word';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { getMastery } from '../utils/srs';

const { width } = Dimensions.get('window');
const scale = Math.min(width / 390, 1.8);
const s = (size: number) => Math.round(size * scale);

interface FlashcardProps {
  word: Word;
  examplesLabel: string;
  learningRTL: boolean;
  isFlipped?: boolean;
  lockFlip?: boolean;
  onFlipComplete?: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ 
  word, 
  examplesLabel, 
  learningRTL,
  isFlipped: externalFlipped,
  lockFlip,
  onFlipComplete
}) => {
  const [manualFlip, setManualFlip] = useState(false);
  const [fav, setFav] = useState(false);
  const [mastery, setMastery] = useState(0);
  
  const isFlipped = externalFlipped !== undefined ? externalFlipped : manualFlip;

  useEffect(() => {
    const wk = `${word.language}_${word.word}_${word.topic}`;
    isFavorite(word.language, word.word, word.topic).then(setFav);
    getMastery(wk).then(setMastery);
  }, [word.word, word.topic, word.language]);

  const handlePress = () => {
    if (lockFlip) return;
    if (externalFlipped === undefined) setManualFlip(!manualFlip);
  };

  const handleFav = async () => {
    const next = await toggleFavorite(word.language, word.word, word.topic);
    setFav(next);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isFlipped ? styles.containerFlipped : styles.containerFront]} 
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Favorite button */}
      <TouchableOpacity style={styles.favBtn} onPress={handleFav} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.favIcon}>{fav ? '⭐' : '☆'}</Text>
      </TouchableOpacity>

      {/* Mastery stars */}
      <View style={styles.masteryRow}>
        {[1,2,3,4,5].map(i => (
          <Text key={i} style={[styles.masteryStar, { color: i <= mastery ? '#f6c90e' : (isFlipped ? 'rgba(255,255,255,0.3)' : '#ddd') }]}>★</Text>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!isFlipped ? (
          <View style={styles.front}>
            <Text style={[styles.word, learningRTL && styles.rtl]}>
              {word.word}
            </Text>
            {word.genre && (
              <Text style={styles.genre}>({word.genre})</Text>
            )}
          </View>
        ) : (
          <View style={styles.back}>
            <Text style={styles.pronunciation}>({word.pronunciation})</Text>
            {word.genre && (
              <Text style={styles.genreBack}>({word.genre})</Text>
            )}
            <Text style={styles.meaning}>{word.meaning}</Text>
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesLabel}>{examplesLabel}:</Text>
              {word.examples.map((example, index) => (
                <Text 
                  key={index} 
                  style={[styles.example, learningRTL && styles.rtl]}
                >
                  • {example}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: s(12),
    padding: s(20),
    margin: s(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: s(200),
    maxHeight: s(380),
  },
  favBtn: {
    position: 'absolute', top: s(10), right: s(10), zIndex: 10, padding: s(4),
  },
  favIcon: { fontSize: s(22) },
  masteryRow: {
    position: 'absolute', bottom: s(10), left: s(12),
    flexDirection: 'row', gap: s(2),
  },
  masteryStar: { fontSize: s(12) },
  containerFront: {
    backgroundColor: '#fff',
  },
  containerFlipped: {
    backgroundColor: '#667eea',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  front: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  back: {
    alignItems: 'center',
    flex: 1,
    padding: s(20),
  },
  word: {
    fontSize: s(48),
    fontWeight: 'bold',
    marginBottom: s(10),
    textAlign: 'center',
    color: '#333',
  },
  genre: {
    fontSize: s(18),
    color: '#666',
    fontStyle: 'italic',
    marginTop: s(10),
  },
  pronunciation: {
    fontSize: s(24),
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: s(8),
  },
  genreBack: {
    fontSize: s(14),
    color: 'rgba(255, 255, 255, 0.65)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: s(16),
  },
  meaning: {
    fontSize: s(28),
    fontWeight: '600',
    marginBottom: s(20),
    textAlign: 'center',
    color: '#fff',
  },
  examplesContainer: {
    marginTop: s(20),
    width: '100%',
  },
  examplesLabel: {
    fontSize: s(18),
    fontWeight: '600',
    marginBottom: s(10),
    color: '#fff',
  },
  example: {
    fontSize: s(16),
    marginVertical: s(5),
    paddingLeft: s(10),
    paddingVertical: s(8),
    paddingHorizontal: s(10),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: s(5),
    color: '#fff',
  },
  rtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
