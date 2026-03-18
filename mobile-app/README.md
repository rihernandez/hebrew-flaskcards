# Hebrew Flashcards Mobile App

Aplicación móvil offline para aprender hebreo con flashcards. Funciona 100% sin conexión a internet y sin necesidad de backend.

## Características

- ✅ **100% Offline**: Todos los datos (3,671 palabras) están embebidos en la app
- ✅ **Sin Backend**: No requiere servidor ni base de datos
- ✅ **React Native + Expo**: Compatible con Android e iOS
- ✅ **Múltiples Modos de Estudio**:
  - **Modo Normal**: Navega manualmente entre palabras
  - **Modo Blitz**: Repaso automático rápido (3 segundos por palabra)
  - **Modo Bullet**: Repaso automático ultra-rápido (1.5 segundos por palabra)
  - **Modo Focus**: Marca palabras como correctas/incorrectas con resumen final

## Contenido

- **3,671 palabras en hebreo** organizadas en 13 temas:
  - Números (57)
  - Cardinales (20)
  - Preposiciones y artículos (74)
  - Pronombres (90)
  - Adverbios (179)
  - Adjetivos (309)
  - Sustantivos (2,116)
  - Verbos (234)
  - Raíz (210)
  - Slang (200)
  - Frases útiles (136)
  - Gramática (147)

## Requisitos

- Node.js 18+
- npm o yarn
- Expo Go app en tu dispositivo móvil (Android/iOS)

## Instalación

```bash
cd mobile-app
npm install
```

## Ejecutar la App

```bash
npm start
```

Esto abrirá Expo DevTools en tu navegador. Desde ahí puedes:

1. **En Android**: Escanea el código QR con la app Expo Go
2. **En iOS**: Escanea el código QR con la cámara del iPhone
3. **En Emulador**: Presiona `a` para Android o `i` para iOS

## Scripts Disponibles

- `npm start` - Inicia el servidor de desarrollo
- `npm run android` - Abre directamente en emulador Android
- `npm run ios` - Abre directamente en simulador iOS
- `npm run web` - Abre en navegador web

## Estructura del Proyecto

```
mobile-app/
├── assets/
│   └── flashcards.words.json    # Base de datos embebida (1.3MB)
├── src/
│   ├── components/
│   │   ├── Flashcard.tsx        # Componente de tarjeta
│   │   └── TopicMenu.tsx        # Menú de temas
│   ├── types/
│   │   └── Word.ts              # Tipos TypeScript
│   └── utils/
│       ├── dataService.ts       # Servicio de datos (reemplaza backend)
│       └── translations.ts      # Traducciones ES/EN
├── App.tsx                      # Componente principal
├── index.ts                     # Entry point
└── package.json
```

## Cómo Funciona

La app lee el archivo `flashcards.words.json` directamente desde los assets en tiempo de compilación. No hay llamadas HTTP ni conexión a servidor.

### Modos de Estudio

1. **Modo Normal**
   - Selecciona un tema del menú
   - Navega con botones Anterior/Siguiente
   - Toca la tarjeta para voltearla

2. **Modo Blitz** ⚡
   - Repaso automático de todas las palabras (excepto Gramática)
   - 3 segundos por palabra
   - Puedes pausar/reanudar

3. **Modo Bullet** 🚀
   - Repaso ultra-rápido de todas las palabras
   - 1.5 segundos por palabra
   - Ideal para repaso rápido

4. **Modo Focus** 🎯
   - Marca cada palabra como Correcta/Incorrecta
   - Resumen final con estadísticas
   - Opción de reiniciar o salir

## Tecnologías

- **React Native**: Framework móvil
- **Expo SDK 54**: Herramientas de desarrollo
- **TypeScript**: Tipado estático
- **React Hooks**: Gestión de estado

## Compatibilidad

- ✅ Android 5.0+ (API 21+)
- ✅ iOS 13.0+
- ✅ Expo Go app

## Notas Técnicas

- El archivo JSON pesa 1.3MB y se carga en memoria al iniciar la app
- Todas las operaciones de filtrado y búsqueda se hacen en memoria
- No hay persistencia de progreso (se puede agregar con AsyncStorage)
- La app está optimizada para español como idioma de interfaz

## Próximas Mejoras Posibles

- [ ] Guardar progreso del usuario (AsyncStorage)
- [ ] Modo de práctica con repetición espaciada
- [ ] Estadísticas de aprendizaje
- [ ] Favoritos y listas personalizadas
- [ ] Audio de pronunciación
- [ ] Modo oscuro

## Licencia

Uso personal y educativo.
