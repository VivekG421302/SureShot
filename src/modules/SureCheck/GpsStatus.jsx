import styles from './GpsStatus.module.css';

export default function GpsStatus({ gps, distance, withinFence, gpsError, gpsLoading, site, onRefresh }) {
  if (gpsLoading) {
    return (
      <div className={`${styles.gpsCard} ${styles.loading}`}>
        <div className={styles.spinner} />
        <div className={styles.info}>
          <span className={styles.label}>Locating you…</span>
          <span className={styles.sub}>Acquiring GPS signal</span>
        </div>
      </div>
    );
  }

  if (gpsError) {
    return (
      <div className={`${styles.gpsCard} ${styles.error}`}>
        <div className={styles.iconWrap}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div className={styles.info}>
          <span className={styles.label}>GPS Error</span>
          <span className={styles.sub}>{gpsError}</span>
        </div>
        <button className={styles.retryBtn} onClick={onRefresh}>Retry</button>
      </div>
    );
  }

  if (!gps) return null;

  return (
    <div className={`${styles.gpsCard} ${withinFence ? styles.within : styles.outside}`}>
      <div className={styles.iconWrap}>
        {withinFence ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="2.5" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <line x1="4.5" y1="4.5" x2="19.5" y2="19.5"/>
          </svg>
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.label}>
          {withinFence ? `Within ${site.name}` : 'Outside Geofence'}
        </span>
        <span className={styles.sub}>
          {distance !== null ? `${distance}m from site` : ''} · {site.radiusMeters}m radius
        </span>
      </div>

      {/* Visual distance indicator */}
      <div className={styles.distBar}>
        <div
          className={styles.distFill}
          style={{
            width: `${Math.min(100, (distance / site.radiusMeters) * 100)}%`,
          }}
        />
      </div>

      <button className={styles.refreshBtn} onClick={onRefresh} aria-label="Refresh GPS">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
    </div>
  );
}
