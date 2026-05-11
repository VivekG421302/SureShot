/**
 * SureCheck — Camera Hook
 * Manages MediaStream lifecycle, selfie capture, and blob creation.
 * Enforces front-facing camera for anti-spoofing.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
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
    setCameraError(null);
    setCameraLoading(true);

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: {
          facingMode: 'user',   // Front camera enforced (anti-spoofing)
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
    if (!videoRef.current || !isCameraOn) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    // Mirror the image (front camera is mirrored in preview but should be unmirrored in capture)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const ts = Date.now();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        // Revoke previous object URL to prevent memory leaks
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
    return () => {
      stopCamera();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
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
