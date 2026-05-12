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
// 2. Module loading: SureCheck is downloaded only when the user opens it.
const SureCheck = lazy(() => import('./modules/SureCheck/SureCheck.jsx'));

/* ── Module Renderer ─────────────────────────────────────────
   To wire up a new module: add a case here matching its id.
   No other file needs changing.
   ─────────────────────────────────────────────────────────── */
function ModuleRenderer({ toolId }) {
  // 2A. The active module id from context is translated into the actual React component to show.
  switch (toolId) {
    case 'surecheck': return <SureCheck />;
    // 2A(i). If the registry points to a module that is not wired here, show a helpful fallback.
    default:
      return (
        <div className={styles.notFound}>
          <p className={styles.notFoundText}>Module "{toolId}" not found.</p>
        </div>
      );
  }
}

/* ── Inner Shell (has access to context) ─────────────────── */
function Shell() {
  // 3. Shell state: menuOpen is local UI state; activeTool and global app state come from AppContext.
  const [menuOpen, setMenuOpen] = useState(false);
  const { activeTool, setActiveTool, apiErrors, dismissError } = useApp();

  const handleNavigate = (module) => {
    // 3A. Navigation sets the selected module, closes the menu, and resets scroll position.
    setActiveTool(module);
    setMenuOpen(false);
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.shell}>
      {/* 3B. Header displays brand, active module, network state, drafts, theme toggle, and user initials. */}
      <Header
        onMenuToggle={() => setMenuOpen(o => !o)}
        menuOpen={menuOpen}
      />

      {/* 3C. Sidebar owns the module menu and calls handleNavigate when the user selects a tool. */}
      <Sidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* 3D. Main content switches between Hub and the active module. */}
      <main className={styles.main}>
        {/* 3D(i). When inside a module, a tint layer lets CSS theme the background for that module. */}
        {activeTool && (
          <div className={styles.moduleTintLayer} aria-hidden="true" />
        )}

        <Suspense fallback={<ModuleLoadingSkeleton />}>
          {/* 3D(ii). No activeTool means home Hub; otherwise render the selected module. */}
          {activeTool ? (
            <ModuleRenderer toolId={activeTool.id} />
          ) : (
            <Hub onNavigate={handleNavigate} />
          )}
        </Suspense>
      </main>

      {/* 3E. API service broadcasts errors; the shell renders and dismisses them as global toasts. */}
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
  // 4. While lazy-loaded module code is downloading, this placeholder preserves the page shape.
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
  // 5. Root composition: AppProvider makes global state available to Shell and every module under it.
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
