import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { UserProfile, updateProfile } from '../utils/userProfile';
import { Language } from '../types/Word';
import { scheduleDailyNotification, cancelDailyNotification } from '../utils/notifications';
import { authApi } from '../utils/apiClient';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const labels: Record<Language, {
  title: string; name: string; email: string; native: string; learning: string;
  notifications: string; notifOn: string; notifOff: string; reminderAt: string;
  save: string; saved: string; close: string; since: string;
}> = {
  he: {
    title: 'הפרופיל שלי', name: 'שם', email: 'אימייל', native: 'שפת אם', learning: 'לומד',
    notifications: 'תזכורת יומית', notifOn: 'פעיל', notifOff: 'כבוי',
    reminderAt: 'שעת תזכורת', save: 'שמור', saved: '✓ נשמר', close: 'סגור', since: 'חבר מאז',
  },
  es: {
    title: 'Mi perfil', name: 'Nombre', email: 'Correo', native: 'Idioma nativo', learning: 'Aprendiendo',
    notifications: 'Recordatorio diario', notifOn: 'Activo', notifOff: 'Desactivado',
    reminderAt: 'Hora del recordatorio', save: 'Guardar', saved: '✓ Guardado', close: 'Cerrar', since: 'Miembro desde',
  },
  en: {
    title: 'My profile', name: 'Name', email: 'Email', native: 'Native language', learning: 'Learning',
    notifications: 'Daily reminder', notifOn: 'Active', notifOff: 'Off',
    reminderAt: 'Reminder time', save: 'Save', saved: '✓ Saved', close: 'Close', since: 'Member since',
  },
};

interface Props {
  profile: UserProfile;
  uiLanguage: Language;
  onClose: () => void;
  onProfileUpdated: (p: UserProfile) => void;
}

export const ProfileScreen: React.FC<Props> = ({ profile, uiLanguage, onClose, onProfileUpdated }) => {
  const { colors } = useTheme();
  const t = labels[uiLanguage] ?? labels.he;
  const [name, setName] = useState(profile.name);
  const [notifHour, setNotifHour] = useState(profile.notificationHour);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('', 'Name cannot be empty'); return; }
    const trimmedName = name.trim();
    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.join(' ') || profile.name.split(/\s+/).slice(1).join(' ') || 'User';
    const minute = 0;

    try {
      await authApi.updateProfile({
        firstName: firstName || 'User',
        lastName,
        notificationHour: notifHour,
        notificationMinute: minute,
      });

      const updated: UserProfile = {
        ...profile,
        name: trimmedName,
        notificationHour: notifHour,
        notificationMinute: minute,
      };
      await updateProfile(updated);

      if (notifHour >= 0) {
        await scheduleDailyNotification(notifHour, minute, trimmedName);
      } else {
        await cancelDailyNotification();
      }

      onProfileUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo guardar el perfil en el servidor.');
    }
  };

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString()
    : '—';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
          <Text style={[styles.closeBtnText, { color: colors.text2 }]}>{t.close} ✕</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={[styles.since, { color: colors.text2 }]}>{t.since} {memberSince}</Text>

      {/* Fields */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.text2 }]}>{t.name}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
          value={name} onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={[styles.label, { color: colors.text2 }]}>{t.email}</Text>
        <Text style={[styles.readOnly, { color: colors.text }]}>{profile.email}</Text>

        <Text style={[styles.label, { color: colors.text2 }]}>{t.native}</Text>
        <Text style={[styles.readOnly, { color: colors.text }]}>{profile.nativeLanguage}</Text>

        <Text style={[styles.label, { color: colors.text2 }]}>{t.learning}</Text>
        <Text style={[styles.readOnly, { color: colors.text }]}>{profile.learningLanguage}</Text>
      </View>

      {/* Notifications */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.notifRow}>
          <Text style={[styles.label, { color: colors.text2, marginBottom: 0 }]}>{t.notifications}</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: notifHour >= 0 ? colors.primary : colors.border }]}
            onPress={() => setNotifHour(h => h >= 0 ? -1 : 20)}
          >
            <Text style={styles.toggleText}>{notifHour >= 0 ? t.notifOn : t.notifOff}</Text>
          </TouchableOpacity>
        </View>

        {notifHour >= 0 && (
          <>
            <Text style={[styles.label, { color: colors.text2, marginTop: s(16) }]}>{t.reminderAt}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.hourBtn, { borderColor: colors.primary }, notifHour === h && { backgroundColor: colors.primary }]}
                  onPress={() => setNotifHour(h)}
                >
                  <Text style={[styles.hourText, { color: notifHour === h ? '#fff' : colors.primary }]}>
                    {String(h).padStart(2, '0')}:00
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: saved ? '#4caf50' : colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>{saved ? t.saved : t.save}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: s(20), paddingTop: s(24),
  },
  title: { fontSize: s(22), fontWeight: '700' },
  closeBtn: { paddingVertical: s(8), paddingHorizontal: s(14), borderRadius: s(20) },
  closeBtnText: { fontSize: s(13), fontWeight: '600' },
  avatarContainer: {
    width: s(80), height: s(80), borderRadius: s(40),
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: s(8),
  },
  avatarText: { fontSize: s(36), fontWeight: '800', color: '#fff' },
  since: { textAlign: 'center', fontSize: s(12), marginBottom: s(20) },
  card: { marginHorizontal: s(16), marginBottom: s(16), padding: s(16), borderRadius: s(12), gap: s(4) },
  label: { fontSize: s(12), fontWeight: '600', marginBottom: s(4), marginTop: s(8) },
  input: {
    padding: s(12), borderRadius: s(8), borderWidth: 1.5,
    fontSize: s(16), marginBottom: s(4),
  },
  readOnly: { fontSize: s(16), paddingVertical: s(4), paddingHorizontal: s(2) },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleBtn: { paddingVertical: s(8), paddingHorizontal: s(16), borderRadius: s(20) },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: s(13) },
  hourScroll: { marginTop: s(8) },
  hourBtn: {
    paddingVertical: s(8), paddingHorizontal: s(12),
    borderRadius: s(8), borderWidth: 2, marginRight: s(8),
  },
  hourText: { fontSize: s(13), fontWeight: '600' },
  saveBtn: {
    marginHorizontal: s(16), marginBottom: s(40),
    padding: s(16), borderRadius: s(12), alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
});
