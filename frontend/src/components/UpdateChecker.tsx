import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Language } from '../i18n/translations';

const i18n = {
  es: { btn: 'Update', checking: '⏳', upToDate: '✓ Al día', install: 'Actualizar', installing: '⬇️ Instalando...' },
  he: { btn: 'עדכון', checking: '⏳', upToDate: '✓ מעודכן', install: 'עדכן', installing: '⬇️ מתקין...' },
};

type Status = 'idle' | 'checking' | 'available' | 'up-to-date' | 'installing' | 'error';

export default function UpdateChecker({ uiLanguage = 'he' }: { uiLanguage?: Language }) {
  const [status, setStatus] = useState<Status>('idle');
  const [newVersion, setNewVersion] = useState('');
  const t = i18n[uiLanguage];

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const version = await invoke<string | null>('check_for_updates');
        if (version) { setNewVersion(version); setStatus('available'); }
      } catch { /* silencioso */ }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const checkUpdate = async () => {
    setStatus('checking');
    try {
      const version = await invoke<string | null>('check_for_updates');
      if (version) { setNewVersion(version); setStatus('available'); }
      else { setStatus('up-to-date'); setTimeout(() => setStatus('idle'), 2500); }
    } catch { setStatus('idle'); }
  };

  const installUpdate = async () => {
    setStatus('installing');
    try { await invoke('install_update'); }
    catch { setStatus('available'); }
  };

  if (status === 'available') {
    return (
      <div className="update-banner">
        <span className="update-new-dot" />
        <span>v{newVersion}</span>
        <button className="update-install-btn" onClick={installUpdate}>{t.install}</button>
        <button className="update-dismiss-btn" onClick={() => setStatus('idle')}>✕</button>
      </div>
    );
  }

  if (status === 'installing') return <span className="update-status-text">{t.installing}</span>;
  if (status === 'up-to-date') return <span className="update-status-text ok">{t.upToDate}</span>;

  return (
    <button
      className="update-check-btn"
      onClick={checkUpdate}
      disabled={status === 'checking'}
      title={t.btn}
    >
      {status === 'checking' ? t.checking : t.btn}
    </button>
  );
}
