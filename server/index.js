// Thin proxy between the browser and n8n.
// Its only job: attach the shared secret server-side so the browser bundle
// never contains it, and forward the three CONTRACT.md endpoints as-is.
// No business logic lives here — see SPEC.md rule 3.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { listDocuments, processDocument, recordReview, isSupported } from './mock.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const {
  N8N_BASE_URL,
  N8N_PROCESS_PATH,
  N8N_DOCUMENTS_PATH,
  N8N_REVIEW_PATH,
  N8N_SECRET,
  REQUEST_TIMEOUT_MS = '90000',
  PORT = '3001',
  API_MODE,
} = process.env;

const timeoutMs = Number(REQUEST_TIMEOUT_MS);

// Without a secret there is nothing to call, so answer from the local mock
// instead of failing. A fresh clone therefore runs with no configuration.
const useMock = API_MODE === 'mock' || !N8N_SECRET || !N8N_BASE_URL;

async function forward(res, url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstream = await fetch(url, {
      ...options,
      headers: { ...options.headers, 'x-api-key': N8N_SECRET },
      signal: controller.signal,
    });
    const body = await upstream.text();

    // n8n answers 404 with "not registered" when a workflow is inactive.
    // For the caller that is a service outage, not a missing document.
    if (upstream.status === 404 && body.includes('not registered')) {
      res.status(503).json({
        status: 'error',
        error_code: 'SERVICE_UNAVAILABLE',
        message: 'The automation workflow is not active.',
      });
      return;
    }

    res.status(upstream.status);
    res.set('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(body);
  } catch (err) {
    if (err.name === 'AbortError') {
      res.status(504).json({
        status: 'error',
        error_code: 'TIMEOUT',
        message: 'The workflow did not respond in time.',
      });
    } else {
      res.status(502).json({
        status: 'error',
        error_code: 'UPSTREAM_UNREACHABLE',
        message: 'Could not reach the automation service.',
      });
    }
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/documents', (req, res) => {
  if (useMock) return res.json(listDocuments());
  forward(res, `${N8N_BASE_URL}${N8N_DOCUMENTS_PATH}`, { method: 'GET' });
});

app.post('/api/process-document', (req, res) => {
  if (useMock) {
    if (!isSupported((req.body || {}).mime_type)) {
      return res.status(400).json({
        status: 'error',
        error_code: 'UNSUPPORTED_FILE_TYPE',
        message: 'Only PDF, DOCX and TXT files can be processed.',
      });
    }
    return res.json(processDocument(req.body || {}));
  }
  forward(res, `${N8N_BASE_URL}${N8N_PROCESS_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
});

app.post('/api/review', (req, res) => {
  if (useMock) {
    const result = recordReview(req.body || {});
    if (!result) {
      return res.status(404).json({
        status: 'error',
        error_code: 'NOT_FOUND',
        message: 'No document with this ID exists in the log.',
      });
    }
    return res.json(result);
  }
  forward(res, `${N8N_BASE_URL}${N8N_REVIEW_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
  console.log(useMock
    ? 'Mode: MOCK (no N8N_SECRET found, serving local sample data)'
    : 'Mode: LIVE (forwarding to n8n)');
});
