export type OnboardingLang = 'he' | 'es' | 'en';

export const onboardingTranslations: Record<OnboardingLang, {
  welcome: string; welcomeSub: string; fullName: string; namePlaceholder: string;
  email: string; emailPlaceholder: string; continueBtn: string; backBtn: string;
  yourLanguages: string; languagesSub: string; nativeLang: string; learningLang: string;
  yourLevel: string; levelSub: string;
  levelBeginner: string; levelBeginnerSub: string;
  levelIntermediate: string; levelIntermediateSub: string;
  levelAdvanced: string; levelAdvancedSub: string;
  reminders: string; remindersSub: string; enableReminders: string;
  yes: string; no: string; whatTime: string; reminderAt: string; startBtn: string;
  permDenied: string; openSettings: string; continueWithout: string; soon: string;
  nameRequired: string; nameRequiredMsg: string; emailInvalid: string; emailInvalidMsg: string;
  selectNative: string; selectNativeMsg: string; selectLearning: string; selectLearningMsg: string;
  selectLevel: string; selectLevelMsg: string;
}> = {
  he: {
    welcome: '!ברוך הבא', welcomeSub: 'ספר לנו קצת על עצמך',
    fullName: 'שם מלא', namePlaceholder: 'השם שלך',
    email: 'דואר אלקטרוני', emailPlaceholder: 'you@email.com',
    continueBtn: 'המשך ←', backBtn: '→ חזור',
    yourLanguages: 'השפות שלך', languagesSub: 'זה מותאם אישית את החוויה שלך',
    nativeLang: '?באיזו שפה אתה מדבר', learningLang: '?איזו שפה אתה רוצה ללמוד',
    yourLevel: 'מה הרמה שלך?', levelSub: 'זה עוזר לנו להתאים את החוויה שלך',
    levelBeginner: '🌱 מתחיל', levelBeginnerSub: 'אני חדש בשפה הזו',
    levelIntermediate: '📚 בינוני', levelIntermediateSub: 'אני מכיר כמה מילים ומשפטים',
    levelAdvanced: '🗣️ מתקדם', levelAdvancedSub: 'אני רוצה לשפר את הדיבור שלי',
    reminders: 'תזכורות', remindersSub: 'נזכיר לך ללמוד פעם ביום',
    enableReminders: 'הפעל תזכורות', yes: 'כן', no: 'לא',
    whatTime: '?באיזו שעה אתה רוצה ללמוד', reminderAt: 'תקבל תזכורת בשעה',
    startBtn: '!בואו נתחיל 🚀',
    permDenied: '⚠️ הרשאות ההתראות מושבתות.\nעבור להגדרות המערכת כדי להפעיל אותן.',
    openSettings: 'פתח הגדרות', continueWithout: 'המשך ללא התראות', soon: 'בקרוב',
    nameRequired: 'שם חסר', nameRequiredMsg: 'אנא הכנס את שמך המלא.',
    emailInvalid: 'אימייל לא תקין', emailInvalidMsg: 'אנא הכנס כתובת אימייל תקינה.',
    selectNative: 'בחר שפה', selectNativeMsg: 'ציין באיזו שפה אתה מדבר.',
    selectLearning: 'בחר שפה ללמוד', selectLearningMsg: 'ציין איזו שפה אתה רוצה ללמוד.',
    selectLevel: 'בחר רמה', selectLevelMsg: 'אנא בחר את רמת השפה שלך.',
  },
  es: {
    welcome: '¡Bienvenido!', welcomeSub: 'Cuéntanos un poco sobre ti',
    fullName: 'Nombre completo', namePlaceholder: 'Tu nombre',
    email: 'Correo electrónico', emailPlaceholder: 'tu@correo.com',
    continueBtn: 'Continuar →', backBtn: '← Atrás',
    yourLanguages: 'Tus idiomas', languagesSub: 'Esto personaliza tu experiencia',
    nativeLang: '¿Qué idioma hablas?', learningLang: '¿Qué idioma quieres aprender?',
    yourLevel: '¿Cuál es tu nivel?', levelSub: 'Esto nos ayuda a personalizar tu experiencia',
    levelBeginner: '🌱 Principiante', levelBeginnerSub: 'Soy nuevo en este idioma',
    levelIntermediate: '📚 Intermedio', levelIntermediateSub: 'Conozco algunas palabras y frases',
    levelAdvanced: '🗣️ Avanzado', levelAdvancedSub: 'Quiero mejorar mi conversación',
    reminders: 'Recordatorios', remindersSub: 'Te recordamos estudiar una vez al día',
    enableReminders: 'Activar recordatorios', yes: 'Sí', no: 'No',
    whatTime: '¿A qué hora quieres estudiar?', reminderAt: 'Recibirás un recordatorio a las',
    startBtn: '¡Empezar! 🚀',
    permDenied: '⚠️ Los permisos de notificación están desactivados.\nVe a Configuración para activarlos.',
    openSettings: 'Abrir Configuración', continueWithout: 'Continuar sin notificaciones', soon: 'Próximamente',
    nameRequired: 'Falta tu nombre', nameRequiredMsg: 'Por favor ingresa tu nombre completo.',
    emailInvalid: 'Email inválido', emailInvalidMsg: 'Por favor ingresa un correo válido.',
    selectNative: 'Selecciona tu idioma', selectNativeMsg: 'Indica qué idioma hablas.',
    selectLearning: 'Selecciona idioma a aprender', selectLearningMsg: 'Indica qué idioma quieres aprender.',
    selectLevel: 'Selecciona tu nivel', selectLevelMsg: 'Por favor elige tu nivel de idioma.',
  },
  en: {
    welcome: 'Welcome!', welcomeSub: 'Tell us a bit about yourself',
    fullName: 'Full name', namePlaceholder: 'Your name',
    email: 'Email address', emailPlaceholder: 'you@email.com',
    continueBtn: 'Continue →', backBtn: '← Back',
    yourLanguages: 'Your languages', languagesSub: 'This personalizes your experience',
    nativeLang: 'What language do you speak?', learningLang: 'What language do you want to learn?',
    yourLevel: 'What is your level?', levelSub: 'This helps us personalize your experience',
    levelBeginner: '🌱 Beginner', levelBeginnerSub: "I'm new to this language",
    levelIntermediate: '📚 Intermediate', levelIntermediateSub: 'I know some words and phrases',
    levelAdvanced: '🗣️ Advanced', levelAdvancedSub: 'I want to improve my speaking',
    reminders: 'Reminders', remindersSub: "We'll remind you to study once a day",
    enableReminders: 'Enable reminders', yes: 'Yes', no: 'No',
    whatTime: 'What time do you want to study?', reminderAt: "You'll get a reminder at",
    startBtn: "Let's start! 🚀",
    permDenied: '⚠️ Notification permissions are disabled.\nGo to Settings to enable them.',
    openSettings: 'Open Settings', continueWithout: 'Continue without notifications', soon: 'Coming soon',
    nameRequired: 'Name required', nameRequiredMsg: 'Please enter your full name.',
    emailInvalid: 'Invalid email', emailInvalidMsg: 'Please enter a valid email address.',
    selectNative: 'Select your language', selectNativeMsg: 'Indicate what language you speak.',
    selectLearning: 'Select language to learn', selectLearningMsg: 'Indicate what language you want to learn.',
    selectLevel: 'Select your level', selectLevelMsg: 'Please choose your language level.',
  },
};

export const UI_LANG_OPTIONS: { code: OnboardingLang; label: string }[] = [
  { code: 'he', label: 'עב' },
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
];
