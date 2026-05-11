import { useApp } from '../context/AppContext.jsx';
import styles from './Sidebar.module.css';

/* ── Module Registry ───────────────────────────────────────── */
// To add a new module: push one entry here. That's it.
export const MODULE_REGISTRY = [
  {
    id: 'surecheck',
    name: 'SureCheck',
    tagline: 'Attendance',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        <polyline points="16 11 18 13 22 9"/>
      </svg>
    ),
    accentColor: '#00B4A0',
    available: true,
  },
  {
    id: 'surestock',
    name: 'SureStock',
    tagline: 'Inventory',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    accentColor: '#FF8C00',
    available: false,
  },
  {
    id: 'sureaudit',
    name: 'SureAudit',
    tagline: 'Site Audit',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    accentColor: '#7C3AED',
    available: false,
  },
];

export default function Sidebar({ isOpen, onClose, onNavigate }) {
  const { activeTool, userSession, isOnline } = useApp();

  const handleSelect = (module) => {
    if (!module.available) return;
    onNavigate(module);
    onClose();
  };

  const handleHome = () => {
    onNavigate(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <nav
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}
        aria-label="Main navigation"
      >
        {/* User Card */}
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>
            {userSession.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{userSession.name}</p>
            <p className={styles.userMeta}>{userSession.siteName}</p>
          </div>
          <div className={`${styles.onlineDot} ${isOnline ? styles.dotOnline : styles.dotOffline}`} />
        </div>

        {/* Navigation */}
        <div className={styles.nav}>
          {/* Hub / Home */}
          <button
            className={`${styles.navItem} ${activeTool === null ? styles.navItemActive : ''}`}
            onClick={handleHome}
          >
            <span className={styles.navIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <span className={styles.navLabel}>Hub</span>
            <span className={styles.navSub}>Dashboard</span>
          </button>

          {/* Divider */}
          <div className={styles.divider}>
            <span>Modules</span>
          </div>

          {/* Module Items */}
          {MODULE_REGISTRY.map(module => (
            <button
              key={module.id}
              className={`
                ${styles.navItem}
                ${activeTool?.id === module.id ? styles.navItemActive : ''}
                ${!module.available ? styles.navItemDisabled : ''}
              `}
              onClick={() => handleSelect(module)}
              disabled={!module.available}
              style={module.available ? { '--item-accent': module.accentColor } : {}}
              title={!module.available ? 'Coming soon' : ''}
            >
              <span className={styles.navIcon}>{module.icon}</span>
              <div className={styles.navLabelGroup}>
                <span className={styles.navLabel}>{module.name}</span>
                <span className={styles.navSub}>{module.tagline}</span>
              </div>
              {!module.available && (
                <span className={styles.comingSoon}>Soon</span>
              )}
              {activeTool?.id === module.id && (
                <span className={styles.activeIndicator} />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <span className={styles.version}>SureShot v1.0.0</span>
          <span className={styles.footerDot}>·</span>
          <span className={styles.version}>Field Edition</span>
        </div>
      </nav>
    </>
  );
}
