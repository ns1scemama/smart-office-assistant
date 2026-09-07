// Every HTTP call the application makes lives here.
// A build-time flag switches between the mock layer (CONTRACT.md example
// data) and the real proxy server. See SPEC.md "Development order".

import { mockGetDocuments, mockProcessDocument, mockReview } from './mock.js';

// Defaults to mock unless explicitly turned off, so the app is always safe
// to run without a configured .env (see SPEC.md "Development order").
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const TIMEOUT_MS = 90000;

class ApiError extends Error {
  constructor(errorCode, message) {
    super(message);
    this.errorCode = errorCode;
  }
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function requestJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: timeoutSignal(TIMEOUT_MS) });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'הבקשה ארכה זמן רב מדי. נסה שוב.');
    }
    throw new ApiError('UPSTREAM_UNREACHABLE', 'לא ניתן להתחבר למערכת האוטומציה כרגע.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // empty or non-JSON body — handled by status check below
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiError('UNAUTHORIZED', 'בעיית הגדרות מערכת: מפתח הגישה שגוי או חסר. פנה למנהל המערכת.');
    }
    if (response.status === 503 || body?.error_code === 'SERVICE_UNAVAILABLE') {
      throw new ApiError('SERVICE_UNAVAILABLE', 'שירות האוטומציה אינו פעיל כרגע. נסה שוב בעוד רגע או פנה למנהל המערכת.');
    }
    if (response.status === 404) {
      throw new ApiError('NOT_FOUND', 'המסמך לא נמצא ביומן. ייתכן שהשורה נמחקה.');
    }
    const code = body?.error_code || `HTTP_${response.status}`;
    const message = body?.message || 'אירעה שגיאה בעיבוד הבקשה. אפשר לנסות שוב.';
    throw new ApiError(code, message);
  }

  return body;
}

export async function getDocuments() {
  if (USE_MOCK) return mockGetDocuments();
  return requestJson('/api/documents', { method: 'GET' });
}

export async function processDocument({ file_name, mime_type, file_base64, submitted_by }) {
  if (USE_MOCK) return mockProcessDocument({ file_name });
  return requestJson('/api/process-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_name, mime_type, file_base64, submitted_by }),
  });
}

export async function submitReview({ document_id, status, reviewed_by, review_note }) {
  if (USE_MOCK) return mockReview({ document_id });
  return requestJson('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id, status, reviewed_by, review_note }),
  });
}

export { ApiError };
