/**
 * SureShot — Global App Context
 * Provides: isOnline, activeTool, userSession, theme
 * All modules read from this context. Never duplicate this state locally.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDrafts } from '../services/uploader.js';

/* ── Mock User Session ─────────────────────────────────────── */
// 6. Mock session: until real auth exists, the whole app reads this user/site identity.
const MOCK_SESSION = {
  userId: 'USR-0042',
  name: 'Arjun Mehta',
  role: 'Field Auditor',
  avatar: null, // null = use initials
  siteId: 'SITE-MUM-017',
  siteName: 'Andheri West Depot',
};

/* ── Context Creation ──────────────────────────────────────── */
// 6A. Context object: starts empty and gets its value from AppProvider below.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  // 6B. Global state: these values are shared by Header, Sidebar, Hub, and modules.
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
    // 6C. Network tracking: browser events keep isOnline accurate for offline draft behavior.
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
    // 6D. Draft count: uploader stores drafts in localStorage; the header and hub show the count.
    setDraftCount(getDrafts().length);
  }, []);

  useEffect(() => {
    // 6D(i). Initial sync plus cross-tab sync when localStorage changes elsewhere.
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
    // 6E. Theme persistence: CSS reads data-theme and localStorage remembers the user's choice.
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sureshot_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    // 6E(i). Header calls this to switch between light and dark.
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  /* ── Module Tint ──────────────────────────────────────────── */
  useEffect(() => {
    // 6F. Module theme hook: CSS can tint the shell based on the selected module id.
    if (activeTool) {
      document.documentElement.setAttribute('data-module', activeTool.id);
    } else {
      document.documentElement.removeAttribute('data-module');
    }
  }, [activeTool]);

  /* ── Global API Error Listener ───────────────────────────── */
  useEffect(() => {
    // 6G. API errors arrive as window events from services/api.js and are converted into toast state.
    const onApiError = (e) => {
      const err = { id: Date.now(), ...e.detail };
      setApiErrors(prev => [...prev.slice(-4), err]); // keep last 5
      // 6G(i). Toasts disappear automatically unless the user dismisses them first.
      setTimeout(() => {
        setApiErrors(prev => prev.filter(x => x.id !== err.id));
      }, 5000);
    };
    window.addEventListener('sureshot:api-error', onApiError);
    return () => window.removeEventListener('sureshot:api-error', onApiError);
  }, []);

  const dismissError = useCallback((id) => {
    // 6G(ii). Header/shell close buttons call this to remove one toast.
    setApiErrors(prev => prev.filter(x => x.id !== id));
  }, []);

  /* ── Context Value ─────────────────────────────────────────── */
  const value = {
    // 6H. State exposed to consumers.
    isOnline,
    activeTool,
    userSession,
    theme,
    draftCount,
    apiErrors,

    // 6H(i). Actions exposed to consumers.
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
  // 6I. Consumer hook: throws early if a component tries to read context outside AppProvider.
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

export default AppContext;
