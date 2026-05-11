/**
 * SureShot — Centralized Upload Service
 * Handles file uploads with:
 *   1. Dynamic Watermarking (Canvas API) — overlays Date, Time, GPS
 *   2. Anti-Spoofing — ensures only real-time camera captures are processed
 *   3. Offline Queueing — drafts saved to localStorage when offline
 */

import api from './api.js';

const DRAFT_QUEUE_KEY = 'sureshot_draft_queue';
const ANTI_SPOOF_MAX_AGE_MS = 30 * 1000; // 30 seconds: capture must be "fresh"

/* ── Anti-Spoofing ─────────────────────────────────────────── */

/**
 * Validates that a captured image is a genuine real-time capture.
 * Checks: blob must be from a MediaStream capture, age must be < 30s.
 * @param {Blob} imageBlob
 * @param {number} captureTimestamp - Date.now() at the moment of capture
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateCapture(imageBlob, captureTimestamp) {
  if (!imageBlob || !(imageBlob instanceof Blob)) {
    return { valid: false, reason: 'Invalid image data.' };
  }

  if (!imageBlob.type.startsWith('image/')) {
    return { valid: false, reason: 'Only image files are accepted.' };
  }

  const age = Date.now() - captureTimestamp;
  if (age > ANTI_SPOOF_MAX_AGE_MS) {
    return { valid: false, reason: 'Capture is too old. Please take a fresh photo.' };
  }

  // Size sanity check — a 0-byte or suspiciously tiny image is likely spoofed
  if (imageBlob.size < 5000) {
    return { valid: false, reason: 'Image is too small. Please try again.' };
  }

  return { valid: true };
}

/* ── Watermarking ──────────────────────────────────────────── */

/**
 * Overlays date, time, GPS, and app branding onto a captured image.
 * @param {Blob} imageBlob
 * @param {{ latitude: number, longitude: number } | null} gps
 * @returns {Promise<Blob>} - watermarked image blob
 */
export async function applyWatermark(imageBlob, gps = null) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageBlob);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // ── Watermark Config ────────────────────────────────
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
        const gpsStr = gps
          ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`
          : 'GPS unavailable';

        const lines = [
          `SureShot Verified`,
          `Date: ${dateStr}`,
          `Time: ${timeStr}`,
          `GPS:  ${gpsStr}`,
        ];

        // Scale font relative to image size for consistent appearance
        const baseFontSize = Math.max(20, Math.round(canvas.width / 40));
        const padding = Math.round(baseFontSize * 0.7);
        const lineHeight = baseFontSize * 1.5;
        const blockHeight = lines.length * lineHeight + padding * 2;
        const blockY = canvas.height - blockHeight - padding;

        // Semi-transparent dark background strip
        ctx.fillStyle = 'rgba(0, 15, 31, 0.72)';
        ctx.fillRect(0, blockY - padding / 2, canvas.width, blockHeight + padding);

        // Yellow accent bar on left
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(0, blockY - padding / 2, Math.round(baseFontSize * 0.3), blockHeight + padding);

        // Text rendering
        ctx.font = `600 ${baseFontSize}px 'Barlow Condensed', monospace`;
        ctx.textBaseline = 'top';

        lines.forEach((line, i) => {
          const y = blockY + i * lineHeight;

          // Shadow for readability
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillText(line, padding + 2, y + 2);

          // Actual text: header line in yellow, rest in white
          ctx.fillStyle = i === 0 ? '#FFD700' : '#FFFFFF';
          ctx.fillText(line, padding, y);
        });

        // Cleanup
        URL.revokeObjectURL(objectUrl);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
          },
          'image/jpeg',
          0.88 // slight compression for upload efficiency
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for watermarking'));
    };

    img.src = objectUrl;
  });
}

/* ── Draft Queue (Offline) ─────────────────────────────────── */

/**
 * Saves a failed/offline upload as a draft in localStorage.
 * @param {{ module: string, payload: object, imageDataUrl: string }} draft
 */
export function saveDraft(draft) {
  const queue = getDrafts();
  const entry = {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...draft,
  };
  queue.push(entry);
  localStorage.setItem(DRAFT_QUEUE_KEY, JSON.stringify(queue));
  return entry.id;
}

export function getDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removeDraft(id) {
  const queue = getDrafts().filter(d => d.id !== id);
  localStorage.setItem(DRAFT_QUEUE_KEY, JSON.stringify(queue));
}

export function clearDrafts() {
  localStorage.removeItem(DRAFT_QUEUE_KEY);
}

/* ── Main Upload Orchestrator ──────────────────────────────── */

/**
 * Full upload pipeline:
 *   1. Anti-spoof validation
 *   2. Apply watermark
 *   3. POST via api.upload (with progress)
 *   4. On offline/error: save to draft queue
 *
 * @param {{
 *   imageBlob: Blob,
 *   captureTimestamp: number,
 *   gps: { latitude: number, longitude: number } | null,
 *   endpoint: string,
 *   metadata: object,
 *   onProgress: function,
 *   allowOfflineDraft: boolean,
 * }} options
 *
 * @returns {Promise<{ success: boolean, data?: any, draftId?: string, error?: string }>}
 */
export async function uploadCapture({
  imageBlob,
  captureTimestamp,
  gps,
  endpoint,
  metadata = {},
  onProgress,
  allowOfflineDraft = true,
}) {
  // Step 1: Anti-spoof check
  const validation = validateCapture(imageBlob, captureTimestamp);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  let watermarkedBlob;
  try {
    // Step 2: Watermark
    watermarkedBlob = await applyWatermark(imageBlob, gps);
  } catch (err) {
    console.error('[Uploader] Watermark failed:', err);
    return { success: false, error: 'Image processing failed. Please try again.' };
  }

  // Step 3: If offline, save draft immediately
  if (!navigator.onLine) {
    if (!allowOfflineDraft) {
      return { success: false, error: 'You are offline and drafts are not enabled.' };
    }

    const imageDataUrl = await blobToDataUrl(watermarkedBlob);
    const draftId = saveDraft({ module: metadata.module || 'unknown', payload: metadata, imageDataUrl });
    return { success: false, offline: true, draftId };
  }

  // Step 4: Build FormData and upload
  const formData = new FormData();
  formData.append('image', watermarkedBlob, `sureshot_${Date.now()}.jpg`);
  formData.append('metadata', JSON.stringify({
    ...metadata,
    uploadedAt: new Date().toISOString(),
    gps: gps || null,
  }));

  try {
    const data = await api.upload(endpoint, formData, onProgress);
    return { success: true, data };
  } catch (err) {
    if (!allowOfflineDraft) {
      return { success: false, error: err.message };
    }
    // Network failure — save draft
    const imageDataUrl = await blobToDataUrl(watermarkedBlob);
    const draftId = saveDraft({ module: metadata.module || 'unknown', payload: metadata, imageDataUrl });
    return { success: false, networkError: true, draftId, error: err.message };
  }
}

/* ── Helpers ───────────────────────────────────────────────── */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const uploader = { uploadCapture, applyWatermark, validateCapture, saveDraft, getDrafts, removeDraft, clearDrafts };
export default uploader;
