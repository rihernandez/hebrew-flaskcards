import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const scale = Math.min(width / 390, 1.8);
const s = (size: number) => Math.round(size * scale);

interface TopicMenuProps {
  topics: string[];
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  onBlitzMode: () => void;
  onBulletMode: () => void;
  onFocusMode: () => void;
  translations: any;
}

export const TopicMenu: React.FC<TopicMenuProps> = ({
  topics,
  selectedTopic,
  onTopicChange,
  onBlitzMode,
  onBulletMode,
  onFocusMode,
  translations,
}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.modesContainer}>
        <TouchableOpacity 
          style={[styles.modeButton, { backgroundColor: '#4facfe' }]} 
          onPress={onBulletMode}
        >
          <Text style={styles.modeButtonText}>🚀 {translations.bulletMode}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, { backgroundColor: '#f093fb' }]} 
          onPress={onBlitzMode}
        >
          <Text style={styles.modeButtonText}>⚡ {translations.blitzMode}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, { backgroundColor: '#f6d365' }]} 
          onPress={onFocusMode}
        >
          <Text style={styles.modeButtonText}>🎯 {translations.focusMode}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topicsContainer}>
        {topics.map((topic) => (
          <TouchableOpacity
            key={topic}
            style={[
              styles.topicButton,
              selectedTopic === topic && styles.topicButtonActive,
            ]}
            onPress={() => onTopicChange(topic)}
          >
            <Text
              style={[
                styles.topicButtonText,
                selectedTopic === topic && styles.topicButtonTextActive,
              ]}
            >
              {topic}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modesContainer: {
    padding: s(15),
    gap: s(10),
  },
  modeButton: {
    padding: s(15),
    borderRadius: s(8),
    alignItems: 'center',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: s(16),
    fontWeight: '600',
  },
  topicsContainer: {
    padding: s(15),
    gap: s(10),
  },
  topicButton: {
    backgroundColor: '#fff',
    padding: s(15),
    borderRadius: s(8),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  topicButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  topicButtonText: {
    fontSize: s(16),
    color: '#333',
  },
  topicButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
