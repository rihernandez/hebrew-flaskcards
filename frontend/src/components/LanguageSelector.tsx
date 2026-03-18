interface LanguageSelectorProps {
  languages: string[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  placeholder: string;
}

export default function LanguageSelector({ languages, selectedLanguage, onLanguageChange, placeholder }: LanguageSelectorProps) {
  return (
    <div className="language-selector">
      <select 
        value={selectedLanguage} 
        onChange={(e) => onLanguageChange(e.target.value)}
        className="select"
      >
        <option value="">{placeholder}</option>
        {languages.map((lang) => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>
    </div>
  );
}
