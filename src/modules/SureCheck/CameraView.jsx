import styles from './CameraView.module.css';

export default function CameraView({
  videoRef,
  isCameraOn,
  cameraError,
  cameraLoading,
  capturedUrl,
  onStart,
  onCapture,
  onRetake,
}) {
  /* ── Idle State ────────────────────────────────────────────── */
  if (!isCameraOn && !capturedUrl) {
    return (
      <div className={styles.cameraBox}>
        <div className={styles.idleFrame}>
          <div className={styles.idleIcon}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          {cameraError ? (
            <div className={styles.cameraError}>
              <p className={styles.errorText}>{cameraError}</p>
              <button className={styles.startBtn} onClick={onStart}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <p className={styles.idleText}>Camera is off</p>
              <p className={styles.idleSub}>Enable camera to capture your selfie</p>
              {cameraLoading ? (
                <div className={styles.loadingRow}>
                  <div className={styles.spinner} />
                  <span>Starting camera…</span>
                </div>
              ) : (
                <button className={styles.startBtn} onClick={onStart} disabled={cameraLoading}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Open Camera
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Captured State ────────────────────────────────────────── */
  if (capturedUrl) {
    return (
      <div className={styles.cameraBox}>
        <div className={styles.capturedFrame}>
          <img src={capturedUrl} alt="Captured selfie" className={styles.capturedImg} />
          <div className={styles.capturedBadge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Photo Taken
          </div>
        </div>
        <button className={styles.retakeBtn} onClick={onRetake}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
          </svg>
          Retake
        </button>
      </div>
    );
  }

  /* ── Live Camera ───────────────────────────────────────────── */
  return (
    <div className={styles.cameraBox}>
      <div className={styles.liveFrame}>
        {/* Corner guides */}
        <div className={`${styles.corner} ${styles.tl}`} />
        <div className={`${styles.corner} ${styles.tr}`} />
        <div className={`${styles.corner} ${styles.bl}`} />
        <div className={`${styles.corner} ${styles.br}`} />

        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          playsInline
          muted
        />
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} />
          LIVE
        </div>
      </div>

      <button className={styles.captureBtn} onClick={onCapture}>
        <span className={styles.captureRing} />
        <span className={styles.captureCore} />
      </button>
      <p className={styles.captureHint}>Tap the shutter to capture</p>
    </div>
  );
}
