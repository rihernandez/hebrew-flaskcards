import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar as RNStatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LearnScreen } from './src/screens/LearnScreen';
import { SpeakingScreen } from './src/screens/SpeakingScreen';
import { ImmersionScreen } from './src/screens/ImmersionScreen';
import { OnboardingScreen } from './src/components/OnboardingScreen';
import { LoginScreen } from './src/components/LoginScreen';
import { Language } from './src/types/Word';
import { getProfile, saveProfile, UserProfile } from './src/utils/userProfile';
import { getUILanguageFromNative } from './src/utils/translations';
import { getCompletedStreak } from './src/utils/dailyChallenge';
import { authApi } from './src/utils/apiClient';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 44;

const TAB_LABELS: Record<Language, { learn: string; speaking: string; immersion: string }> = {
  he: { learn: 'לימוד', speaking: 'דיבור', immersion: 'שקיעה' },
  es: { learn: 'Aprender', speaking: 'Speaking', immersion: 'Inmersión' },
  en: { learn: 'Learn', speaking: 'Speaking', immersion: 'Immersion' },
};

type Tab = 'learn' | 'speaking' | 'immersion';

const SPEAKING_LOCK_DAYS = 30;

const LOCK_LABELS: Record<Language, {
  lockedSpeaking: string; lockedImmersion: string; lockedSub: string; daysLeft: string; unlocked: string;
}> = {
  he: { lockedSpeaking: '🔒 Speaking נעול', lockedImmersion: '🔒 Comprehension נעול', lockedSub: 'השלם את אתגר 30 הימים כדי לפתוח', daysLeft: 'ימים נותרו', unlocked: '🎉 נפתח!' },
  es: { lockedSpeaking: '🔒 Speaking bloqueado', lockedImmersion: '🔒 Comprehension bloqueado', lockedSub: 'Completa el reto de 30 días para desbloquearlo', daysLeft: 'días restantes', unlocked: '🎉 ¡Desbloqueado!' },
  en: { lockedSpeaking: '🔒 Speaking locked', lockedImmersion: '🔒 Comprehension locked', lockedSub: 'Complete the 30-day challenge to unlock it', daysLeft: 'days remaining', unlocked: '🎉 Unlocked!' },
};

