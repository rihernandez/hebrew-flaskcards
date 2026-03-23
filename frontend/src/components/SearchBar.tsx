import { useState, useRef, useEffect } from 'react';

interface Word {
  id: string;
  word: string;
  pronunciation: string;
  meaning: string;
  examples: string[];
  language: string;
  topic: string;
  genre?: string;
}

interface SearchBarProps {
  allWords: Word[];
  onSelect: (word: Word) => void;
  placeholder?: string;
}

export default function SearchBar({ allWords, onSelect, placeholder = '🔍 Buscar por significado...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Word[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const lower = q.toLowerCase();
    const found = allWords
      .filter(w => w.meaning.toLowerCase().includes(lower))
      .slice(0, 8);
    setResults(found);
    setOpen(found.length > 0);
  };

  const handleSelect = (word: Word) => {
    onSelect(word);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="search-bar" ref={ref}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="search-input"
        autoComplete="off"
      />
      {open && (
        <ul className="search-results">
          {results.map(w => (
            <li key={w.id} onClick={() => handleSelect(w)}>
              <span className="search-word">{w.word}</span>
              <span className="search-meaning">{w.meaning}</span>
              <span className="search-topic">{w.topic}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
