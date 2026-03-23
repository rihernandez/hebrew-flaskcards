import React, { useState } from 'react';
import {
  View, TextInput, FlatList, Text, TouchableOpacity,
  Modal, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import { Word } from '../types/Word';

const { width } = Dimensions.get('window');
const scale = Math.min(width / 390, 1.8);
const s = (size: number) => Math.round(size * scale);

interface SearchBarProps {
  allWords: Word[];
}

export const SearchBar: React.FC<SearchBarProps> = ({ allWords }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Word[]>([]);
  const [selected, setSelected] = useState<Word | null>(null);

  const handleChange = (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const lower = text.toLowerCase();
    setResults(
      allWords.filter(w => w.meaning.toLowerCase().includes(lower)).slice(0, 8)
    );
  };

  const handleSelect = (word: Word) => {
    setSelected(word);
    setQuery('');
    setResults([]);
  };

  const isRTL = selected?.language === 'Hebreo';

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={handleChange}
        placeholder="🔍 Buscar por significado..."
        placeholderTextColor="#aaa"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <Text style={styles.resultWord}>{item.word}</Text>
                <Text style={styles.resultMeaning} numberOfLines={1}>{item.meaning}</Text>
                <Text style={styles.resultTopic}>{item.topic}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Modal ficha completa */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.card}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.cardContent}>
              <Text style={[styles.cardWord, isRTL && styles.rtl]}>{selected?.word}</Text>

              {selected?.pronunciation ? (
                <Text style={styles.cardPronunciation}>[{selected.pronunciation}]</Text>
              ) : null}

              {selected?.genre ? (
                <Text style={styles.cardGenre}>{selected.genre}</Text>
              ) : null}

              <Text style={styles.cardMeaning}>{selected?.meaning}</Text>

              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>{selected?.language}</Text>
                <Text style={styles.cardMetaText}> · </Text>
                <Text style={styles.cardMetaText}>{selected?.topic}</Text>
              </View>

              {selected?.examples && selected.examples.length > 0 && (
                <View style={styles.examplesContainer}>
                  {selected.examples.map((ex, i) => (
                    <Text key={i} style={[styles.example, isRTL && styles.rtl]}>{ex}</Text>
                  ))}
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#667eea',
    borderRadius: s(8),
    paddingHorizontal: s(14),
    paddingVertical: s(9),
    fontSize: s(14),
    color: '#333',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: s(8),
    maxHeight: s(280),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 200,
  },
  resultItem: {
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  resultWord: {
    fontWeight: 'bold',
    fontSize: s(15),
    color: '#333',
    flexShrink: 0,
  },
  resultMeaning: {
    flex: 1,
    fontSize: s(13),
    color: '#667eea',
  },
  resultTopic: {
    fontSize: s(11),
    color: '#aaa',
    flexShrink: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: s(20),
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: s(16),
    width: '100%',
    maxHeight: '80%',
    padding: s(24),
  },
  closeBtn: {
    position: 'absolute',
    top: s(12),
    right: s(12),
    backgroundColor: '#f44336',
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: s(13),
    fontWeight: 'bold',
  },
  cardContent: {
    alignItems: 'center',
    paddingTop: s(10),
  },
  cardWord: {
    fontSize: s(48),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: s(6),
  },
  cardPronunciation: {
    fontSize: s(16),
    color: '#888',
    fontStyle: 'italic',
    marginBottom: s(4),
  },
  cardGenre: {
    fontSize: s(12),
    color: '#aaa',
    fontStyle: 'italic',
    marginBottom: s(8),
  },
  cardMeaning: {
    fontSize: s(24),
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
    marginVertical: s(12),
  },
  cardMeta: {
    flexDirection: 'row',
    marginBottom: s(14),
  },
  cardMetaText: {
    fontSize: s(12),
    color: '#aaa',
  },
  examplesContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: s(12),
    gap: s(8),
  },
  example: {
    backgroundColor: '#f5f7ff',
    padding: s(10),
    borderRadius: s(6),
    fontSize: s(13),
    color: '#444',
    textAlign: 'left',
  },
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
