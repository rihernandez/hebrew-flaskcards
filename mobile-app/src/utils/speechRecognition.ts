/**
 * speechRecognition.ts
 * Wrapper seguro para expo-speech-recognition.
 * Si el módulo nativo no está disponible (Expo Go / emulador sin build),
 * todas las funciones son no-ops y isAvailable() retorna false.
 */

let _module: any = null;
let _checked = false;

function getModule() {
  if (_checked) return _module;
  _checked = true;
  try {
    const m = require('expo-speech-recognition');
    // Verify the native module is actually loaded
    if (m?.ExpoSpeechRecognitionModule?.requestPermissionsAsync) {
      _module = m;
    }
  } catch {
    _module = null;
  }
  return _module;
}

export const SpeechRecognition = {
  isAvailable(): boolean {
    return getModule() !== null;
  },

  async requestPermissions(): Promise<boolean> {
    const m = getModule();
    if (!m) return false;
    try {
      const { granted } = await m.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return granted;
    } catch { return false; }
  },

  start(options: { lang: string; interimResults?: boolean; continuous?: boolean }) {
    const m = getModule();
    if (!m) return;
    try { m.ExpoSpeechRecognitionModule.start(options); } catch { /* ignore */ }
  },

  stop() {
    const m = getModule();
    if (!m) return;
    try { m.ExpoSpeechRecognitionModule.stop(); } catch { /* ignore */ }
  },

  onResult(cb: (transcript: string) => void): () => void {
    const m = getModule();
    if (!m) return () => {};
    try {
      const sub = m.ExpoSpeechRecognitionModule.addListener?.('result', (e: any) => {
        cb(e.results?.[0]?.transcript ?? '');
      });
      return () => sub?.remove?.();
    } catch { return () => {}; }
  },

  onEnd(cb: () => void): () => void {
    const m = getModule();
    if (!m) return () => {};
    try {
      const sub = m.ExpoSpeechRecognitionModule.addListener?.('end', cb);
      return () => sub?.remove?.();
    } catch { return () => {}; }
  },
};
