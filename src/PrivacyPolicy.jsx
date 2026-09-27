import React, { useState } from 'react';
import { useTranslation } from './i18n/LanguageContext';
import { DEFAULT_AI_ENDPOINT, DEFAULT_AI_MODEL } from './secureConfig';

const PrivacyPolicy = () => {
  const { t } = useTranslation();
  const [section, setSection] = useState('s1');

  const SECTIONS = [
    { key: 's1', icon: '🔒', label: t('privacy.s1tab') },
    { key: 's2', icon: '🧠', label: t('privacy.s2tab') },
    { key: 's3', icon: '🔍', label: t('privacy.s3tab') },
    { key: 's4', icon: '⚠️', label: t('privacy.s4tab') },
  ];

  return (
    <div className="privacy-hud">
      <div className="privacy-hero">
        <div className="privacy-hero-icon">🛡️</div>
        <div className="privacy-hero-text">
          <h2 className="privacy-hero-title">{t('privacy.heroTitle')}</h2>
          <p className="privacy-hero-subtitle">{t('privacy.heroSubtitle')}</p>
          <div className="privacy-badges">
            <span className="privacy-badge privacy-badge-green">🔒 {t('privacy.badgeNoCollect')}</span>
            <span className="privacy-badge privacy-badge-green">🚫 {t('privacy.badgeNoShare')}</span>
            <span className="privacy-badge privacy-badge-gold">💻 {t('privacy.badgeLocal')}</span>
          </div>
        </div>
      </div>

      <div className="privacy-menu">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            className={`privacy-menu-btn ${section === s.key ? 'active' : ''}`}
            onClick={() => setSection(s.key)}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      <div className="privacy-body">
        {section === 's1' && (
          <div className="privacy-card">
            <h3>🔒 {t('privacy.s1title')}</h3>
            <ul className="privacy-list">
              <li>📁 <strong>{t('privacy.s1b1t')}:</strong> {t('privacy.s1b1')}</li>
              <li>🚫 <strong>{t('privacy.s1b2t')}:</strong> {t('privacy.s1b2')}</li>
              <li>🔏 <strong>{t('privacy.s1b3t')}:</strong> {t('privacy.s1b3')}</li>
            </ul>
          </div>
        )}

        {section === 's2' && (
          <div className="privacy-card">
            <h3>🧠 {t('privacy.s2title')}</h3>
            <p>{t('privacy.s2p')}</p>
            <div className="privacy-model-box">
              <div className="privacy-model-row">
                <span className="privacy-model-label">{t('privacy.aiEndpointLabel')}</span>
                <code className="privacy-code">{DEFAULT_AI_ENDPOINT}</code>
              </div>
              <div className="privacy-model-row">
                <span className="privacy-model-label">{t('privacy.aiModelLabel')}</span>
                <code className="privacy-code">{DEFAULT_AI_MODEL}</code>
              </div>
            </div>
            <ul className="privacy-list">
              <li>✍️ <strong>{t('privacy.s2b1t')}:</strong> {t('privacy.s2b1')}</li>
              <li>🔑 <strong>{t('privacy.s2b2t')}:</strong> {t('privacy.s2b2')}</li>
              <li>📜 <strong>{t('privacy.s2b3t')}:</strong> {t('privacy.s2b3')}</li>
            </ul>
          </div>
        )}

        {section === 's3' && (
          <div className="privacy-card">
            <h3>🔍 {t('privacy.s3title')}</h3>
            <p>{t('privacy.s3p')}</p>
            <ul className="privacy-list">
              <li>📖 <strong>{t('privacy.s3b1t')}:</strong> {t('privacy.s3b1')}</li>
              <li>🏭 <strong>{t('privacy.s3b2t')}:</strong> {t('privacy.s3b2')}</li>
              <li>🔢 <strong>{t('privacy.s3b3t')}:</strong> {t('privacy.s3b3')}</li>
            </ul>
            <div className="privacy-note">
              <strong>🔢 SHA-256:</strong> {t('privacy.s3note')}
            </div>
          </div>
        )}

        {section === 's4' && (
          <div className="privacy-card">
            <h3>⚠️ {t('privacy.s4title')}</h3>
            <p>{t('privacy.s4p1')}</p>
            <p>{t('privacy.s4p2')}</p>
            <div className="privacy-note">
              <strong>💡 {t('privacy.noteTitle')}:</strong> {t('privacy.s4note')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
