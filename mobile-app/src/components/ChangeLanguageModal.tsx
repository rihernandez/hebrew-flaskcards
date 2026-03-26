import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Dimensions, Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { UserProfile, saveProfile, clearLanguageProgress } from '../utils/userProfile';
import { ALL_LANGUAGES } from '../utils/languages';

const { width } = Dimensions.get('window');
const s = (n: number) => Math.round(n * Math.min(width / 390, 1.8));

interface Props {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onChanged: (newLearning: string) => void;
}

export const ChangeLanguageModal: React.FC<Props> = ({ visible, profile, onClose, onChanged }) => {
  const { colors } = useTheme();
  const [selected, setSelected] = useState(profile.learningLanguage);

  const available = ALL_LANGUAGES.filter(l => l.name !== profile.nativeLanguage);

  const handleConfirm = () => {
    if (selected === profile.learningLanguage) { onClose(); return; }
    Alert.alert(
      'Cambiar idioma',
      `Esto borrará todo tu progreso en "${profile.learningLanguage}". ¿Estás seguro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, cambiar',
          style: 'destructive',
          onPress: async () => {
            await clearLanguageProgress(profile.learningLanguage);
            const updated: UserProfile = { ...profile, learningLanguage: selected };
            await saveProfile(updated);
            onChanged(selected);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Cambiar idioma que aprendo</Text>
          <Text style={[styles.subtitle, { color: colors.text2 }]}>
            Tu idioma nativo: {profile.nativeLanguage}
          </Text>

          <View style={styles.langRow}>
            {available.map(({ name, flag, available: avail }) => {
              const isSelected = selected === name;
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.langBtn, { borderColor: avail ? colors.primary : colors.border },
                    isSelected && { backgroundColor: colors.primary },
                    !avail && { opacity: 0.45 },
                  ]}
                  onPress={() => { if (avail) setSelected(name); }}
                  disabled={!avail}
                >
                  <Text style={[styles.langBtnText, { color: isSelected ? '#fff' : avail ? colors.primary : colors.text2 }]}>
                    {flag} {name}
                  </Text>
                  {!avail && <Text style={styles.soonBadge}>Próximamente</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {selected !== profile.learningLanguage && (
            <View style={[styles.warningBox, { backgroundColor: '#fff3e0', borderColor: '#ff9800' }]}>
              <Text style={styles.warningText}>
                ⚠️ Se borrará tu progreso en {profile.learningLanguage}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, { borderColor: colors.border, borderWidth: 1.5 }]} onPress={onClose}>
              <Text style={[styles.btnText, { color: colors.text2 }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleConfirm}>
              <Text style={styles.btnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: s(20), borderTopRightRadius: s(20),
    padding: s(24), gap: s(12),
  },
  title: { fontSize: s(20), fontWeight: '700' },
  subtitle: { fontSize: s(14) },
  langRow: { flexDirection: 'row', gap: s(10), marginTop: s(8) },
  langBtn: {
    paddingVertical: s(12), paddingHorizontal: s(24),
    borderRadius: s(24), borderWidth: 2,
  },
  langBtnText: { fontSize: s(15), fontWeight: '600' },
  soonBadge: { fontSize: s(9), color: '#999', marginTop: s(2), textAlign: 'center' },
  warningBox: { padding: s(12), borderRadius: s(10), borderWidth: 1.5 },
  warningText: { fontSize: s(13), color: '#e65100' },
  actions: { flexDirection: 'row', gap: s(10), marginTop: s(8) },
  btn: { flex: 1, padding: s(14), borderRadius: s(12), alignItems: 'center' },
  btnText: { color: '#fff', fontSize: s(15), fontWeight: '600' },
});
