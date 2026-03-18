# Hebrew Flashcards App

Aplicación de flashcards para aprender hebreo con más de 3,700 palabras, frases y conceptos gramaticales.

## 📱 Versiones Disponibles

### Web App (Frontend + Backend)
- **Frontend**: React + TypeScript + Vite
- **Backend**: NestJS + TypeScript
- **Data Source**: Archivo JSON (`flashcards.words.json`)
- **Requiere**: Internet y servidor backend

### Mobile App (React Native) ⭐ NUEVO
- **Framework**: React Native + Expo
- **100% Offline**: No requiere backend ni internet
- **Plataformas**: Android + iOS
- **Datos embebidos**: JSON incluido en la app
- **Ver**: [mobile-app/README.md](mobile-app/README.md)

El backend lee directamente desde el archivo `flashcards.words.json` sin necesidad de base de datos.

## Contenido

- **Sustantivos**: 2,116 palabras
- **Adjetivos**: 309 palabras
- **Verbos**: 234 palabras
- **Raíz**: 210 palabras
- **Slang**: 200 expresiones
- **Adverbios**: 179 palabras
- **Gramática**: 147 conceptos
- **Frases útiles**: 136 frases
- **Pronombres**: 90 palabras
- **Preposiciones y artículos**: 74 palabras
- **Números**: 57 palabras
- **Cardinales**: 20 palabras

**Total**: 3,671 entradas

## Requisitos

### Web App
- Node.js 20+
- npm

### Mobile App
- Node.js 18+
- npm
- Expo Go app en tu dispositivo móvil

## Instalación

### Web App

#### Backend

```bash
cd backend
npm install
npm run start:dev
```

El backend correrá en `http://localhost:3001`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend correrá en `http://localhost:5173`

### Mobile App

```bash
cd mobile-app
npm install
npm start
```

Escanea el código QR con Expo Go en tu dispositivo móvil.

Ver [mobile-app/QUICK_START.md](mobile-app/QUICK_START.md) para instrucciones detalladas.

## Docker (Opcional)

```bash
docker-compose up
```

Esto levantará tanto el backend como el frontend en contenedores.

## Estructura del Proyecto

```
.
├── flashcards.words.json       # Archivo de datos principal (3,671 entradas)
├── backend/                    # Backend NestJS (Web App)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── words/
│   │       ├── words.controller.ts
│   │       ├── words.service.ts
│   │       └── words.module.ts
│   └── package.json
├── frontend/                   # Frontend React (Web App)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── i18n/
│   └── package.json
├── mobile-app/                 # Mobile App React Native ⭐ NUEVO
│   ├── assets/
│   │   └── flashcards.words.json  # Datos embebidos
│   ├── src/
│   │   ├── components/
│   │   ├── types/
│   │   └── utils/
│   ├── App.tsx
│   ├── README.md
│   ├── QUICK_START.md
│   └── package.json
└── docker-compose.yml
```

## API Endpoints

- `GET /api/languages` - Obtiene lista de idiomas disponibles
- `GET /api/topics?language={language}` - Obtiene temas para un idioma
- `GET /api/words?language={language}&topic={topic}` - Obtiene palabras de un tema

## Características

### Web App
- Interfaz multiidioma (Español/English)
- Navegación por temas
- Flashcards interactivas con pronunciación
- Ejemplos de uso en contexto
- Conceptos gramaticales detallados
- Sin necesidad de base de datos

### Mobile App ⭐
- 100% Offline (sin internet ni backend)
- Múltiples modos de estudio:
  - Modo Normal (navegación manual)
  - Modo Blitz ⚡ (repaso automático 3 seg)
  - Modo Bullet 🚀 (repaso rápido 1.5 seg)
  - Modo Focus 🎯 (autoevaluación con estadísticas)
- Soporte RTL para hebreo
- Interfaz bilingüe (ES/EN)
- Compatible con Android e iOS

## Documentación Adicional

- [MOBILE_APP_SUMMARY.md](MOBILE_APP_SUMMARY.md) - Resumen de la app móvil
- [mobile-app/README.md](mobile-app/README.md) - Documentación completa de la app móvil
- [mobile-app/QUICK_START.md](mobile-app/QUICK_START.md) - Guía de inicio rápido
- [mobile-app/BUILD_APK.md](mobile-app/BUILD_APK.md) - Cómo construir APK
- [mobile-app/DEVELOPMENT.md](mobile-app/DEVELOPMENT.md) - Guía de desarrollo
