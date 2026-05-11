/**
 * SureShot — Global App Context
 * Provides: isOnline, activeTool, userSession, theme
 * All modules read from this context. Never duplicate this state locally.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDrafts } from '../services/uploader.js';

/* ── Mock User Session ─────────────────────────────────────── */
const MOCK_SESSION = {
  userId: 'USR-0042',
  name: 'Arjun Mehta',
  role: 'Field Auditor',
  avatar: null, // null = use initials
  siteId: 'SITE-MUM-017',
  siteName: 'Andheri West Depot',
};

/* ── Context Creation ──────────────────────────────────────── */
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTool, setActiveTool] = useState(null); // null = on Hub/Home
  const [userSession] = useState(MOCK_SESSION);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sureshot_theme') || 'light';
  });
  const [draftCount, setDraftCount] = useState(0);
  const [apiErrors, setApiErrors] = useState([]);

  /* ── Online/Offline Detection ─────────────────────────────── */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /* ── Draft Count Sync ─────────────────────────────────────── */
  const refreshDraftCount = useCallback(() => {
    setDraftCount(getDrafts().length);
  }, []);

  useEffect(() => {
    refreshDraftCount();
    // Refresh count on storage changes (cross-tab support)
    const onStorage = (e) => {
      if (e.key === 'sureshot_draft_queue') refreshDraftCount();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshDraftCount]);

  /* ── Theme Management ─────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sureshot_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  /* ── Module Tint ──────────────────────────────────────────── */
  useEffect(() => {
    if (activeTool) {
      document.documentElement.setAttribute('data-module', activeTool.id);
    } else {
      document.documentElement.removeAttribute('data-module');
    }
  }, [activeTool]);

  /* ── Global API Error Listener ───────────────────────────── */
  useEffect(() => {
    const onApiError = (e) => {
      const err = { id: Date.now(), ...e.detail };
      setApiErrors(prev => [...prev.slice(-4), err]); // keep last 5
      // Auto-dismiss after 5s
      setTimeout(() => {
        setApiErrors(prev => prev.filter(x => x.id !== err.id));
      }, 5000);
    };
    window.addEventListener('sureshot:api-error', onApiError);
    return () => window.removeEventListener('sureshot:api-error', onApiError);
  }, []);

  const dismissError = useCallback((id) => {
    setApiErrors(prev => prev.filter(x => x.id !== id));
  }, []);

  /* ── Context Value ─────────────────────────────────────────── */
  const value = {
    // State
    isOnline,
    activeTool,
    userSession,
    theme,
    draftCount,
    apiErrors,

    // Actions
    setActiveTool,
    toggleTheme,
    refreshDraftCount,
    dismissError,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────────────── */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

export default AppContext;
