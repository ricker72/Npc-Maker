import React, { useState } from 'react';
import { useTranslation, LANGUAGES } from './LanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage, t } = useTranslation();
  const [selected, setSelected] = useState(language);

  const confirm = () => setLanguage(selected);

  return (
    <div className="language-selector-overlay">
      <div className="language-selector-card">
        <div className="language-selector-icon">⚔️</div>
        <h1 className="language-selector-title">{t('languageSelector.title')}</h1>
        <p className="language-selector-subtitle">{t('languageSelector.subtitle')}</p>

        <div className="language-options">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`language-option ${selected === lang.code ? 'active' : ''}`}
              onClick={() => setSelected(lang.code)}
            >
              <span className="language-flag">{lang.flag}</span>
              <span className="language-label">{lang.label}</span>
              {selected === lang.code && <span className="language-check">✓</span>}
            </button>
          ))}
        </div>

        <button className="btn btn-gold language-continue-btn" onClick={confirm}>
          {t('languageSelector.continue')}
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;
