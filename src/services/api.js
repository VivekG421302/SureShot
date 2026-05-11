/**
 * SureShot — Centralized API Service
 * Single fetch wrapper for all GET/POST requests with global error handling.
 * All modules MUST use this service. Never call fetch() directly in components.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.sureshot.app';
const DEFAULT_TIMEOUT_MS = 15000;

/* ── Custom Error Class ────────────────────────────────────── */
export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/* ── Timeout Wrapper ───────────────────────────────────────── */
function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new ApiError('Request timed out', 408, null)), ms)
  );
  return Promise.race([promise, timeout]);
}

/* ── Response Parser ───────────────────────────────────────── */
async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

/* ── Global Error Handler ──────────────────────────────────── */
function handleApiError(error, endpoint) {
  // Log to console in dev; in prod, wire this to a monitoring service
  console.error(`[API] Error at ${endpoint}:`, error);

  // Dispatch a global event so any component can react (toast, banner, etc.)
  window.dispatchEvent(new CustomEvent('sureshot:api-error', {
    detail: { message: error.message, status: error.status, endpoint }
  }));

  throw error;
}

/* ── Core Fetch Wrapper ────────────────────────────────────── */
async function request(method, endpoint, { body, headers = {}, signal, timeout } = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-App-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
    ...headers,
  };

  // Attach auth token if available
  const token = sessionStorage.getItem('sureshot_token');
  if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;

  const fetchOptions = {
    method,
    headers: defaultHeaders,
    signal,
  };

  if (body !== undefined && method !== 'GET') {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
    if (body instanceof FormData) delete fetchOptions.headers['Content-Type'];
  }

  try {
    const fetchPromise = fetch(url, fetchOptions);
    const res = await withTimeout(fetchPromise, timeout || DEFAULT_TIMEOUT_MS);

    if (!res.ok) {
      let errorPayload = null;
      try { errorPayload = await parseResponse(res); } catch (_) {}
      const message = errorPayload?.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new ApiError(message, res.status, errorPayload);
    }

    return await parseResponse(res);

  } catch (err) {
    if (err instanceof ApiError) return handleApiError(err, endpoint);
    if (err.name === 'AbortError') throw err; // Don't wrap deliberate cancellations
    return handleApiError(new ApiError(err.message || 'Network error', 0, null), endpoint);
  }
}

/* ── Public API ────────────────────────────────────────────── */
const api = {
  get: (endpoint, options) => request('GET', endpoint, options),
  post: (endpoint, body, options) => request('POST', endpoint, { body, ...options }),
  put: (endpoint, body, options) => request('PUT', endpoint, { body, ...options }),
  patch: (endpoint, body, options) => request('PATCH', endpoint, { body, ...options }),
  delete: (endpoint, options) => request('DELETE', endpoint, options),

  /**
   * Upload a file (multipart/form-data).
   * @param {string} endpoint
   * @param {FormData} formData
   * @param {Function} onProgress - callback(percent: number)
   */
  upload(endpoint, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      const token = sessionStorage.getItem('sureshot_token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (_) { resolve(xhr.responseText); }
        } else {
          const err = new ApiError(`Upload failed: HTTP ${xhr.status}`, xhr.status, null);
          handleApiError(err, endpoint);
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new ApiError('Upload network error', 0, null);
        handleApiError(err, endpoint);
        reject(err);
      };

      xhr.send(formData);
    });
  },
};

export default api;
