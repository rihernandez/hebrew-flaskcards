/**
 * ActivityHub — hub de actividades de speaking
 * Muestra 5 tarjetas: 4 nuevas actividades + sesión de shadowing existente
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types/Word';
import { ActivityType, ActivityResult, saveActivityResult } from '../utils/activityResults';
import { ShadowPhrase, ConversationSituation, PronunciacionItem, DictadoItem, TranslationPair, LecturaParagraph } from '../utils/speakingContent';
import { SpeakingSession } from './SpeakingSession';
import { PronunciacionActivity } from './PronunciacionActivity';
import { DictadoActivity } from './DictadoActivity';
import { TraduccionActivity } from './TraduccionActivity';
import { LecturaActivity } from './LecturaActivity';
import { VelocimetroActivity } from './VelocimetroActivity';
import { RepeticionActivity } from './RepeticionActivity';
import { AcentoActivity } from './AcentoActivity';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

type ActiveModal = ActivityType | 'session' | 'velocimetro' | 'repeticion' | 'acento' | null;

const L: Record<Language, {
  hubTitle: string; streakLabel: string;
  sessionTitle: string; sessionDesc: string;
  pronunciacionTitle: string; pronunciacionDesc: string;
  dictadoTitle: string; dictadoDesc: string;
  traduccionTitle: string; traduccionDesc: string;
  lecturaTitle: string; lecturaDesc: string;
  velocimetroTitle: string; velocimetroDesc: string;
  repeticionTitle: string; repeticionDesc: string;
  acentoTitle: string; acentoDesc: string;
}> = {
  he: {
    hubTitle: '🗣️ Speaking', streakLabel: 'ימי אתגר',
    sessionTitle: 'שאדואינג + שיחה', sessionDesc: 'אימון יומי עם פרזות ומצבים',
    pronunciacionTitle: 'הגייה מודרכת', pronunciacionDesc: 'האזן, חזור ובדוק את ההגייה שלך',
    dictadoTitle: 'כתיב', dictadoDesc: 'האזן לביטוי וכתוב מה ששמעת',
    traduccionTitle: 'תרגום בעל פה', traduccionDesc: 'ראה ביטוי בעברית ואמר אותו בספרדית',
    lecturaTitle: 'קריאה בקול', lecturaDesc: 'קרא פסקה ומדוד את השטף שלך',
    velocimetroTitle: 'מד מהירות דיבור', velocimetroDesc: 'דבר בחופשיות ומדוד את קצב הדיבור שלך בזמן אמת',
    repeticionTitle: 'חזור על מה ששמעת', repeticionDesc: 'האזן לביטוי וחזור עליו תוך 8 שניות',
    acentoTitle: 'גלאי מבטא', acentoDesc: 'קבל ציון דמיון להגייה של דובר מקורי',
  },
  es: {
    hubTitle: '🗣️ Speaking', streakLabel: 'días de reto',
    sessionTitle: 'Shadowing + Conversación', sessionDesc: 'Entrenamiento diario con frases y situaciones',
    pronunciacionTitle: 'Pronunciación Guiada', pronunciacionDesc: 'Escucha, repite y verifica tu pronunciación',
    dictadoTitle: 'Dictado', dictadoDesc: 'Escucha la frase y escribe lo que oyes',
    traduccionTitle: 'Traducción Oral', traduccionDesc: 'Ve una frase en hebreo y dila en español',
    lecturaTitle: 'Lectura en Voz Alta', lecturaDesc: 'Lee un párrafo y mide tu fluidez',
    velocimetroTitle: 'Velocímetro de Habla', velocimetroDesc: 'Habla libremente y mide tu velocidad en tiempo real',
    repeticionTitle: 'Repite lo que Escuchas', repeticionDesc: 'Escucha la frase y repítela en 8 segundos',
    acentoTitle: 'Detector de Acento', acentoDesc: 'Recibe un score de similitud con un hablante nativo',
  },
  en: {
    hubTitle: '🗣️ Speaking', streakLabel: 'challenge days',
    sessionTitle: 'Shadowing + Conversation', sessionDesc: 'Daily training with phrases and situations',
    pronunciacionTitle: 'Guided Pronunciation', pronunciacionDesc: 'Listen, repeat and check your pronunciation',
    dictadoTitle: 'Dictation', dictadoDesc: 'Listen to the phrase and write what you hear',
    traduccionTitle: 'Oral Translation', traduccionDesc: 'See a phrase in Hebrew and say it in Spanish',
    lecturaTitle: 'Read Aloud', lecturaDesc: 'Read a paragraph and measure your fluency',
    velocimetroTitle: 'Speech Speedometer', velocimetroDesc: 'Speak freely and measure your speed in real time',
    repeticionTitle: 'Repeat What You Hear', repeticionDesc: 'Listen to the phrase and repeat it in 8 seconds',
    acentoTitle: 'Accent Detector', acentoDesc: 'Get a similarity score compared to a native speaker',
  },
};

interface ActivityCardProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ icon, title, description, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.cardIcon}>{icon}</Text>
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardDesc, { color: colors.text2 }]}>{description}</Text>
      </View>
      <Text style={[styles.cardArrow, { color: colors.primary }]}>›</Text>
    </TouchableOpacity>
  );
};

interface Props {
  uiLanguage: Language;
  language: string;
  isAdvanced: boolean;
  challengeStreak: number;
  phrases: ShadowPhrase[];
  situations: ConversationSituation[];
  pronunciacionItems: PronunciacionItem[];
  dictadoItems: DictadoItem[];
  translationPairs: TranslationPair[];
  lecturaParagraph: LecturaParagraph | null;
  onSessionDone: () => void;
}

export const ActivityHub: React.FC<Props> = ({
  uiLanguage, language, challengeStreak,
  phrases, situations,
  pronunciacionItems, dictadoItems, translationPairs, lecturaParagraph,
  onSessionDone,
}) => {
  const { colors } = useTheme();
  const t = L[uiLanguage] ?? L.he;
  const isRTL = uiLanguage === 'he';

  const [active, setActive] = useState<ActiveModal>(null);
  const [sttAvailable, setSttAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Voice = require('@react-native-voice/voice').default;
        await Voice.isAvailable();
        if (!cancelled) setSttAvailable(true);
      } catch {
        // STT not available — use fallback UI
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleComplete = async (result: ActivityResult) => {
    await saveActivityResult(result);
    setActive(null);
  };

  const handleSessionDone = () => {
    setActive(null);
    onSessionDone();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, isRTL && styles.rtl]}>
        <Text style={[styles.hubTitle, { color: colors.text }]}>{t.hubTitle}</Text>
        <Text style={[styles.streak, { color: colors.primary }]}>🔥 {challengeStreak} {t.streakLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        <ActivityCard icon="🗣️" title={t.sessionTitle} description={t.sessionDesc} onPress={() => setActive('session')} />
        <ActivityCard icon="🔊" title={t.pronunciacionTitle} description={t.pronunciacionDesc} onPress={() => setActive('pronunciacion')} />
        <ActivityCard icon="✍️" title={t.dictadoTitle} description={t.dictadoDesc} onPress={() => setActive('dictado')} />
        <ActivityCard icon="🔄" title={t.traduccionTitle} description={t.traduccionDesc} onPress={() => setActive('traduccion')} />
        <ActivityCard icon="📖" title={t.lecturaTitle} description={t.lecturaDesc} onPress={() => setActive('lectura')} />
        <ActivityCard icon="⚡" title={t.velocimetroTitle} description={t.velocimetroDesc} onPress={() => setActive('velocimetro')} />
        <ActivityCard icon="🔁" title={t.repeticionTitle} description={t.repeticionDesc} onPress={() => setActive('repeticion')} />
        <ActivityCard icon="🎯" title={t.acentoTitle} description={t.acentoDesc} onPress={() => setActive('acento')} />
      </ScrollView>

      {/* Existing shadowing session */}
      <Modal visible={active === 'session'} animationType="slide">
        <SpeakingSession
          phrases={phrases} situations={situations} uiLanguage={uiLanguage}
          onDone={handleSessionDone}
          onSkip={() => setActive(null)}
        />
      </Modal>

      {/* Pronunciación Guiada */}
      <Modal visible={active === 'pronunciacion'} animationType="slide">
        <PronunciacionActivity
          items={pronunciacionItems}
          uiLanguage={uiLanguage}
          targetLanguage="es-ES"
          sttAvailable={sttAvailable}
          language={language}
          onComplete={handleComplete}
          onExit={() => setActive(null)}
        />
      </Modal>

      {/* Dictado */}
      <Modal visible={active === 'dictado'} animationType="slide">
        <DictadoActivity
          items={dictadoItems}
          uiLanguage={uiLanguage}
          targetLanguage="es-ES"
          language={language}
          onComplete={handleComplete}
          onExit={() => setActive(null)}
        />
      </Modal>

      {/* Traducción Oral */}
      <Modal visible={active === 'traduccion'} animationType="slide">
        <TraduccionActivity
          items={translationPairs}
          uiLanguage={uiLanguage}
          targetLanguage="es-ES"
          sttAvailable={sttAvailable}
          language={language}
          onComplete={handleComplete}
          onExit={() => setActive(null)}
        />
      </Modal>

      {/* Lectura en Voz Alta */}
      {lecturaParagraph && (
        <Modal visible={active === 'lectura'} animationType="slide">
          <LecturaActivity
            paragraph={lecturaParagraph}
            uiLanguage={uiLanguage}
            targetLanguage="es-ES"
            sttAvailable={sttAvailable}
            language={language}
            onComplete={handleComplete}
            onExit={() => setActive(null)}
          />
        </Modal>
      )}

      {/* Velocímetro de Habla */}
      <Modal visible={active === 'velocimetro'} animationType="slide">
        <VelocimetroActivity
          uiLanguage={uiLanguage}
          language={language}
          onComplete={handleComplete}
          onExit={() => setActive(null)}
        />
      </Modal>

      {/* Repite lo que Escuchas */}
      <Modal visible={active === 'repeticion'} animationType="slide">
        <RepeticionActivity
          uiLanguage={uiLanguage}
          language={language}
          onComplete={handleComplete}
          onExit={() => setActive(null)}
        />
      </Modal>

      {/* Detector de Acento */}
      <Modal visible={active === 'acento'} animationType="slide">
        <AcentoActivity
          items={pronunciacionItems}
          uiLanguage={uiLanguage}
          language={language}
          onComplete={handleComplete}
          onExit={() => setActive(null)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: s(20), paddingTop: s(20), paddingBottom: s(8), gap: s(4) },
  rtl: { alignItems: 'flex-end' },
  hubTitle: { fontSize: s(22), fontWeight: '800' },
  streak: { fontSize: s(15), fontWeight: '700' },
  grid: { padding: s(16), gap: s(12) },
  card: { flexDirection: 'row', alignItems: 'center', padding: s(16), borderRadius: s(14), borderWidth: 1, gap: s(12) },
  cardIcon: { fontSize: s(28) },
  cardText: { flex: 1, gap: s(2) },
  cardTitle: { fontSize: s(15), fontWeight: '700' },
  cardDesc: { fontSize: s(12), lineHeight: s(18) },
  cardArrow: { fontSize: s(24), fontWeight: '300' },
});
