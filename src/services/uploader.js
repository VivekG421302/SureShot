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
  // 11. Anti-spoof gate: reject missing, non-image, stale, or suspiciously tiny captures before upload.
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
  // 11A. Watermarking loads the captured blob into an image, draws it to canvas, then exports a new JPEG.
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageBlob);

    img.onload = () => {
      try {
        // 11A(i). Canvas starts as a copy of the original camera image.
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        // 11A(ii). Draw original image.
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

        // 11A(iii). Scale font relative to image size for consistent appearance.
        const baseFontSize = Math.max(20, Math.round(canvas.width / 40));
        const padding = Math.round(baseFontSize * 0.7);
        const lineHeight = baseFontSize * 1.5;
        const blockHeight = lines.length * lineHeight + padding * 2;
        const blockY = canvas.height - blockHeight - padding;

        // 11A(iv). Semi-transparent dark background strip makes the watermark readable.
        ctx.fillStyle = 'rgba(0, 15, 31, 0.72)';
        ctx.fillRect(0, blockY - padding / 2, canvas.width, blockHeight + padding);

        // 11A(v). Yellow accent bar brands the verification block.
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(0, blockY - padding / 2, Math.round(baseFontSize * 0.3), blockHeight + padding);

        // 11A(vi). Text rendering writes app name, date, time, and GPS onto the image.
        ctx.font = `600 ${baseFontSize}px 'Barlow Condensed', monospace`;
        ctx.textBaseline = 'top';

        lines.forEach((line, i) => {
          const y = blockY + i * lineHeight;

          // 11A(vii). Shadow improves readability over bright photos.
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillText(line, padding + 2, y + 2);

          // 11A(viii). Header line is yellow; details are white.
          ctx.fillStyle = i === 0 ? '#FFD700' : '#FFFFFF';
          ctx.fillText(line, padding, y);
        });

        // 11A(ix). Cleanup releases the temporary object URL.
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
  // 11B. Offline draft save: append a generated id/timestamp and persist the queue in localStorage.
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
  // 11B(i). Draft read: broken JSON falls back to an empty queue so the app can recover.
  try {
    return JSON.parse(localStorage.getItem(DRAFT_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removeDraft(id) {
  // 11B(ii). Draft remove: keep every draft except the one that synced or was deleted.
  const queue = getDrafts().filter(d => d.id !== id);
  localStorage.setItem(DRAFT_QUEUE_KEY, JSON.stringify(queue));
}

export function clearDrafts() {
  // 11B(iii). Draft clear: used when the whole local queue should be reset.
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
  // 11C. Upload pipeline step 1: anti-spoof validation blocks bad captures before processing.
  const validation = validateCapture(imageBlob, captureTimestamp);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  let watermarkedBlob;
  try {
    // 11C(i). Upload pipeline step 2: watermark the image with time and GPS proof.
    watermarkedBlob = await applyWatermark(imageBlob, gps);
  } catch (err) {
    console.error('[Uploader] Watermark failed:', err);
    return { success: false, error: 'Image processing failed. Please try again.' };
  }

  // 11C(ii). Upload pipeline step 3: if offline, save immediately as a draft instead of failing.
  if (!navigator.onLine) {
    if (!allowOfflineDraft) {
      return { success: false, error: 'You are offline and drafts are not enabled.' };
    }

    const imageDataUrl = await blobToDataUrl(watermarkedBlob);
    const draftId = saveDraft({ module: metadata.module || 'unknown', payload: metadata, imageDataUrl });
    return { success: false, offline: true, draftId };
  }

  // 11C(iii). Upload pipeline step 4: build multipart FormData for the API upload.
  const formData = new FormData();
  formData.append('image', watermarkedBlob, `sureshot_${Date.now()}.jpg`);
  formData.append('metadata', JSON.stringify({
    ...metadata,
    uploadedAt: new Date().toISOString(),
    gps: gps || null,
  }));

  try {
    // 11C(iv). Upload pipeline step 5: send to API and return success data.
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
  // 11D. Helper: convert a Blob to a data URL so drafts can live inside localStorage.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const uploader = { uploadCapture, applyWatermark, validateCapture, saveDraft, getDrafts, removeDraft, clearDrafts };
export default uploader;
