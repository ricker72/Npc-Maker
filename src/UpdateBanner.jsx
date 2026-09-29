import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from './i18n/LanguageContext';


const DISMISS_PREFIX = 'npcmaker_update_dismissed_';

const isElectron = () =>
  typeof window !== 'undefined' && !!window.npcUpdates && typeof window.npcUpdates.check === 'function';

const wasDismissed = (version) => {
  try {
    return localStorage.getItem(DISMISS_PREFIX + version) === '1';
  } catch {
    return false;
  }
};

const rememberDismissed = (version) => {
  try {
    localStorage.setItem(DISMISS_PREFIX + version, '1');
  } catch {
  }
};

const UpdateBanner = () => {
  const { t, language } = useTranslation();
  const [status, setStatus] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!isElectron()) return undefined;
    window.npcUpdates
      .check()
      .then((res) => {
        if (alive && res && res.ok && res.updateAvailable && res.latest) {
          if (!wasDismissed(res.latest.version)) {
            setStatus(res);
            setShowDialog(true);
          }
        }
      })
      .catch(() => {
      });
    return () => { alive = false; };
  }, []);

  const openRelease = useCallback(async () => {
    if (!status || !status.latest || opening) return;
    setOpening(true);
    try {
      await window.npcUpdates.openReleasePage(status.latest.url);
    } catch {
    } finally {
      setOpening(false);
    }
  }, [status, opening]);

  const dismissSession = useCallback(() => setDismissed(true), []);

  const dismissForever = useCallback(() => {
    if (status && status.latest) rememberDismissed(status.latest.version);
    setShowDialog(false);
    setDismissed(true);
  }, [status]);

  useEffect(() => {
    if (!showDialog) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowDialog(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDialog]);

  if (!status || dismissed) return null;
  const { currentVersion, latest } = status;
  const locale = language === 'pt' ? 'pt-BR' : language === 'en' ? 'en-US' : 'es-ES';
  const publishedDate = latest.publishedAt
    ? new Date(latest.publishedAt).toLocaleDateString(locale)
    : '';

  const acceptDownload = async () => {
    setShowDialog(false);
    await openRelease();
  };

  return (
    <>
      {}
      {showDialog && (
        <div
          className="update-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-dialog-title"
          onClick={() => setShowDialog(false)}
        >
          <div
            className="update-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="update-dialog-icon">🚀</div>
            <h2 id="update-dialog-title" className="update-dialog-title">
              {t('update.dialogTitle')}
            </h2>
            <p className="update-dialog-message">{t('update.dialogMessage')}</p>
            <div className="update-dialog-versions">
              <span>
                {t('update.dialogInstalled')}: <strong>v{currentVersion}</strong>
              </span>
              <span className="update-dialog-arrow">→</span>
              <span>
                {t('update.dialogAvailable')}:{' '}
                <strong className="update-version">v{latest.version}</strong>
                {latest.prerelease && (
                  <span className="update-prerelease-tag">{t('update.prerelease')}</span>
                )}
              </span>
            </div>
            {latest.name && (
              <p className="update-dialog-release-name">{latest.name}</p>
            )}
            <div className="update-dialog-actions">
              <button className="btn btn-gold-sm" onClick={acceptDownload} disabled={opening} autoFocus>
                ⬇️ {t('update.dialogYes')}
              </button>
              <button className="btn-outline-sm" onClick={() => setShowDialog(false)}>
                🕐 {t('update.dialogLater')}
              </button>
              <button className="btn-ghost-sm" onClick={dismissForever}>
                🚫 {t('update.dialogDontAsk')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="update-banner" role="status" aria-live="polite">
      <div className="update-banner-main">
        <span className="update-banner-icon">🚀</span>
        <div className="update-banner-text">
          <strong>
            {t('update.title')} <span className="update-version">v{latest.version}</span>
            {latest.prerelease && (
              <span className="update-prerelease-tag">{t('update.prerelease')}</span>
            )}
          </strong>
          <span className="update-banner-sub">
            {t('update.current')} v{currentVersion} → v{latest.version}
            {latest.name ? ` · ${latest.name}` : ''}
          </span>
        </div>
        <div className="update-banner-actions">
          <button className="btn btn-gold-sm" onClick={openRelease} disabled={opening}>
            ⬇️ {t('update.download')}
          </button>
          <button className="btn btn-outline-sm" onClick={() => setShowNotes((v) => !v)}>
            📝 {t('update.releaseNotes')}
          </button>
          <button className="btn btn-ghost-sm" onClick={dismissSession} title={t('update.laterHint')}>
            🕐 {t('update.later')}
          </button>
          <button
            className="btn btn-ghost-sm"
            onClick={dismissForever}
            title={t('update.neverHint')}
          >
            🚫 {t('update.never')}
          </button>
        </div>
      </div>
      {showNotes && (
        <div className="update-banner-notes">
          <div className="update-notes-header">
            <span>📖 {t('update.notesFrom')} {latest.publishedAt ? new Date(latest.publishedAt).toLocaleDateString() : ''}</span>
            <a
              className="update-notes-link"
              href="#release"
              onClick={(e) => { e.preventDefault(); openRelease(); }}
            >
              {t('update.openFullNotes')} →
            </a>
          </div>
          <pre className="update-notes-body">{latest.bodyPreview || t('update.noNotes')}</pre>
          {latest.assets && latest.assets.length > 0 && (
            <ul className="update-assets-list">
              {latest.assets.map((a) => (
                <li key={a.name}>📦 {a.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      </div>
    </>
  );
};

export default UpdateBanner;
