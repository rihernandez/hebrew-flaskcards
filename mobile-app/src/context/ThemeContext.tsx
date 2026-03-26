import React, { createContext, useContext, useState, useEffect } from 'react';
import { stateApi } from '../utils/stateApi';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  colors: typeof lightColors;
}

export const lightColors = {
  bg: '#f0f4ff',
  surface: '#ffffff',
  surface2: '#f5f5f5',
  text: '#333333',
  text2: '#666666',
  primary: '#667eea',
  cardFront: '#ffffff',
  cardBack: '#667eea',
  border: '#e0e7ff',
  header: '#ffffff',
  controlBg: '#ffffff',
};

export const darkColors = {
  bg: '#0f0f1a',
  surface: '#1e1e2e',
  surface2: '#2a2a3e',
  text: '#e0e0e0',
  text2: '#aaaaaa',
  primary: '#a78bfa',
  cardFront: '#1e1e2e',
  cardBack: '#4c1d95',
  border: '#3a3a5c',
  header: '#1e1e2e',
  controlBg: '#1e1e2e',
};

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    stateApi.get<boolean>('preferences', 'darkMode', false).then(setDarkMode);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      stateApi.set('preferences', 'darkMode', next).catch(() => {});
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, colors: darkMode ? darkColors : lightColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
