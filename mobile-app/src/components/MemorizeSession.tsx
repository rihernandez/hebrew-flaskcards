/**
 * MemorizeSession — flujo de memorización de las 10 palabras del día
 *
 * Fases:
 *  0. intro_review     — "¿Repasamos lo aprendido ayer?" (solo si hay palabras de ayer)
 *  1. review_yesterday — repaso de las palabras de ayer
 *  2. intro_today      — "¡Muy bien! Ahora empezamos con las palabras de hoy"
 *  3. read_today       — leer las 10 palabras de hoy una por una
 *  4. confirm          — "¿Las leíste?" con 3 opciones
 *  5. practice         — sesión interactiva (quiz + escritura alternados)
 *  6. done             — resumen final
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, TextInput,
} from 'react-native';
import { Word, Language } from '../types/Word';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
function normalize(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').trim();
}

// ─── i18n ────────────────────────────────────────────────────────────────────
const L: Record<Language, {
  introReviewTitle: string; introReviewSub: string; introReviewYes: string; introReviewNo: string;
  introTodayTitle: string; introTodaySub: string; introTodayBtn: string;
  yesterdayTitle: string; yesterdaySub: string;
  readTitle: string; readSub: string; wordOf: string; next: string; done: string;
  confirmTitle: string; confirmSub: string;
  practiceNow: string; rereadBtn: string; skip: string;
  practiceTitle: string;
  quizPrompt: string; correct: string; wrong: string; nextQ: string;
  writePrompt: string; check: string; reveal: string;
  summaryTitle: string; summaryCorrect: string; summaryWrong: string; finish: string;
  memorized: string;
}> = {
  he: {
    introReviewTitle: '!לפני שנתחיל', introReviewSub: '?רוצה לחזור על המילים של אתמול',
    introReviewYes: 'כן, בואו נחזור ←', introReviewNo: 'לא, דלג',
    introTodayTitle: '!כל הכבוד', introTodaySub: 'עכשיו נתחיל עם מילות היום',
    introTodayBtn: 'בואו נתחיל ←',
    yesterdayTitle: '!חזרה על אתמול', yesterdaySub: 'בוא נחזור על המילים של אתמול',
    readTitle: '📖 מילות היום', readSub: 'קרא כל מילה בעיון — תצטרך לשנן אותן!',
    wordOf: 'מילה', next: 'הבא ←', done: '✓ סיימתי לקרוא',
    confirmTitle: '?קראת את כל המילים', confirmSub: 'מה תרצה לעשות עכשיו?',
    practiceNow: '!כן, לתרגול', rereadBtn: 'אני רוצה לקרוא שוב', skip: 'לא עכשיו',
    practiceTitle: 'תרגול',
    quizPrompt: '?מה המשמעות של', correct: '✓ נכון!', wrong: '✗ לא נכון', nextQ: 'הבא →',
    writePrompt: 'כתוב את המילה בספרדית', check: '✓ בדוק', reveal: '👁 גלה',
    summaryTitle: '!כל הכבוד', summaryCorrect: 'נכון', summaryWrong: 'שגוי', finish: 'סיום ✓',
    memorized: 'שננת את המילים של היום',
  },
  es: {
    introReviewTitle: '¡Un momento!', introReviewSub: '¿Repasamos lo aprendido ayer?',
    introReviewYes: 'Sí, repasemos →', introReviewNo: 'No, saltar',
    introTodayTitle: '¡Muy bien!', introTodaySub: 'Ahora empezamos con las palabras de hoy',
    introTodayBtn: 'Empezar →',
    yesterdayTitle: '¡Repaso de ayer!', yesterdaySub: 'Repasemos las palabras de ayer',
    readTitle: '📖 Palabras de hoy', readSub: 'Lee cada palabra con atención — ¡tendrás que memorizarlas!',
    wordOf: 'palabra', next: 'Siguiente →', done: '✓ Ya las leí',
    confirmTitle: '¿Leíste todas las palabras?', confirmSub: '¿Qué quieres hacer ahora?',
    practiceNow: '¡Sí, a practicar!', rereadBtn: 'Quiero releerlas', skip: 'No por ahora',
    practiceTitle: 'Práctica',
    quizPrompt: '¿Qué significa?', correct: '✓ ¡Correcto!', wrong: '✗ Incorrecto', nextQ: 'Siguiente →',
    writePrompt: 'Escribe la palabra en español', check: '✓ Verificar', reveal: '👁 Revelar',
    summaryTitle: '¡Muy bien!', summaryCorrect: 'Correctas', summaryWrong: 'Incorrectas', finish: 'Finalizar ✓',
    memorized: 'Memorizaste las palabras de hoy',
  },
  en: {
    introReviewTitle: 'Before we start!', introReviewSub: "Want to review yesterday's words?",
    introReviewYes: 'Yes, let\'s review →', introReviewNo: 'No, skip',
    introTodayTitle: 'Well done!', introTodaySub: "Now let's start with today's words",
    introTodayBtn: "Let's go →",
    yesterdayTitle: "Yesterday's review!", yesterdaySub: "Let's review yesterday's words",
    readTitle: "📖 Today's words", readSub: "Read each word carefully — you'll need to memorize them!",
    wordOf: 'word', next: 'Next →', done: '✓ Done reading',
    confirmTitle: 'Did you read all the words?', confirmSub: 'What do you want to do now?',
    practiceNow: "Yes, let's practice!", rereadBtn: 'Read them again', skip: 'Not now',
    practiceTitle: 'Practice',
    quizPrompt: 'What does it mean?', correct: '✓ Correct!', wrong: '✗ Wrong', nextQ: 'Next →',
    writePrompt: 'Write the word in Spanish', check: '✓ Check', reveal: '👁 Reveal',
    summaryTitle: 'Well done!', summaryCorrect: 'Correct', summaryWrong: 'Incorrect', finish: 'Finish ✓',
    memorized: "You memorized today's words",
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Phase = 'intro_review' | 'review_yesterday' | 'intro_today' | 'read_today' | 'confirm' | 'practice' | 'done';
type MiniGame = 'quiz' | 'write';

interface Props {
  todayWords: Word[];
  yesterdayWords: Word[] | null;
  allWords: Word[];
  uiLanguage: Language;
  onDone: (correct: number, incorrect: number) => void;
  onSkip: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const MemorizeSession: React.FC<Props> = ({
  todayWords, yesterdayWords, allWords, uiLanguage, onDone, onSkip,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.he;

  const hasYesterday = yesterdayWords && yesterdayWords.length > 0;
  const initialPhase: Phase = hasYesterday ? 'intro_review' : 'read_today';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [readIndex, setReadIndex] = useState(0);

  // Practice state
  const practiceWords = useMemo(() => shuffle(todayWords), [todayWords]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [gameType, setGameType] = useState<MiniGame>('quiz');
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [inputStatus, setInputStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  // Yesterday review state
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewSelected, setReviewSelected] = useState<string | null>(null);
  const [reviewInput, setReviewInput] = useState('');
  const [reviewInputStatus, setReviewInputStatus] = useState<'idle'|'correct'|'wrong'|'revealed'>('idle');

  // ── Quiz options for current practice word ──
  const currentWord = practiceWords[practiceIndex];
  const quizOptions = useMemo(() => {
    if (!currentWord) return [];
    const pool = allWords.filter(w =>
      w.language === currentWord.language &&
      `${w.word}_${w.topic}` !== `${currentWord.word}_${currentWord.topic}`
    );
    return shuffle([currentWord, ...shuffle(pool).slice(0, 3)]);
  }, [currentWord, allWords]);

  // ── Quiz options for yesterday review ──
  const reviewWord = yesterdayWords?.[reviewIndex];
  const reviewGameType: MiniGame = reviewIndex % 2 === 0 ? 'quiz' : 'write';
  const reviewOptions = useMemo(() => {
    if (!reviewWord) return [];
    const pool = allWords.filter(w =>
      w.language === reviewWord.language &&
      `${w.word}_${w.topic}` !== `${reviewWord.word}_${reviewWord.topic}`
    );
    return shuffle([reviewWord, ...shuffle(pool).slice(0, 3)]);
  }, [reviewWord, allWords]);

  const advancePractice = () => {
    const next = practiceIndex + 1;
    if (next >= practiceWords.length) {
      setPhase('done');
    } else {
      setPracticeIndex(next);
      setGameType(next % 2 === 0 ? 'quiz' : 'write');
      setSelected(null);
      setInput('');
      setInputStatus('idle');
    }
  };

  const advanceReview = () => {
    const next = reviewIndex + 1;
    if (next >= yesterdayWords!.length) {
      setPhase('intro_today');
    } else {
      setReviewIndex(next);
      setReviewSelected(null);
      setReviewInput('');
      setReviewInputStatus('idle');
    }
  };

  // ─── PHASE: intro_review ─────────────────────────────────────────────────
  if (phase === 'intro_review') {
    return (
      <View style={[styles.card, styles.centerCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.confirmEmoji}>🔁</Text>
        <Text style={[styles.confirmTitle, { color: colors.text }]}>{t.introReviewTitle}</Text>
        <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.introReviewSub}</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: s(24) }]}
          onPress={() => setPhase('review_yesterday')}
        >
          <Text style={styles.btnText}>{t.introReviewYes}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPhase('read_today')} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.text2 }]}>{t.introReviewNo}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── PHASE: review_yesterday ─────────────────────────────────────────────
  if (phase === 'review_yesterday' && reviewWord) {
    const wordKey = `${reviewWord.word}_${reviewWord.topic}`;

    if (reviewGameType === 'write') {
      const answered = reviewInputStatus !== 'idle';
      return (
        <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.phaseLabel, { color: colors.primary }]}>{t.yesterdayTitle}</Text>
          <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.yesterdaySub}</Text>
          <Text style={[styles.counter, { color: colors.text2 }]}>{reviewIndex + 1} / {yesterdayWords!.length}</Text>
          <Text style={[styles.meaning, { color: colors.primary, fontSize: s(28), marginVertical: s(12) }]}>
            {reviewWord.meaning}
          </Text>
          <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.writePrompt}</Text>
          {!answered ? (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.primary, color: colors.text }]}
              value={reviewInput} onChangeText={setReviewInput}
              autoCorrect={false} autoCapitalize="none"
              onSubmitEditing={() => {
                if (!reviewInput.trim()) return;
                if (normalize(reviewInput) === normalize(reviewWord.word)) {
                  setReviewInputStatus('correct');
                } else { setReviewInputStatus('wrong'); }
              }}
            />
          ) : (
            <View style={styles.resultBox}>
              {reviewInputStatus === 'correct'
                ? <Text style={styles.resultCorrect}>✓ {reviewWord.word}</Text>
                : <><Text style={styles.resultWrong}>✗ {reviewInput || '—'}</Text>
                    <Text style={styles.resultCorrect}>→ {reviewWord.word}</Text></>
              }
            </View>
          )}
          <View style={styles.rowBtns}>
            {!answered ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }, !reviewInput.trim() && styles.btnDisabled]}
                  onPress={() => {
                    if (!reviewInput.trim()) return;
                    if (normalize(reviewInput) === normalize(reviewWord.word)) {
                      setReviewInputStatus('correct');
                    } else { setReviewInputStatus('wrong'); }
                  }}
                  disabled={!reviewInput.trim()}
                >
                  <Text style={styles.btnText}>{t.check}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.revealBtn, { borderColor: colors.border, flex: 1 }]}
                  onPress={() => setReviewInputStatus('revealed')}
                >
                  <Text style={[styles.btnText, { color: colors.text2 }]}>{t.reveal}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={advanceReview}
              >
                <Text style={styles.btnText}>{t.nextQ}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      );
    }

    // QUIZ game for yesterday
    const answered = reviewSelected !== null;
    return (
      <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.phaseLabel, { color: colors.primary }]}>{t.yesterdayTitle}</Text>
        <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.yesterdaySub}</Text>
        <Text style={[styles.counter, { color: colors.text2 }]}>
          {reviewIndex + 1} / {yesterdayWords!.length}
        </Text>
        <Text style={[styles.bigWord, { color: colors.text }]}>{reviewWord.word}</Text>
        <View style={styles.options}>
          {reviewOptions.map((opt, i) => {
            const k = `${opt.word}_${opt.topic}`;
            const isCorrect = k === wordKey;
            const isSelected = k === reviewSelected;
            let bg = colors.surface2; let border = colors.border; let tc = colors.text;
            if (answered) {
              if (isCorrect) { bg = '#e8f5e9'; border = '#4caf50'; tc = '#2e7d32'; }
              else if (isSelected) { bg = '#ffebee'; border = '#f44336'; tc = '#c62828'; }
            }
            return (
              <TouchableOpacity
                key={i}
                style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                onPress={() => {
                  if (answered) return;
                  setReviewSelected(k);
                }}
                disabled={answered}
              >
                <Text style={[styles.optionText, { color: tc }]}>{opt.meaning}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {answered && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={advanceReview}
          >
            <Text style={styles.btnText}>{t.nextQ}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ─── PHASE: intro_today ──────────────────────────────────────────────────
  if (phase === 'intro_today') {
    return (
      <View style={[styles.card, styles.centerCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.confirmEmoji}>📖</Text>
        <Text style={[styles.confirmTitle, { color: colors.text }]}>{t.introTodayTitle}</Text>
        <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.introTodaySub}</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: s(24) }]}
          onPress={() => setPhase('read_today')}
        >
          <Text style={styles.btnText}>{t.introTodayBtn}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── PHASE: read_today ───────────────────────────────────────────────────
  if (phase === 'read_today') {
    const w = todayWords[readIndex];
    const isLast = readIndex === todayWords.length - 1;
    return (
      <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.phaseLabel, { color: colors.primary }]}>{t.readTitle}</Text>
        <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.readSub}</Text>
        <Text style={[styles.counter, { color: colors.text2 }]}>
          {readIndex + 1} / {todayWords.length} {t.wordOf}
        </Text>

        <View style={[styles.wordCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
          <Text style={[styles.bigWord, { color: colors.text }]}>{w.word}</Text>
          {w.pronunciation ? <Text style={[styles.pronunciation, { color: colors.text2 }]}>({w.pronunciation})</Text> : null}
          <Text style={[styles.meaning, { color: colors.primary }]}>{w.meaning}</Text>
          {w.examples?.[0] ? (
            <Text style={[styles.example, { color: colors.text2 }]}>• {w.examples[0]}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: isLast ? '#4caf50' : colors.primary }]}
          onPress={() => {
            if (isLast) setPhase('confirm');
            else setReadIndex(i => i + 1);
          }}
        >
          <Text style={styles.btnText}>{isLast ? t.done : t.next}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.text2 }]}>{t.skip}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── PHASE: confirm ──────────────────────────────────────────────────────
  if (phase === 'confirm') {
    return (
      <View style={[styles.card, styles.centerCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.confirmEmoji}>🧠</Text>
        <Text style={[styles.confirmTitle, { color: colors.text }]}>{t.confirmTitle}</Text>
        <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.confirmSub}</Text>
        {/* Option 1: practice now */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#4caf50', marginTop: s(24) }]}
          onPress={() => { setPhase('practice'); setGameType('quiz'); }}
        >
          <Text style={styles.btnText}>{t.practiceNow}</Text>
        </TouchableOpacity>
        {/* Option 2: re-read */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: s(10) }]}
          onPress={() => { setReadIndex(0); setPhase('read_today'); }}
        >
          <Text style={styles.btnText}>{t.rereadBtn}</Text>
        </TouchableOpacity>
        {/* Option 3: skip */}
        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.text2 }]}>{t.skip}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── PHASE: practice ────────────────────────────────────────────────────
  if (phase === 'practice' && currentWord) {
    const wordKey = `${currentWord.word}_${currentWord.topic}`;

    if (gameType === 'quiz') {
      const answered = selected !== null;
      return (
        <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.phaseLabel, { color: colors.primary }]}>{t.practiceTitle}</Text>
          <Text style={[styles.counter, { color: colors.text2 }]}>{practiceIndex + 1} / {practiceWords.length}</Text>
          <Text style={[styles.quizPrompt, { color: colors.text2 }]}>{t.quizPrompt}</Text>
          <Text style={[styles.bigWord, { color: colors.text }]}>{currentWord.word}</Text>
          <View style={styles.options}>
            {quizOptions.map((opt, i) => {
              const k = `${opt.word}_${opt.topic}`;
              const isCorrect = k === wordKey;
              const isSelected = k === selected;
              let bg = colors.surface2; let border = colors.border; let tc = colors.text;
              if (answered) {
                if (isCorrect) { bg = '#e8f5e9'; border = '#4caf50'; tc = '#2e7d32'; }
                else if (isSelected) { bg = '#ffebee'; border = '#f44336'; tc = '#c62828'; }
              }
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                  onPress={() => {
                    if (answered) return;
                    setSelected(k);
                    if (isCorrect) setCorrect(c => c + 1); else setIncorrect(c => c + 1);
                  }}
                  disabled={answered}
                >
                  <Text style={[styles.optionText, { color: tc }]}>{opt.meaning}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {answered && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50' }]} onPress={advancePractice}>
              <Text style={styles.btnText}>{t.nextQ}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      );
    }

    // write game
    const answered = inputStatus !== 'idle';
    return (
      <ScrollView contentContainerStyle={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.phaseLabel, { color: colors.primary }]}>{t.practiceTitle}</Text>
        <Text style={[styles.counter, { color: colors.text2 }]}>{practiceIndex + 1} / {practiceWords.length}</Text>
        <Text style={[styles.meaning, { color: colors.primary, fontSize: s(28), marginVertical: s(12) }]}>
          {currentWord.meaning}
        </Text>
        <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.writePrompt}</Text>
        {!answered ? (
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.primary, color: colors.text }]}
            value={input} onChangeText={setInput}
            autoCorrect={false} autoCapitalize="none"
            onSubmitEditing={() => {
              if (!input.trim()) return;
              if (normalize(input) === normalize(currentWord.word)) {
                setInputStatus('correct'); setCorrect(c => c + 1);
              } else {
                setInputStatus('wrong'); setIncorrect(c => c + 1);
              }
            }}
          />
        ) : (
          <View style={styles.resultBox}>
            {inputStatus === 'correct'
              ? <Text style={styles.resultCorrect}>✓ {currentWord.word}</Text>
              : <View>
                  <Text style={styles.resultWrong}>✗ {input || '—'}</Text>
                  <Text style={styles.resultCorrect}>→ {currentWord.word}</Text>
                </View>
            }
          </View>
        )}
        <View style={styles.rowBtns}>
          {!answered ? (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }, !input.trim() && styles.btnDisabled]}
                onPress={() => {
                  if (!input.trim()) return;
                  if (normalize(input) === normalize(currentWord.word)) {
                    setInputStatus('correct'); setCorrect(c => c + 1);
                  } else {
                    setInputStatus('wrong'); setIncorrect(c => c + 1);
                  }
                }}
                disabled={!input.trim()}
              >
                <Text style={styles.btnText}>{t.check}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.revealBtn, { borderColor: colors.border, flex: 1 }]}
                onPress={() => { setInputStatus('revealed'); setIncorrect(c => c + 1); }}
              >
                <Text style={[styles.btnText, { color: colors.text2 }]}>{t.reveal}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4caf50', flex: 1 }]} onPress={advancePractice}>
              <Text style={styles.btnText}>{t.nextQ}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  // ─── PHASE: done ─────────────────────────────────────────────────────────
  const total = correct + incorrect;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <View style={[styles.card, styles.centerCard, { backgroundColor: colors.surface }]}>
      <Text style={styles.confirmEmoji}>🎉</Text>
      <Text style={[styles.confirmTitle, { color: colors.text }]}>{t.summaryTitle}</Text>
      <Text style={[styles.phaseSub, { color: colors.text2 }]}>{t.memorized}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#4caf50' }]}>{correct}</Text>
          <Text style={[styles.statLabel, { color: colors.text2 }]}>{t.summaryCorrect}</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxMid]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{pct}%</Text>
          <Text style={[styles.statLabel, { color: colors.text2 }]}>Score</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#f44336' }]}>{incorrect}</Text>
          <Text style={[styles.statLabel, { color: colors.text2 }]}>{t.summaryWrong}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: '#4caf50', marginTop: s(24) }]}
        onPress={() => onDone(correct, incorrect)}
      >
        <Text style={styles.btnText}>{t.finish}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: { padding: s(20), gap: s(12), flexGrow: 1 },
  centerCard: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  phaseLabel: { fontSize: s(13), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  phaseSub: { fontSize: s(14), textAlign: 'center', lineHeight: s(20) },
  counter: { fontSize: s(12), alignSelf: 'flex-end' },
  bigWord: { fontSize: s(44), fontWeight: '800', textAlign: 'center' },
  pronunciation: { fontSize: s(14), fontStyle: 'italic', textAlign: 'center' },
  meaning: { fontSize: s(22), fontWeight: '700', textAlign: 'center' },
  example: { fontSize: s(13), textAlign: 'center', fontStyle: 'italic' },
  wordCard: {
    width: '100%', padding: s(20), borderRadius: s(14),
    borderWidth: 1.5, alignItems: 'center', gap: s(8),
  },
  options: { width: '100%', gap: s(10) },
  option: { padding: s(14), borderRadius: s(10), borderWidth: 2, alignItems: 'center' },
  optionText: { fontSize: s(16), textAlign: 'center' },
  quizPrompt: { fontSize: s(14), textAlign: 'center' },
  input: {
    width: '100%', padding: s(14), fontSize: s(18),
    borderWidth: 2, borderRadius: s(10), textAlign: 'center',
  },
  resultBox: { alignItems: 'center', gap: s(4) },
  resultCorrect: { fontSize: s(22), fontWeight: '700', color: '#4caf50', textAlign: 'center' },
  resultWrong: { fontSize: s(18), color: '#f44336', textAlign: 'center' },
  rowBtns: { flexDirection: 'row', gap: s(10), width: '100%' },
  btn: { padding: s(14), borderRadius: s(12), alignItems: 'center', width: '100%' },
  btnDisabled: { opacity: 0.4 },
  revealBtn: { backgroundColor: 'transparent', borderWidth: 1.5 },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: s(8) },
  skipText: { fontSize: s(13) },
  confirmEmoji: { fontSize: s(56), textAlign: 'center' },
  confirmTitle: { fontSize: s(24), fontWeight: '800', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: s(12), marginTop: s(16) },
  statBox: { alignItems: 'center', flex: 1 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#eee' },
  statNum: { fontSize: s(32), fontWeight: '800' },
  statLabel: { fontSize: s(12) },
});
