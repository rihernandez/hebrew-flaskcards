import { useMemo } from 'react';
import { topicTranslations } from '../i18n/translations';
import { getTopicProgress, getFavorites, getFocusErrors } from '../utils/storage';

interface Word {
  id: string;
  language: string;
  topic: string;
}

interface TopicMenuProps {
  topics: string[];
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  onFocusMode: () => void;
  onBlitzMode: () => void;
  onBulletMode: () => void;
  onWriteMode: () => void;
  onQuizMode: () => void;
  onTopicVoiceMode: () => void;
  onFavoritesMode: () => void;
  onErrorsMode: () => void;
  selectedLanguage: string;
  translations: any;
  allWords: Word[];
}

export default function TopicMenu({
  topics, selectedTopic, onTopicChange,
  onFocusMode, onBlitzMode, onBulletMode, onWriteMode, onQuizMode, onTopicVoiceMode,
  onFavoritesMode, onErrorsMode,
  selectedLanguage, translations, allWords,
}: TopicMenuProps) {

  const visibleTopics = selectedLanguage === 'Hebreo'
    ? topics
    : topics.filter(t => t !== 'Raíz');

  const showBilingual = selectedLanguage === 'Español';
  const displayName = (topic: string) =>
    showBilingual ? (topicTranslations[topic] ?? topic) : topic;

  // Progreso por tema
  const progressMap = useMemo(() => {
    const map: Record<string, { seen: number; total: number }> = {};
    for (const topic of visibleTopics) {
      const ids = allWords
        .filter(w => w.language === selectedLanguage && w.topic === topic)
        .map(w => w.id);
      map[topic] = { seen: getTopicProgress(selectedLanguage, ids), total: ids.length };
    }
    return map;
  }, [visibleTopics, allWords, selectedLanguage]);

  const favCount = useMemo(() => getFavorites().length, []);
  const errorCount = useMemo(() => getFocusErrors(selectedLanguage).length, [selectedLanguage]);

  return (
    <div className="topic-menu">
      <h3>{translations.topics}</h3>
      <ul>
        {visibleTopics.map((topic) => {
          const { seen, total } = progressMap[topic] ?? { seen: 0, total: 0 };
          const pct = total > 0 ? Math.round((seen / total) * 100) : 0;
          return (
            <li
              key={topic}
              className={selectedTopic === topic ? 'active' : ''}
              onClick={() => onTopicChange(topic)}
            >
              <span className="topic-name">{displayName(topic)}</span>
              {total > 0 && (
                <span className="topic-progress">
                  <span className="topic-progress-bar">
                    <span className="topic-progress-fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="topic-progress-label">{seen}/{total}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mode-buttons">
        <h3>{translations.studyModes}</h3>
        <button className="mode-btn focus-btn" onClick={onFocusMode}>{translations.focus}</button>
        <button className="mode-btn blitz-btn" onClick={onBlitzMode}>{translations.blitz}</button>
        <button className="mode-btn bullet-btn" onClick={onBulletMode}>{translations.bullet}</button>

        <div className="mode-divider">✏️ {translations.practiceMode}</div>

        <button className="mode-btn write-btn" onClick={onWriteMode}>{translations.write}</button>
        <button className="mode-btn quiz-btn" onClick={onQuizMode}>{translations.quiz}</button>
        <button className="mode-btn topic-voice-btn" onClick={onTopicVoiceMode}>
          {translations.topicVoice}
        </button>

        {favCount > 0 && (
          <button className="mode-btn fav-mode-btn" onClick={onFavoritesMode}>
            {translations.favorites} ({favCount})
          </button>
        )}
        {errorCount > 0 && (
          <button className="mode-btn errors-mode-btn" onClick={onErrorsMode}>
            {translations.reviewErrors} ({errorCount})
          </button>
        )}
      </div>
    </div>
  );
}
