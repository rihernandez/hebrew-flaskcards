import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';

type Status = 'idle' | 'checking' | 'available' | 'up-to-date' | 'installing';

export default function UpdateChecker() {
  const [status, setStatus] = useState<Status>('idle');
  const [newVersion, setNewVersion] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [showUpdateNotice, setShowUpdateNotice] = useState(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getVersion().then(v => setCurrentVersion(v)).catch(() => {});
    const timer = setTimeout(async () => {
      try {
        const version = await invoke<string | null>('check_for_updates');
        if (version) { setNewVersion(version); setStatus('available'); }
      } catch { /* silencioso */ }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }

    if (status === 'available') {
      setShowUpdateNotice(true);
      noticeTimerRef.current = setTimeout(() => {
        setShowUpdateNotice(false);
        noticeTimerRef.current = null;
      }, 30000);
      return;
    }

    setShowUpdateNotice(false);
  }, [status]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
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
        <button className="update-install-btn" onClick={() => void installUpdate()}>עדכן</button>
        <button
          className="update-dismiss-btn"
          onClick={() => {
            setShowUpdateNotice(false);
            setStatus('idle');
          }}
        >
          ✕
        </button>
        {showUpdateNotice && (
          <div className="update-tooltip" role="tooltip">
            <p className="update-tooltip-text">
              בשל פיתוח אפליקציית המובייל, האפליקציה הזו תמשיך לקבל עדכונים רק עד 30 באפריל 2026.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (status === 'installing') return <span className="update-status-text">⬇️ מתקין...</span>;
  if (status === 'up-to-date') return <span className="update-status-text ok">✓ מעודכן</span>;

  return (
    <>
      <button
        className="update-check-btn"
        onClick={checkUpdate}
        disabled={status === 'checking'}
      >
        {status === 'checking' ? '⏳' : 'עדכון'}
      </button>
      {currentVersion && (
        <span className="app-version">v{currentVersion}</span>
      )}
    </>
  );
}
