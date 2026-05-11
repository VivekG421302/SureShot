import { useApp } from '../context/AppContext.jsx';
import { MODULE_REGISTRY } from './Sidebar.jsx';
import styles from './Hub.module.css';

export default function Hub({ onNavigate }) {
  const { userSession, isOnline, draftCount } = useApp();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className={styles.hub}>
      {/* Welcome Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.userName}>{userSession.name}</h1>
          <p className={styles.siteName}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {userSession.siteName}
          </p>
        </div>
        <div className={styles.bannerDecor} aria-hidden="true">
          <span className={styles.decorS}>S</span>
        </div>
      </div>

      {/* Status Strip */}
      <div className={styles.statusStrip}>
        <div className={`${styles.statusCard} ${isOnline ? styles.cardOnline : styles.cardOffline}`}>
          <div className={styles.statusDot} />
          <span>{isOnline ? 'Connected' : 'Offline Mode'}</span>
        </div>
        {draftCount > 0 && (
          <div className={`${styles.statusCard} ${styles.cardDraft}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>{draftCount} Draft{draftCount !== 1 ? 's' : ''} Pending</span>
          </div>
        )}
        <div className={styles.statusCard}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Module Grid */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your Tools</h2>
        <div className={styles.moduleGrid}>
          {MODULE_REGISTRY.map((mod, i) => (
            <button
              key={mod.id}
              className={`${styles.moduleCard} ${!mod.available ? styles.moduleCardDisabled : ''}`}
              onClick={() => mod.available && onNavigate(mod)}
              style={{
                '--mod-accent': mod.accentColor,
                '--mod-delay': `${i * 60}ms`,
              }}
              disabled={!mod.available}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} style={{ color: mod.accentColor }}>
                  {mod.icon}
                </div>
                {!mod.available && <span className={styles.comingTag}>Soon</span>}
                {mod.available && (
                  <svg className={styles.arrowIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                )}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{mod.name}</h3>
                <p className={styles.cardTagline}>{mod.tagline}</p>
              </div>
              <div className={styles.cardAccentBar} style={{ background: mod.accentColor }} />
            </button>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Today at a Glance</h2>
        <div className={styles.statsGrid}>
          {[
            { label: 'Punched In', value: '—', icon: '✓' },
            { label: 'Audits Done', value: '0', icon: '#' },
            { label: 'Items Scanned', value: '0', icon: '◈' },
          ].map(stat => (
            <div key={stat.label} className={styles.statCard}>
              <span className={styles.statIcon}>{stat.icon}</span>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
