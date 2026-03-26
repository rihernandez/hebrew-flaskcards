import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { UserProfile, saveProfile } from '../utils/userProfile';
import { authApi } from '../utils/apiClient';
import { checkPermission, requestPermission, openAppSettings, scheduleDailyNotification } from '../utils/notifications';
import { useTheme } from '../context/ThemeContext';
import { ALL_LANGUAGES } from '../utils/languages';
import { onboardingTranslations, UI_LANG_OPTIONS, OnboardingLang } from '../utils/onboardingI18n';
import * as Localization from 'expo-localization';

const getInitialUiLang = (): OnboardingLang => {
  const locale = Localization.getLocales()[0]?.languageCode;
  if (locale === 'he') return 'he';
  if (locale === 'es') return 'es';
  if (locale === 'en') return 'en';
  return 'he'; // fallback — app is for Israelis
};

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type LevelIdx = 0 | 1 | 2 | null;

interface Props {
  onComplete: (profile: UserProfile) => void;
  onGoToLogin?: () => void;
}

export const OnboardingScreen: React.FC<Props> = ({ onComplete, onGoToLogin }) => {
  const { colors } = useTheme();
  const [uiLang, setUiLang] = useState<OnboardingLang>(getInitialUiLang);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nativeLang, setNativeLang] = useState('');
  const [learningLang, setLearningLang] = useState('');
  const [levelIdx, setLevelIdx] = useState<LevelIdx>(null);
  const [notifHour, setNotifHour] = useState(20);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [permStatus, setPermStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [loading, setLoading] = useState(false);

  const t = onboardingTranslations[uiLang];
  const isRTL = uiLang === 'he';
  const availableLearning = ALL_LANGUAGES.filter(l => l.name !== nativeLang);

  const LEVELS: { label: string; sub: string }[] = [
    { label: t.levelBeginner, sub: t.levelBeginnerSub },
    { label: t.levelIntermediate, sub: t.levelIntermediateSub },
    { label: t.levelAdvanced, sub: t.levelAdvancedSub },
  ];

  const validateStep1 = () => {
    if (!name.trim()) { Alert.alert(t.nameRequired, t.nameRequiredMsg); return false; }
    if (!lastName.trim()) { Alert.alert('Apellido requerido', 'Por favor ingresa tu apellido'); return false; }
    if (!email.trim() || !email.includes('@')) { Alert.alert(t.emailInvalid, t.emailInvalidMsg); return false; }
    if (!password.trim() || password.length < 6) { Alert.alert('Contraseña inválida', 'Mínimo 6 caracteres'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!nativeLang) { Alert.alert(t.selectNative, t.selectNativeMsg); return false; }
    if (!learningLang) { Alert.alert(t.selectLearning, t.selectLearningMsg); return false; }
    if (levelIdx === null) { Alert.alert(t.selectLevel, t.selectLevelMsg); return false; }
    return true;
  };

  const handleNotifications = async () => {
    if (!notifEnabled) return await finish(-1, 0);
    const current = await checkPermission();
    if (current === 'granted') {
      await scheduleDailyNotification(notifHour, 0, name);
      return await finish(notifHour, 0);
    }
    const result = await requestPermission();
    if (result === 'granted') {
      await scheduleDailyNotification(notifHour, 0, name);
      return await finish(notifHour, 0);
    }
    setPermStatus('denied');
  };

  const finish = async (hour: number, minute: number) => {
    const advanced = levelIdx === 2;
    const levelMap = ['beginner', 'intermediate', 'advanced'] as const;

    setLoading(true);
    try {
      const { token, user } = await authApi.register({
        firstName: name.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        age: 18, // default — can be updated in profile
        country: 'Unknown',
        nativeLanguage: nativeLang,
        learningLanguage: learningLang,
        languageLevel: levelMap[levelIdx ?? 0],
        notificationHour: hour,
        notificationMinute: minute,
        speakingUnlocked: advanced,
      });

      const profile: UserProfile = {
        name: `${name.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        nativeLanguage: nativeLang,
        learningLanguage: learningLang,
        notificationHour: user.notificationHour ?? hour,
        notificationMinute: user.notificationMinute ?? minute,
        createdAt: user.createdAt ?? new Date().toISOString(),
        isAdvanced: advanced,
        speakingUnlocked: user.speakingUnlocked ?? advanced,
        remoteId: user._id,
        token,
      };
      await saveProfile(profile);
      onComplete(profile);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo registrar. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* UI Language selector */}
      <View style={styles.uiLangContainer}>
        <TouchableOpacity
          style={[styles.uiLangBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowLangPicker(v => !v)}
        >
          <Text style={[styles.uiLangBtnText, { color: colors.primary }]}>
            {UI_LANG_OPTIONS.find(o => o.code === uiLang)?.label} ▾
          </Text>
        </TouchableOpacity>
        {showLangPicker && (
          <View style={[styles.uiLangDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {UI_LANG_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.code}
                style={[styles.uiLangOption, opt.code === uiLang && { backgroundColor: colors.primary + '22' }]}
                onPress={() => { setUiLang(opt.code); setShowLangPicker(false); }}
              >
                <Text style={[styles.uiLangOptionText, { color: opt.code === uiLang ? colors.primary : colors.text }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.primary : colors.border }]} />
        ))}
      </View>

      {onGoToLogin && (
        <View style={styles.authLinkRow}>
          <Text style={[styles.authLinkText, { color: colors.text2 }]}>¿Ya tienes cuenta?</Text>
          <TouchableOpacity onPress={onGoToLogin}>
            <Text style={[styles.authLinkAction, { color: colors.primary }]}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 1 — Personal data */}
      {step === 1 && (
        <View style={[styles.stepContainer, isRTL && styles.rtl]}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'center' }]}>{t.welcome}</Text>
          <Text style={[styles.subtitle, { color: colors.text2, textAlign: isRTL ? 'right' : 'center' }]}>{t.welcomeSub}</Text>

          <Text style={[styles.label, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t.fullName}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
            value={name} onChangeText={setName}
            placeholder={t.namePlaceholder} placeholderTextColor={colors.text2}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>Apellido</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
            value={lastName} onChangeText={setLastName}
            placeholder="Tu apellido" placeholderTextColor={colors.text2}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t.email}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={email} onChangeText={setEmail}
            placeholder={t.emailPlaceholder} placeholderTextColor={colors.text2}
            keyboardType="email-address" autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>Contraseña</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={password} onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.text2}
            secureTextEntry autoCapitalize="none"
          />

          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => validateStep1() && setStep(2)}>
            <Text style={styles.btnText}>{t.continueBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2 — Languages + Level */}
      {step === 2 && (
        <View style={[styles.stepContainer, isRTL && styles.rtl]}>
          <Text style={styles.emoji}>🌐</Text>
          <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'center' }]}>{t.yourLanguages}</Text>
          <Text style={[styles.subtitle, { color: colors.text2, textAlign: isRTL ? 'right' : 'center' }]}>{t.languagesSub}</Text>

          <Text style={[styles.label, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t.nativeLang}</Text>
          <View style={styles.langRow}>
            {ALL_LANGUAGES.map(({ name: lang, flag, available }) => {
              const isSelected = nativeLang === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langBtn, { borderColor: available ? colors.primary : colors.border },
                    isSelected && { backgroundColor: colors.primary },
                    !available && { opacity: 0.45 },
                  ]}
                  onPress={() => { if (available) { setNativeLang(lang); setLearningLang(''); setLevelIdx(null); } }}
                  disabled={!available}
                >
                  <Text style={[styles.langBtnText, { color: isSelected ? '#fff' : available ? colors.primary : colors.text2 }]}>
                    {flag} {lang}
                  </Text>
                  {!available && <Text style={styles.soonBadge}>{t.soon}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {nativeLang !== '' && (
            <>
              <Text style={[styles.label, { color: colors.text, marginTop: s(20), textAlign: isRTL ? 'right' : 'left' }]}>{t.learningLang}</Text>
              <View style={styles.langRow}>
                {availableLearning.map(({ name: lang, flag, available }) => {
                  const isSelected = learningLang === lang;
                  return (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.langBtn, { borderColor: available ? colors.primary : colors.border },
                        isSelected && { backgroundColor: colors.primary },
                        !available && { opacity: 0.45 },
                      ]}
                      onPress={() => { if (available) { setLearningLang(lang); setLevelIdx(null); } }}
                      disabled={!available}
                    >
                      <Text style={[styles.langBtnText, { color: isSelected ? '#fff' : available ? colors.primary : colors.text2 }]}>
                        {flag} {lang}
                      </Text>
                      {!available && <Text style={styles.soonBadge}>{t.soon}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {learningLang !== '' && (
            <>
              <Text style={[styles.label, { color: colors.text, marginTop: s(20), textAlign: isRTL ? 'right' : 'left' }]}>{t.yourLevel}</Text>
              <Text style={[styles.subtitle, { color: colors.text2, textAlign: isRTL ? 'right' : 'left', marginBottom: s(8) }]}>{t.levelSub}</Text>
              <View style={styles.levelRow}>
                {LEVELS.map((lvl, idx) => {
                  const isSelected = levelIdx === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.levelBtn, { borderColor: colors.primary },
                        isSelected && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setLevelIdx(idx as LevelIdx)}
                    >
                      <Text style={[styles.levelBtnText, { color: isSelected ? '#fff' : colors.primary }]}>
                        {lvl.label}
                      </Text>
                      <Text style={[styles.levelBtnSub, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.text2 }]}>
                        {lvl.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]} onPress={() => setStep(1)}>
              <Text style={[styles.btnText, { color: colors.text2 }]}>{t.backBtn}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]} onPress={() => validateStep2() && setStep(3)}>
              <Text style={styles.btnText}>{t.continueBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 3 — Notifications */}
      {step === 3 && (
        <View style={[styles.stepContainer, isRTL && styles.rtl]}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'center' }]}>{t.reminders}</Text>
          <Text style={[styles.subtitle, { color: colors.text2, textAlign: isRTL ? 'right' : 'center' }]}>{t.remindersSub}</Text>

          <View style={styles.notifToggleRow}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>{t.enableReminders}</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: notifEnabled ? colors.primary : colors.border }]}
              onPress={() => setNotifEnabled(v => !v)}
            >
              <Text style={styles.toggleBtnText}>{notifEnabled ? t.yes : t.no}</Text>
            </TouchableOpacity>
          </View>

          {notifEnabled && (
            <>
              <Text style={[styles.label, { color: colors.text, marginTop: s(20), textAlign: isRTL ? 'right' : 'left' }]}>{t.whatTime}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.hourBtn, { borderColor: colors.primary }, notifHour === h && { backgroundColor: colors.primary }]}
                    onPress={() => setNotifHour(h)}
                  >
                    <Text style={[styles.hourBtnText, { color: notifHour === h ? '#fff' : colors.primary }]}>
                      {String(h).padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.selectedHour, { color: colors.text2 }]}>
                {t.reminderAt} {String(notifHour).padStart(2, '0')}:00
              </Text>
            </>
          )}

          {permStatus === 'denied' && (
            <View style={[styles.permDeniedBox, { backgroundColor: '#fff3e0', borderColor: '#ff9800' }]}>
              <Text style={styles.permDeniedText}>{t.permDenied}</Text>
              <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: '#ff9800' }]} onPress={openAppSettings}>
                <Text style={styles.btnText}>{t.openSettings}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => finish(-1, 0)}>
                <Text style={[styles.skipText, { color: colors.text2 }]}>{t.continueWithout}</Text>
              </TouchableOpacity>
            </View>
          )}

          {permStatus !== 'denied' && (
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]} onPress={() => setStep(2)}>
                <Text style={[styles.btnText, { color: colors.text2 }]}>{t.backBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }, loading && { opacity: 0.7 }]}
                onPress={handleNotifications}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>{t.startBtn}</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: s(24), paddingTop: s(60), flexGrow: 1 },
  uiLangContainer: { position: 'absolute', top: s(16), right: s(16), zIndex: 100 },
  uiLangBtn: { paddingVertical: s(6), paddingHorizontal: s(12), borderRadius: s(20), borderWidth: 1.5 },
  uiLangBtnText: { fontSize: s(13), fontWeight: '700' },
  uiLangDropdown: { position: 'absolute', top: s(36), right: 0, borderRadius: s(10), borderWidth: 1.5, overflow: 'hidden', minWidth: s(60) },
  uiLangOption: { paddingVertical: s(8), paddingHorizontal: s(14) },
  uiLangOptionText: { fontSize: s(13), fontWeight: '600', textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: s(8), marginBottom: s(32) },
  dot: { width: s(10), height: s(10), borderRadius: s(5) },
  authLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: s(5), marginBottom: s(20) },
  authLinkText: { fontSize: s(13) },
  authLinkAction: { fontSize: s(13), fontWeight: '700' },
  stepContainer: { gap: s(8) },
  rtl: { direction: 'rtl' } as any,
  emoji: { fontSize: s(48), textAlign: 'center', marginBottom: s(8) },
  title: { fontSize: s(28), fontWeight: '700' },
  subtitle: { fontSize: s(15), marginBottom: s(8) },
  label: { fontSize: s(14), fontWeight: '600', marginBottom: s(6) },
  input: { padding: s(14), borderRadius: s(10), borderWidth: 1.5, fontSize: s(16), marginBottom: s(8) },
  langRow: { flexDirection: 'row', gap: s(10), flexWrap: 'wrap' },
  langBtn: { paddingVertical: s(10), paddingHorizontal: s(16), borderRadius: s(24), borderWidth: 2, alignItems: 'center' },
  langBtnText: { fontSize: s(14), fontWeight: '600' },
  soonBadge: { fontSize: s(9), color: '#999', marginTop: s(2) },
  levelRow: { gap: s(10) },
  levelBtn: { padding: s(14), borderRadius: s(14), borderWidth: 2, alignItems: 'flex-start', gap: s(2) },
  levelBtnText: { fontSize: s(15), fontWeight: '700' },
  levelBtnSub: { fontSize: s(12) },
  btn: { padding: s(16), borderRadius: s(12), alignItems: 'center', marginTop: s(16) },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1.5, flex: 0, paddingHorizontal: s(20) },
  btnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  rowBtns: { flexDirection: 'row', gap: s(10), marginTop: s(16) },
  notifToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: s(8) },
  toggleBtn: { paddingVertical: s(8), paddingHorizontal: s(20), borderRadius: s(20) },
  toggleBtnText: { color: '#fff', fontWeight: '700', fontSize: s(14) },
  hourScroll: { marginTop: s(8), marginBottom: s(4) },
  hourBtn: { paddingVertical: s(10), paddingHorizontal: s(14), borderRadius: s(10), borderWidth: 2, marginRight: s(8) },
  hourBtnText: { fontSize: s(14), fontWeight: '600' },
  selectedHour: { fontSize: s(13), textAlign: 'center', marginTop: s(4) },
  permDeniedBox: { marginTop: s(16), padding: s(16), borderRadius: s(12), borderWidth: 1.5, gap: s(10) },
  permDeniedText: { fontSize: s(14), color: '#e65100', lineHeight: s(20) },
  settingsBtn: { padding: s(12), borderRadius: s(10), alignItems: 'center' },
  skipBtn: { alignItems: 'center', padding: s(8) },
  skipText: { fontSize: s(13) },
});
