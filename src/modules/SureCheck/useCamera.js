/**
 * SureCheck — Camera Hook
 * Manages MediaStream lifecycle, selfie capture, and blob creation.
 * Enforces front-facing camera for anti-spoofing.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  // 15. Camera hook owns all browser camera state and keeps UI components free of MediaStream details.
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [captureTimestamp, setCaptureTimestamp] = useState(null);

  /* ── Start Camera ─────────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    // 15A. Start camera: clear old errors, request the front camera, and attach the stream to <video>.
    setCameraError(null);
    setCameraLoading(true);

    try {
      // 15A(i). Stop any existing stream before requesting a fresh one.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: {
          facingMode: 'user',   // 15A(ii). Front camera enforced for selfie verification.
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraOn(true);
      setCapturedBlob(null);
      setCapturedUrl(null);
      setCaptureTimestamp(null);
    } catch (err) {
      let message = 'Camera access failed.';
      if (err.name === 'NotAllowedError')  message = 'Camera permission denied. Please allow camera access.';
      if (err.name === 'NotFoundError')    message = 'No camera found on this device.';
      if (err.name === 'NotReadableError') message = 'Camera is already in use by another app.';
      setCameraError(message);
    } finally {
      setCameraLoading(false);
    }
  }, []);

  /* ── Stop Camera ──────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    // 15B. Stop camera: release device tracks and detach the stream from the video element.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  /* ── Capture Selfie ───────────────────────────────────────── */
  const captureSelfie = useCallback(() => {
    // 15C. Capture selfie: draw the current video frame to canvas and convert it to a JPEG blob.
    if (!videoRef.current || !isCameraOn) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    // 15C(i). Mirror correction: preview is mirrored, but saved capture should be natural orientation.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const ts = Date.now();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        // 15C(ii). Revoke previous object URL to prevent memory leaks.
        if (capturedUrl) URL.revokeObjectURL(capturedUrl);

        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedUrl(url);
        setCaptureTimestamp(ts);
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  }, [isCameraOn, capturedUrl, stopCamera]);

  /* ── Retake ────────────────────────────────────────────────── */
  const retake = useCallback(() => {
    // 15D. Retake: clear the last capture and immediately reopen the camera.
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
    }
    setCapturedBlob(null);
    setCaptureTimestamp(null);
    startCamera();
  }, [capturedUrl, startCamera]);

  /* ── Cleanup on unmount ───────────────────────────────────── */
  useEffect(() => {
    // 15E. Cleanup: when SureCheck unmounts, release camera hardware and temporary preview URLs.
    return () => {
      stopCamera();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // 15F. Public camera API used by SureCheck and CameraView.
    videoRef,
    isCameraOn,
    cameraError,
    cameraLoading,
    capturedBlob,
    capturedUrl,
    captureTimestamp,
    startCamera,
    stopCamera,
    captureSelfie,
    retake,
  };
}