function LockedFeatureScreen({ daysCompleted, uiLanguage, colors, feature }: {
  daysCompleted: number; uiLanguage: Language; colors: any; feature: 'speaking' | 'immersion';
}) {
  const l = LOCK_LABELS[uiLanguage] ?? LOCK_LABELS.es;
  const daysLeft = Math.max(0, SPEAKING_LOCK_DAYS - daysCompleted);
  const progress = Math.min(1, daysCompleted / SPEAKING_LOCK_DAYS);
  const title = feature === 'speaking' ? l.lockedSpeaking : l.lockedImmersion;

  return (
    <View style={[lockStyles.container, { backgroundColor: colors.bg }]}>
      <Text style={lockStyles.lockIcon}>🔒</Text>
      <Text style={[lockStyles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[lockStyles.sub, { color: colors.text2 }]}>{l.lockedSub}</Text>

      {/* Progress bar */}
      <View style={[lockStyles.barBg, { backgroundColor: colors.border }]}>
        <View style={[lockStyles.barFill, { width: `${progress * 100}%` as any, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[lockStyles.counter, { color: colors.primary }]}>
        {daysCompleted} / {SPEAKING_LOCK_DAYS}
      </Text>
      <Text style={[lockStyles.daysLeft, { color: colors.text2 }]}>
        {daysLeft} {l.daysLeft}
      </Text>
    </View>
  );
}

function AppRoot() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [challengeStreak, setChallengeStreak] = useState(0);

  // Load saved profile once on mount
  useEffect(() => {
    const loadProfile = async () => {
      setAuthView('login');
      await AsyncStorage.clear();
      const saved = await getProfile();
      setProfile(saved);
    };

    loadProfile()
      .finally(() => {
        setProfileLoaded(true);
      });
  }, []);

  // If profile is removed, default auth flow starts from login
  useEffect(() => {
    if (!profile) {
      setAuthView('login');
      setActiveTab('learn');
      setChallengeStreak(0);
    }
  }, [profile]);

  // Check challenge streak and auto-unlock speaking when 30 days reached
  useEffect(() => {
    if (!profile) {
      setChallengeStreak(0);
      return;
    }
    getCompletedStreak().then(async streak => {
      setChallengeStreak(streak);
      if (!profile.speakingUnlocked && streak >= SPEAKING_LOCK_DAYS) {
        try {
          await authApi.updateProfile({ speakingUnlocked: true });
        } catch {
          // keep local unlock even if backend update fails temporarily
        }
        const updated = { ...profile, speakingUnlocked: true };
        await saveProfile(updated);
        setProfile(updated);
      }
    });
  }, [profile?.speakingUnlocked, profile?.remoteId]);

  const handleAuthSuccess = (p: UserProfile) => {
    setProfile(p);
    setActiveTab('learn');
  };

  const handleProfileUpdate = (p: UserProfile) => {
    setProfile(p);
  };

  // Still loading
  if (!profileLoaded) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // No profile — show auth screens
  if (!profile) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {authView === 'login' ? (
          <LoginScreen
            onLoginSuccess={handleAuthSuccess}
            onGoToRegister={() => setAuthView('register')}
          />
        ) : (
          <OnboardingScreen
            onComplete={handleAuthSuccess}
            onGoToLogin={() => setAuthView('login')}
          />
        )}
      </View>
    );
  }

  const uiLanguage = getUILanguageFromNative(profile.nativeLanguage);
  const labels = TAB_LABELS[uiLanguage] ?? TAB_LABELS.he;
  const speakingUnlocked = profile.speakingUnlocked;
  const immersionUnlocked = profile.speakingUnlocked;

  return (
    <View style={styles.root}>
      {/* Top tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'learn' && styles.tabActive]}
          onPress={() => setActiveTab('learn')}
        >
          <Text style={styles.tabIcon}>📚</Text>
          <Text style={styles.tabLabel}>{labels.learn}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'speaking' && styles.tabActive]}
          onPress={() => setActiveTab('speaking')}
        >
          <Text style={styles.tabIcon}>{speakingUnlocked ? '🗣️' : '🔒'}</Text>
          <Text style={styles.tabLabel}>{labels.speaking}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'immersion' && styles.tabActive]}
          onPress={() => setActiveTab('immersion')}
        >
          <Text style={styles.tabIcon}>{immersionUnlocked ? '🌍' : '🔒'}</Text>
          <Text style={styles.tabLabel}>{labels.immersion}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        <View style={{ flex: 1, display: activeTab === 'learn' ? 'flex' : 'none' }}>
          <LearnScreen profile={profile} onProfileUpdate={handleProfileUpdate} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'speaking' ? 'flex' : 'none' }}>
          {speakingUnlocked ? (
            <SpeakingScreen uiLanguage={uiLanguage} language={profile.learningLanguage} isAdvanced={profile.isAdvanced} />
          ) : (
            <LockedFeatureScreen daysCompleted={challengeStreak} uiLanguage={uiLanguage} colors={colors} feature="speaking" />
          )}
        </View>
        <View style={{ flex: 1, display: activeTab === 'immersion' ? 'flex' : 'none' }}>
          {immersionUnlocked ? (
            <ImmersionScreen uiLanguage={uiLanguage} language={profile.learningLanguage} />
          ) : (
            <LockedFeatureScreen daysCompleted={challengeStreak} uiLanguage={uiLanguage} colors={colors} feature="immersion" />
          )}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppRoot />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    paddingTop: STATUS_BAR_HEIGHT,
    paddingBottom: s(6),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(10),
    gap: s(4),
  },
  tabActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottomWidth: s(3),
    borderBottomColor: '#fff',
  },
  tabIcon: { fontSize: s(22) },
  tabLabel: { fontSize: s(12), fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  debugBtn: { position: 'absolute', bottom: s(8), right: s(8), backgroundColor: '#ff5722', paddingVertical: s(6), paddingHorizontal: s(12), borderRadius: s(8) },
  debugBtnText: { color: '#fff', fontSize: s(11), fontWeight: '700' },
});

const lockStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: s(32), gap: s(12) },
  lockIcon: { fontSize: s(56) },
  title: { fontSize: s(20), fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: s(14), textAlign: 'center', lineHeight: s(22) },
  barBg: { width: '100%', height: s(10), borderRadius: s(5), marginTop: s(8) },
  barFill: { height: '100%', borderRadius: s(5) },
  counter: { fontSize: s(18), fontWeight: '700' },
  daysLeft: { fontSize: s(13) },
});
