/**
 * SureShot — App Shell (Hub)
 * Orchestrates routing, layout, global overlays.
 * Modules plug in via MODULE_REGISTRY in Sidebar.jsx — no changes needed here.
 */

import { useState, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Hub from './components/Hub.jsx';
import styles from './App.module.css';

/* ── Lazy-load modules (code-splitting for free-tier perf) ── */
const SureCheck = lazy(() => import('./modules/SureCheck/SureCheck.jsx'));

/* ── Module Renderer ─────────────────────────────────────────
   To wire up a new module: add a case here matching its id.
   No other file needs changing.
   ─────────────────────────────────────────────────────────── */
function ModuleRenderer({ toolId }) {
  switch (toolId) {
    case 'surecheck': return <SureCheck />;
    default: return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Module "{toolId}" not found.</p>
      </div>
    );
  }
}

/* ── Inner Shell (has access to context) ─────────────────── */
function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { activeTool, setActiveTool, apiErrors, dismissError } = useApp();

  const handleNavigate = (module) => {
    setActiveTool(module);
    setMenuOpen(false);
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.shell}>
      {/* Global Header */}
      <Header
        onMenuToggle={() => setMenuOpen(o => !o)}
        menuOpen={menuOpen}
      />

      {/* Sidebar Nav */}
      <Sidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <main className={styles.main}>
        {/* Module tint overlay */}
        {activeTool && (
          <div className={styles.moduleTintLayer} aria-hidden="true" />
        )}

        <Suspense fallback={<ModuleLoadingSkeleton />}>
          {activeTool ? (
            <ModuleRenderer toolId={activeTool.id} />
          ) : (
            <Hub onNavigate={handleNavigate} />
          )}
        </Suspense>
      </main>

      {/* Global API Error Toasts */}
      {apiErrors.length > 0 && (
        <div className={styles.toastStack} aria-live="polite">
          {apiErrors.map(err => (
            <div key={err.id} className={styles.toast}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className={styles.toastMsg}>{err.message}</span>
              <button
                className={styles.toastClose}
                onClick={() => dismissError(err.id)}
                aria-label="Dismiss"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Loading Skeleton ─────────────────────────────────────── */
function ModuleLoadingSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.skLine} ${styles.skTitle}`} />
      <div className={`${styles.skLine} ${styles.skSub}`} />
      <div className={`${styles.skBlock}`} />
      <div className={`${styles.skLine} ${styles.skMed}`} />
      <div className={`${styles.skLine} ${styles.skShort}`} />
    </div>
  );
}

/* ── Root App ─────────────────────────────────────────────── */
export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
