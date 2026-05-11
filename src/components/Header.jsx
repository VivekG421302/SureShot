import { useApp } from '../context/AppContext.jsx';
import styles from './Header.module.css';

export default function Header({ onMenuToggle, menuOpen }) {
  const { activeTool, isOnline, theme, toggleTheme, draftCount, userSession } = useApp();

  const initials = userSession.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`} />
        </button>

        <div className={styles.brand}>
          <span className={styles.logoMark}>S</span>
          <div className={styles.logoText}>
            <span className={styles.logoMain}>SureShot</span>
            {activeTool && (
              <>
                <span className={styles.logoDivider}>›</span>
                <span className={styles.logoTool}>{activeTool.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        {/* Online Status Pill */}
        <div className={`${styles.statusPill} ${isOnline ? styles.online : styles.offline}`}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Draft Badge */}
        {draftCount > 0 && (
          <div className={styles.draftBadge} title={`${draftCount} pending draft(s)`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>{draftCount}</span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          className={styles.themeBtn}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>

        {/* User Avatar */}
        <div className={styles.avatar} title={`${userSession.name} — ${userSession.role}`}>
          {initials}
        </div>
      </div>
    </header>
  );
}
