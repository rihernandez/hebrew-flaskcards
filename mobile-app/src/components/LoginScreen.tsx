import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as Localization from 'expo-localization';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../utils/apiClient';
import { UserProfile, saveProfile } from '../utils/userProfile';
import { UI_LANG_OPTIONS, OnboardingLang } from '../utils/onboardingI18n';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

type UiLang = OnboardingLang;

const getInitialLang = (): UiLang => {
  const locale = Localization.getLocales()[0]?.languageCode;
  if (locale === 'es' || locale === 'en' || locale === 'he') return locale;
  return 'es';
};

const L: Record<UiLang, {
  title: string;
  subtitle: string;
  email: string;
  password: string;
  login: string;
  registerPrompt: string;
  registerAction: string;
  emailRequired: string;
  passRequired: string;
  authError: string;
  forgotAction: string;
  forgotTitle: string;
  forgotHint: string;
  sendTempPassword: string;
  forgotSuccess: string;
  forgotError: string;
  tempPasswordTitle: string;
  tempPasswordHint: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  passwordMismatch: string;
  passwordTooShort: string;
  tempPasswordUpdated: string;
}> = {
  es: {
    title: 'Iniciar sesión',
    subtitle: 'Accede con tu cuenta para continuar',
    email: 'Correo electrónico',
    password: 'Contraseña',
    login: 'Entrar',
    registerPrompt: '¿No tienes cuenta?',
    registerAction: 'Regístrate',
    emailRequired: 'Ingresa un correo válido.',
    passRequired: 'Ingresa tu contraseña.',
    authError: 'No se pudo iniciar sesión. Verifica tus credenciales.',
    forgotAction: 'Cambiar contraseña',
    forgotTitle: 'Recuperar acceso',
    forgotHint: 'Te enviaremos una contraseña temporal al correo indicado.',
    sendTempPassword: 'Enviar contraseña temporal',
    forgotSuccess: 'Si el correo existe, enviamos una contraseña temporal.',
    forgotError: 'No se pudo enviar la contraseña temporal.',
    tempPasswordTitle: 'Debes cambiar tu contraseña',
    tempPasswordHint: 'Entraste con contraseña temporal. Define una nueva para continuar.',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    updatePassword: 'Actualizar contraseña',
    passwordMismatch: 'Las contraseñas no coinciden.',
    passwordTooShort: 'La nueva contraseña debe tener al menos 6 caracteres.',
    tempPasswordUpdated: 'Contraseña actualizada. Inicia sesión nuevamente.',
  },
  en: {
    title: 'Sign in',
    subtitle: 'Use your account to continue',
    email: 'Email',
    password: 'Password',
    login: 'Sign in',
    registerPrompt: "Don't have an account?",
    registerAction: 'Register',
    emailRequired: 'Enter a valid email.',
    passRequired: 'Enter your password.',
    authError: 'Could not sign in. Please verify your credentials.',
    forgotAction: 'Change password',
    forgotTitle: 'Recover access',
    forgotHint: 'We will send a temporary password to your email.',
    sendTempPassword: 'Send temporary password',
    forgotSuccess: 'If email exists, we sent a temporary password.',
    forgotError: 'Could not send temporary password.',
    tempPasswordTitle: 'You must change your password',
    tempPasswordHint: 'You logged in with a temporary password. Set a new one to continue.',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    updatePassword: 'Update password',
    passwordMismatch: 'Passwords do not match.',
    passwordTooShort: 'New password must be at least 6 characters.',
    tempPasswordUpdated: 'Password updated. Please sign in again.',
  },
  he: {
    title: 'התחברות',
    subtitle: 'התחברו עם החשבון שלכם כדי להמשיך',
    email: 'אימייל',
    password: 'סיסמה',
    login: 'כניסה',
    registerPrompt: 'אין לכם חשבון?',
    registerAction: 'להרשמה',
    emailRequired: 'הזינו אימייל תקין.',
    passRequired: 'הזינו סיסמה.',
    authError: 'לא ניתן להתחבר. בדקו את הפרטים.',
    forgotAction: 'שינוי סיסמה',
    forgotTitle: 'שחזור גישה',
    forgotHint: 'נשלח סיסמה זמנית למייל שהוזן.',
    sendTempPassword: 'שליחת סיסמה זמנית',
    forgotSuccess: 'אם המייל קיים, נשלחה סיסמה זמנית.',
    forgotError: 'לא ניתן לשלוח סיסמה זמנית.',
    tempPasswordTitle: 'צריך להחליף סיסמה',
    tempPasswordHint: 'נכנסתם עם סיסמה זמנית. הגדירו סיסמה חדשה.',
    newPassword: 'סיסמה חדשה',
    confirmPassword: 'אימות סיסמה',
    updatePassword: 'עדכון סיסמה',
    passwordMismatch: 'הסיסמאות לא תואמות.',
    passwordTooShort: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים.',
    tempPasswordUpdated: 'הסיסמה עודכנה. התחברו מחדש.',
  },
};

