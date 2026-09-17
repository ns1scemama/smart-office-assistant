// End-to-end check of the three endpoints defined in CONTRACT.md.
// Run against the proxy (npm run smoke) or straight at n8n by passing a base
// URL. Exits non-zero on the first failure so it can gate a submission.
//
//   node scripts/smoke.js                      → http://localhost:3001/api
//   node scripts/smoke.js http://host/api      → any other base

import { readFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3001/api';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function json(path, options = {}) {
  const res = await fetch(BASE + path, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    // some failures answer with an empty body; status still tells the story
  }
  return { status: res.status, body };
}

const REQUIRED_FIELDS = [
  'document_type', 'sender_or_company', 'summary',
  'requested_action', 'deadline', 'urgency', 'department',
];

async function run() {
  console.log(`Smoke test against ${BASE}\n`);

  // 1. The register loads and every row carries the contract's field names.
  const list = await json('/documents');
  record('GET /documents returns 200', list.status === 200, `status ${list.status}`);
  const rows = Array.isArray(list.body) ? list.body : [];
  record('GET /documents returns an array', Array.isArray(list.body), `${rows.length} rows`);
  if (rows.length) {
    const missing = ['document_id', 'file_name', 'urgency', 'status']
      .filter((k) => !(k in rows[0]));
    record('rows carry the contract fields', missing.length === 0,
      missing.length ? 'missing ' + missing.join(', ') : 'ok');
  }

  // 2. An unsupported type must be refused before any processing happens.
  const bad = await json('/process-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: 'photo.png', mime_type: 'image/png', file_base64: 'aGk=',
    }),
  });
  record('unsupported file type is rejected',
    bad.status === 400 || bad.body?.error_code === 'UNSUPPORTED_FILE_TYPE',
    `status ${bad.status}`);

  // 3. A real document round-trips and comes back with all seven fields.
  const sample = readFileSync(
    new URL('../_work/test-documents/3-complaint-no-deadline.txt', import.meta.url));
  const proc = await json('/process-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: 'smoke-test.txt',
      mime_type: 'text/plain',
      file_base64: sample.toString('base64'),
    }),
  });
  record('POST /process-document returns 200', proc.status === 200, `status ${proc.status}`);
  const fields = proc.body?.fields || {};
  const absent = REQUIRED_FIELDS.filter((k) => !(k in fields));
  record('response carries all seven fields', absent.length === 0,
    absent.length ? 'missing ' + absent.join(', ') : 'ok');
  record('urgency is one of Low/Medium/High',
    ['Low', 'Medium', 'High'].includes(fields.urgency), String(fields.urgency));

  // 4. Review updates a real row and 404s on an unknown one.
  const id = proc.body?.document_id;
  if (id) {
    const ok = await json('/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: id, status: 'Reviewed',
        reviewed_by: 'smoke test', review_note: 'automated check',
      }),
    });
    record('POST /review updates a real document', ok.status === 200, `status ${ok.status}`);
  }
  const missingDoc = await json('/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: 'does-not-exist', status: 'Reviewed' }),
  });
  record('POST /review 404s on an unknown id', missingDoc.status === 404,
    `status ${missingDoc.status}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

run().catch((err) => {
  console.error('\nSmoke test could not run:', err.message);
  console.error('Is the server up?  npm run dev');
  process.exit(1);
});
