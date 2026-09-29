import React, { createContext, useContext, useState, useCallback } from 'react';
import en from './en';
import es from './es';
import pt from './pt';

const DICTIONARIES = { en, es, pt };

export const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português (Brasil)', flag: '🇧🇷' }
];

const STORAGE_KEY = 'npc_maker_pro_language';

function detectDefaultLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && DICTIONARIES[stored]) return stored;

  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('pt')) return 'pt';
  return 'en';
}

function resolvePath(dict, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), dict);
}

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(detectDefaultLanguage);
  const [hasChosenLanguage, setHasChosenLanguage] = useState(() => !!localStorage.getItem(STORAGE_KEY));

  const setLanguage = useCallback((code) => {
    if (!DICTIONARIES[code]) return;
    localStorage.setItem(STORAGE_KEY, code);
    setLanguageState(code);
    setHasChosenLanguage(true);
  }, []);

  const t = useCallback(
    (path, vars) => {
      const dict = DICTIONARIES[language] || DICTIONARIES.en;
      let value = resolvePath(dict, path);
      if (value === undefined) value = resolvePath(DICTIONARIES.en, path);
      if (value === undefined) return path;
      if (!vars || typeof value !== 'string') return value;
      return value.replace(/\{(\w+)\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
      );
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, hasChosenLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation debe usarse dentro de <LanguageProvider>');
  }
  return ctx;
}
