/**
 * SureCheck — Attendance Module
 * Flow: GPS check → Camera Selfie → Watermark → Upload → Success
 * Offline: Save as Draft to localStorage
 */

import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { uploadCapture } from '../../services/uploader.js';
import { useGpsFence } from './useGpsFence.js';
import { useCamera } from './useCamera.js';
import GpsStatus from './GpsStatus.jsx';
import CameraView from './CameraView.jsx';
import styles from './SureCheck.module.css';

/* ── Flow States ───────────────────────────────────────────── */
const FLOW = {
  // 12. Flow constants: SureCheck moves through these states from idle to result.
  IDLE: 'idle',
  READY: 'ready',
  CAPTURING: 'capturing',
  REVIEWING: 'reviewing',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  DRAFT_SAVED: 'draft_saved',
  ERROR: 'error',
};

export default function SureCheck() {
  // 12A. Global app state supplies online/offline mode, current user/site, and draft count refresh.
  const { isOnline, userSession, refreshDraftCount } = useApp();

  // 12B. Local module state tracks the attendance flow, upload progress, and final result/error.
  const [flow, setFlow] = useState(FLOW.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const {
    // 12C. GPS hook checks current position against the configured site fence.
    gps, distance, withinFence, gpsError, gpsLoading, refreshGps, site,
  } = useGpsFence();

  const {
    // 12D. Camera hook owns MediaStream setup, selfie capture, preview URL, and cleanup.
    videoRef, isCameraOn, cameraError, cameraLoading,
    capturedBlob, capturedUrl, captureTimestamp,
    startCamera, captureSelfie, retake,
  } = useCamera();

  /* ── Derived State ─────────────────────────────────────────── */
  const canPunchIn = (withinFence === true || withinFence === null) && !gpsLoading;
  const hasCaptured = !!capturedBlob;

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleStartCapture = useCallback(() => {
    // 12E. User taps Punch In: move to camera mode and request camera access.
    setFlow(FLOW.CAPTURING);
    startCamera();
  }, [startCamera]);

  const handleCaptureSelfie = useCallback(() => {
    // 12E(i). User taps shutter: capture the image and move to review mode.
    captureSelfie();
    setFlow(FLOW.REVIEWING);
  }, [captureSelfie]);

  const handleRetake = useCallback(() => {
    // 12E(ii). Retake clears the previous capture and starts the camera again.
    retake();
    setFlow(FLOW.CAPTURING);
  }, [retake]);

  const handleSubmit = useCallback(async () => {
    // 12F. Submit starts the upload pipeline: validation, watermark, API upload, or draft save.
    if (!capturedBlob || !captureTimestamp) return;

    setFlow(FLOW.UPLOADING);
    setUploadProgress(0);
    setUploadError(null);

    const result = await uploadCapture({
      imageBlob: capturedBlob,
      captureTimestamp,
      gps,
      endpoint: '/api/attendance/punch-in',
      metadata: {
        module: 'surecheck',
        userId: userSession.userId,
        siteId: userSession.siteId,
        eventType: 'punch_in',
      },
      onProgress: setUploadProgress,
      allowOfflineDraft: true,
    });

    refreshDraftCount();

    if (result.success) {
      // 12F(i). Online success: show confirmation with the local punch-in time.
      setResultData({ punchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) });
      setFlow(FLOW.SUCCESS);
    } else if (result.offline || result.networkError) {
      // 12F(ii). Offline/network failure: show saved-draft result and refresh the global draft badge.
      setResultData({ draftId: result.draftId });
      setFlow(FLOW.DRAFT_SAVED);
    } else {
      // 12F(iii). Validation or processing failure: show an actionable error screen.
      setUploadError(result.error || 'Upload failed. Please try again.');
      setFlow(FLOW.ERROR);
    }
  }, [capturedBlob, captureTimestamp, gps, userSession, refreshDraftCount]);

  const handleReset = useCallback(() => {
    // 12G. Reset returns SureCheck to the initial Punch In screen.
    setFlow(FLOW.IDLE);
    setResultData(null);
    setUploadError(null);
    setUploadProgress(0);
  }, []);

  /* ── Render: Success ───────────────────────────────────────── */
  if (flow === FLOW.SUCCESS) {
    // 12H. Result branch: successful upload has been accepted by the server.
    return (
      <div className={styles.resultScreen}>
        <div className={styles.successIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className={styles.resultTitle}>Punched In!</h2>
        <p className={styles.resultSub}>
          Your attendance has been recorded at{' '}
          <strong>{resultData?.punchedAt}</strong>
        </p>
        <div className={styles.resultMeta}>
          <span>📍 {site.name}</span>
          <span>👤 {userSession.name}</span>
          <span>🆔 {userSession.userId}</span>
        </div>
        <button className={styles.doneBtn} onClick={handleReset}>
          Done
        </button>
      </div>
    );
  }

  /* ── Render: Draft Saved ───────────────────────────────────── */
  if (flow === FLOW.DRAFT_SAVED) {
    // 12I. Result branch: upload could not happen now, but the watermarked capture is saved locally.
    return (
      <div className={styles.resultScreen}>
        <div className={styles.draftIcon}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <h2 className={styles.resultTitle}>Saved as Draft</h2>
        <p className={styles.resultSub}>
          You're offline. Your punch-in has been saved and will sync automatically when you reconnect.
        </p>
        <p className={styles.draftId}>Draft ID: {resultData?.draftId}</p>
        <button className={styles.doneBtn} onClick={handleReset}>
          OK
        </button>
      </div>
    );
  }

  /* ── Render: Error ─────────────────────────────────────────── */
  if (flow === FLOW.ERROR) {
    // 12J. Result branch: show upload/validation failure and let the user restart.
    return (
      <div className={styles.resultScreen}>
        <div className={styles.errorIcon}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 className={styles.resultTitle}>Upload Failed</h2>
        <p className={styles.resultSub}>{uploadError}</p>
        <button className={styles.retryBtn} onClick={handleReset}>
          Try Again
        </button>
      </div>
    );
  }

  /* ── Render: Uploading ─────────────────────────────────────── */
  if (flow === FLOW.UPLOADING) {
    // 12K. Upload branch: progress ring reflects the XMLHttpRequest upload callback.
    return (
      <div className={styles.uploadingScreen}>
        <div className={styles.uploadRing}>
          <svg className={styles.progressRing} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" className={styles.trackCircle} />
            <circle
              cx="50" cy="50" r="42"
              className={styles.fillCircle}
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - uploadProgress / 100)}`}
            />
          </svg>
          <span className={styles.uploadPct}>{uploadProgress}%</span>
        </div>
        <p className={styles.uploadLabel}>Uploading attendance…</p>
        <p className={styles.uploadSub}>Applying watermark and verifying</p>
      </div>
    );
  }

  /* ── Render: Main Flow ─────────────────────────────────────── */
  return (
    // 12L. Main branch: location status, optional camera, and the primary action button.
    <div className={styles.sureCheck}>
      {/* 12L(i). Module header identifies the current tool and offline state. */}
      <div className={styles.moduleHeader}>
        <div className={styles.moduleIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
            <polyline points="16 11 18 13 22 9"/>
          </svg>
        </div>
        <div>
          <h1 className={styles.moduleTitle}>SureCheck</h1>
          <p className={styles.moduleSub}>Field Attendance</p>
        </div>
        {/* 12L(ii). Offline badge warns that submission will become a draft. */}
        {!isOnline && (
          <div className={styles.offlineBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
            </svg>
            Offline
          </div>
        )}
      </div>

      {/* 12L(iii). Live clock makes the attendance moment visible before capture. */}
      <div className={styles.timeDisplay}>
        <LiveClock />
      </div>

      {/* 12L(iv). GPS status tells the user whether they are inside the allowed site radius. */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>Location Check</label>
        <GpsStatus
          gps={gps}
          distance={distance}
          withinFence={withinFence}
          gpsError={gpsError}
          gpsLoading={gpsLoading}
          site={site}
          onRefresh={refreshGps}
        />
        {withinFence === false && (
          <p className={styles.fenceWarning}>
            ⚠️ You are {distance}m from {site.name}. Move within {site.radiusMeters}m to punch in.
          </p>
        )}
      </div>

      {/* 12L(v). Camera appears only while capturing/reviewing or when a photo exists. */}
      {(flow === FLOW.CAPTURING || flow === FLOW.REVIEWING || hasCaptured) && (
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Selfie Verification</label>
          <CameraView
            videoRef={videoRef}
            isCameraOn={isCameraOn}
            cameraError={cameraError}
            cameraLoading={cameraLoading}
            capturedUrl={capturedUrl}
            onStart={startCamera}
            onCapture={handleCaptureSelfie}
            onRetake={handleRetake}
          />
        </div>
      )}

      {/* 12L(vi). Primary CTA changes based on flow: start, instructions, or confirm submit. */}
      <div className={styles.ctaArea}>
        {flow === FLOW.IDLE && (
          <button
            className={`${styles.punchBtn} ${!canPunchIn ? styles.punchBtnDisabled : ''}`}
            onClick={handleStartCapture}
            disabled={!canPunchIn}
          >
            <span className={styles.punchBtnRipple} />
            <span className={styles.punchBtnContent}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Punch In
            </span>
            {!isOnline && (
              <span className={styles.punchBtnSub}>Will save as draft (offline)</span>
            )}
          </button>
        )}

        {flow === FLOW.CAPTURING && (
          <p className={styles.instructionText}>
            Position your face in the frame, then tap the shutter
          </p>
        )}

        {flow === FLOW.REVIEWING && hasCaptured && (
          <button className={styles.submitBtn} onClick={handleSubmit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Confirm &amp; Submit
          </button>
        )}
      </div>

      {/* 12L(vii). Footer repeats user/site identity for the attendance record context. */}
      <div className={styles.infoFooter}>
        <span>👤 {userSession.name}</span>
        <span>·</span>
        <span>🏢 {userSession.siteId}</span>
      </div>
    </div>
  );
}

/* ── Live Clock Sub-Component ──────────────────────────────── */
import { useState as useClockState, useEffect as useClockEffect } from 'react';

function LiveClock() {
  // 12M. LiveClock updates once per second and renders date/time in India locale formatting.
  const [time, setTime] = useClockState(new Date());

  useClockEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className={styles.clockTime}>
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </div>
      <div className={styles.clockDate}>
        {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