interface Props {
  onLoginSuccess: (profile: UserProfile) => void;
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess, onGoToRegister }) => {
  const { colors } = useTheme();
  const [uiLang, setUiLang] = useState<UiLang>(getInitialLang);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [tempPasswordVisible, setTempPasswordVisible] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempLoading, setTempLoading] = useState(false);

  const t = L[uiLang];
  const isRTL = uiLang === 'he';

  const handleLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', t.emailRequired);
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', t.passRequired);
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authApi.login(email.trim().toLowerCase(), password);
      if (user.mustChangePassword) {
        setTempToken(token);
        setTempPasswordVisible(true);
        return;
      }
      const isAdvanced = user.languageLevel === 'advanced';
      const profile: UserProfile = {
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        nativeLanguage: user.nativeLanguage,
        learningLanguage: user.learningLanguage,
        notificationHour: user.notificationHour ?? 20,
        notificationMinute: user.notificationMinute ?? 0,
        createdAt: user.createdAt ?? new Date().toISOString(),
        isAdvanced,
        speakingUnlocked: user.speakingUnlocked ?? isAdvanced,
        remoteId: user._id,
        token,
      };
      await saveProfile(profile);
      onLoginSuccess(profile);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? t.authError);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      Alert.alert('Error', t.emailRequired);
      return;
    }

    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotVisible(false);
      Alert.alert('OK', t.forgotSuccess);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? t.forgotError);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleTemporaryPasswordUpdate = async () => {
    if (!tempToken) {
      Alert.alert('Error', t.authError);
      return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert('Error', t.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', t.passwordMismatch);
      return;
    }

    setTempLoading(true);
    try {
      await authApi.changeTemporaryPassword(tempToken, newPassword);
      setTempPasswordVisible(false);
      setTempToken(null);
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      Alert.alert('OK', t.tempPasswordUpdated);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? t.authError);
    } finally {
      setTempLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t.title}</Text>
        <Text style={[styles.subtitle, { color: colors.text2, textAlign: isRTL ? 'right' : 'left' }]}>{t.subtitle}</Text>

        <Text style={[styles.label, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t.email}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
          value={email}
          onChangeText={setEmail}
          placeholder={t.email}
          placeholderTextColor={colors.text2}
          autoCapitalize="none"
          keyboardType="email-address"
          textAlign={isRTL ? 'right' : 'left'}
        />

        <Text style={[styles.label, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t.password}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
          value={password}
          onChangeText={setPassword}
          placeholder={t.password}
          placeholderTextColor={colors.text2}
          secureTextEntry
          autoCapitalize="none"
          textAlign={isRTL ? 'right' : 'left'}
        />

        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>{t.login}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => {
            setForgotEmail(email.trim().toLowerCase());
            setForgotVisible(true);
          }}
          disabled={loading}
        >
          <Text style={[styles.forgotBtnText, { color: colors.primary }]}>{t.forgotAction}</Text>
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.text2 }]}>{t.registerPrompt}</Text>
          <TouchableOpacity onPress={onGoToRegister}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>{t.registerAction}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={forgotVisible} transparent animationType="fade" onRequestClose={() => setForgotVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.forgotTitle}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text2 }]}>{t.forgotHint}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              placeholder={t.email}
              placeholderTextColor={colors.text2}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.primary }, forgotLoading && { opacity: 0.7 }]}
              onPress={handleForgotPassword}
              disabled={forgotLoading}
            >
              {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>{t.sendTempPassword}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={tempPasswordVisible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.tempPasswordTitle}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text2 }]}>{t.tempPasswordHint}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t.newPassword}
              placeholderTextColor={colors.text2}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t.confirmPassword}
              placeholderTextColor={colors.text2}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.primary }, tempLoading && { opacity: 0.7 }]}
              onPress={handleTemporaryPasswordUpdate}
              disabled={tempLoading}
            >
              {tempLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>{t.updatePassword}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: s(24),
  },
  uiLangContainer: { position: 'absolute', top: s(28), right: s(16), zIndex: 100 },
  uiLangBtn: { paddingVertical: s(6), paddingHorizontal: s(12), borderRadius: s(20), borderWidth: 1.5 },
  uiLangBtnText: { fontSize: s(13), fontWeight: '700' },
  uiLangDropdown: { position: 'absolute', top: s(36), right: 0, borderRadius: s(10), borderWidth: 1.5, overflow: 'hidden', minWidth: s(60) },
  uiLangOption: { paddingVertical: s(8), paddingHorizontal: s(14) },
  uiLangOptionText: { fontSize: s(13), fontWeight: '600', textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: s(16),
    padding: s(20),
    gap: s(8),
  },
  title: {
    fontSize: s(28),
    fontWeight: '800',
  },
  subtitle: {
    fontSize: s(14),
    marginBottom: s(6),
  },
  label: {
    fontSize: s(14),
    fontWeight: '600',
    marginTop: s(8),
  },
  input: {
    borderWidth: 1,
    borderRadius: s(10),
    padding: s(12),
    fontSize: s(15),
  },
  loginBtn: {
    marginTop: s(14),
    borderRadius: s(10),
    paddingVertical: s(14),
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#fff',
    fontSize: s(15),
    fontWeight: '700',
  },
  footerRow: {
    marginTop: s(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(5),
  },
  footerText: {
    fontSize: s(13),
  },
  footerLink: {
    fontSize: s(13),
    fontWeight: '700',
  },
  forgotBtn: {
    alignSelf: 'center',
    marginTop: s(8),
  },
  forgotBtnText: {
    fontSize: s(13),
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: s(24),
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: s(14),
    padding: s(16),
    gap: s(10),
  },
  modalTitle: {
    fontSize: s(18),
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: s(13),
  },
});
