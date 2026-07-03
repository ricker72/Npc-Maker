import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, LANGUAGES } from './LanguageContext';

const LanguageSwitcher = () => {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div className="language-switcher" ref={ref}>
      <button className="language-switcher-btn" onClick={() => setOpen((o) => !o)}>
        <span>{current.flag}</span>
        <span className="language-switcher-code">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="language-switcher-dropdown">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`language-switcher-item ${language === lang.code ? 'active' : ''}`}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
