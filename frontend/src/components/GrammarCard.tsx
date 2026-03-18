interface GrammarCardProps {
  word: string;
  meaning: string;
  examples: string[];
  learningRTL: boolean;
}

export default function GrammarCard({ word, meaning, examples, learningRTL }: GrammarCardProps) {
  return (
    <div className={`grammar-card ${learningRTL ? 'learning-rtl' : 'learning-ltr'}`}>
      <h2>{word}</h2>
      <div className="grammar-content">
        {examples.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
