interface TopicMenuProps {
  topics: string[];
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  onFocusMode: () => void;
  onBlitzMode: () => void;
  onBulletMode: () => void;
  selectedLanguage: string;
  translations: any;
}

export default function TopicMenu({ topics, selectedTopic, onTopicChange, onFocusMode, onBlitzMode, onBulletMode, selectedLanguage, translations }: TopicMenuProps) {
  // Filtrar topics según el idioma seleccionado
  const visibleTopics = selectedLanguage === 'Hebreo' 
    ? topics // Mostrar todos los topics incluyendo Raíz
    : topics.filter(topic => topic !== 'Raíz'); // Ocultar Raíz si no es Hebreo

  return (
    <div className="topic-menu">
      <h3>{translations.topics}</h3>
      <ul>
        {visibleTopics.map((topic) => (
          <li 
            key={topic}
            className={selectedTopic === topic ? 'active' : ''}
            onClick={() => onTopicChange(topic)}
          >
            {topic}
          </li>
        ))}
      </ul>
      
      <div className="mode-buttons">
        <h3>{translations.studyModes}</h3>
        <button className="mode-btn focus-btn" onClick={onFocusMode}>
          {translations.focus}
        </button>
        <button className="mode-btn blitz-btn" onClick={onBlitzMode}>
          {translations.blitz}
        </button>
        <button className="mode-btn bullet-btn" onClick={onBulletMode}>
          {translations.bullet}
        </button>
      </div>
    </div>
  );
}
