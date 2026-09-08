# SPEC.md: Smart Office Document Assistant, Application Layer

## What this application is

A thin interface in front of an n8n automation. The automation (built in
Part 1, exposed as an API in Part 2) owns every piece of business logic:
reading documents, calling the AI model, deciding urgency, writing the log,
and sending email. This application does none of that. It collects input,
calls one of three n8n webhooks, and displays exactly what comes back.

See `CONTRACT.md` for the exact request/response shape of every endpoint.
Never invent a field name. Check that file.

## Rules that must never be broken

1. No AI model call anywhere in application code.
2. No direct write to Google Sheets, Gmail, or Google Drive from the app.
3. No urgency/classification logic in the app. The app only displays what n8n returns.
4. No secret and no webhook URL in browser-shipped code. All calls to n8n go
   through the thin server in `server/`, which attaches the `x-api-key`
   header server-side.
5. `document_type`, `urgency`, `department` values are displayed exactly as
   received, never translated, renamed, or mapped to new categories.
6. "Not found" / "No action found" are shown as visible text, never as an
   empty field and never replaced with an invented value.

## Stack

- **Frontend:** React + Vite
- **Server:** Express (thin proxy that attaches the secret header and nothing else)
- **State:** No client-side database. `GET /documents` (via n8n → Google
  Sheets) is the single source of truth for the dashboard.

## The one command that runs it

```
npm install
npm run dev        # starts the Express server + Vite dev server together
```

## Three endpoints (proxied by server/index.js)

| App calls | Server forwards to | Method |
|---|---|---|
| `/api/documents` | `${N8N_BASE_URL}${N8N_DOCUMENTS_PATH}` | GET |
| `/api/process-document` | `${N8N_BASE_URL}${N8N_PROCESS_PATH}` | POST |
| `/api/review` | `${N8N_BASE_URL}${N8N_REVIEW_PATH}` | POST |

Env vars: see `.env.example`.

## Eight required features, in build order

1. **F1 Upload screen**: drag/pick one PDF/DOCX/TXT file, show name+size,
   reject unsupported type or oversized file *before* sending.
2. **F2 Processing state**: unmistakable in-progress state, Send disabled
   while waiting, survives up to `REQUEST_TIMEOUT_MS`.
3. **F3 Result view**: all seven extracted fields + file link + a colored
   urgency badge (label + color, not color alone). "Not found" shown as text.
4. **F4 Dashboard**: `GET /documents`, newest first, manual Refresh, handles
   20+ rows without breaking layout.
5. **F5 Search & filters**: free-text over file name/sender/summary, plus
   filters for urgency/document_type/department/status. Combinable. Clear
   "no results" state.
6. **F6 Detail view + human review**: open one document, show every field,
   "Mark as reviewed" with optional note (≤200 chars) → `POST /review`.
7. **F7 Error & empty states**: every failure becomes a sentence a
   non-technical office employee can act on. Covers timeout, 4xx/5xx,
   unreachable n8n, empty log.
8. **F8 Config & secrets**: all URLs/secret read from env vars via the
   server. `.env.example` committed with placeholders, real `.env`
   git-ignored.

## Development order (mock first)

1. Build `src/api/mock.js` returning the exact example JSON from
   `CONTRACT.md`. `src/api/client.js` is the only place HTTP calls live,
   and a flag (`VITE_USE_MOCK`) switches it between mock and real.
2. Build all three screens against mock data only. No network call to n8n
   yet. This proves the interface works before any integration exists.
3. Connect `GET /documents` for real first (read-only, safest).
4. Connect `POST /process-document`.
5. Connect `POST /review`.
6. After each switch, confirm the result in the actual Google Sheet before
   moving to the next endpoint.

## File structure

```
smart-office-assistant/
  server/
    index.js          # Express proxy, adds x-api-key server-side
  src/
    api/
      client.js        # every HTTP call lives here
      mock.js           # returns CONTRACT.md example JSON
    screens/
      Upload.jsx
      Dashboard.jsx
      DocumentDetail.jsx
    App.jsx
    main.jsx
  .env                 # real values, git-ignored
  .env.example         # placeholders, committed
  SPEC.md  CONTRACT.md  PROMPTS.md  README.md
```

## Language

UI text is in Hebrew with `dir="rtl"`. Field names, endpoint paths, and
error codes stay in English because they are fixed by CONTRACT.md.
