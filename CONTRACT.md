# CONTRACT.md: Application to n8n Data Contract

This is the single source of truth for the shape of every request and response
between the application and the n8n workflows. If a field name changes, it
changes here first, then in n8n, then in the application. Never guess a field
name. Check this file.

Allowed values for `document_type`, `urgency`, and `department` come from
Part 1 of the course project and must never be translated, renamed, or
extended by the application.

- `document_type`: invoice | request | report | complaint | contract | quote | other
- `urgency`: Low | Medium | High
- `department`: Sales | Finance | Support | HR | Management | General

---

## POST /process-document

### Request

| Field | Type | Required | Notes |
|---|---|---|---|
| file_name | string | Yes | Original name including the extension |
| mime_type | string | Yes | application/pdf, text/plain, or the DOCX mime type |
| file_base64 | string | Yes | The file encoded as base64, without a data URL prefix |
| submitted_by | string | No | Who used the application; useful for the log |

### Successful Response (200)

```json
{
  "status": "processed",
  "document_id": "exec-1043",
  "file_name": "invoice-4471.pdf",
  "file_link": "https://drive.google.com/file/d/1a2b3c/view",
  "received_at": "2026-03-11T09:24:00Z",
  "fields": {
    "document_type": "invoice",
    "sender_or_company": "Nordic Supplies Ltd",
    "summary": "Invoice for office chairs delivered in February.",
    "requested_action": "Approve and pay invoice 4471",
    "deadline": "12 March 2026",
    "urgency": "High",
    "department": "Finance"
  },
  "notification_sent": true
}
```

### Error Response

```json
{
  "status": "error",
  "error_code": "UNSUPPORTED_FILE_TYPE",
  "message": "Only PDF, DOCX and TXT files can be processed."
}
```

| error_code | When it is returned | What the application shows |
|---|---|---|
| UNSUPPORTED_FILE_TYPE | The MIME type is not PDF, DOCX, or TXT | Inline message on the upload screen; the file is not sent again |
| EMPTY_DOCUMENT | Text extraction produced nothing (e.g. a scanned image) | Explain that the document has no readable text and suggest a different file |
| EXTRACTION_FAILED | The AI step failed or returned unusable output | Offer a Retry button; the file is kept in the form |
| UNAUTHORIZED | Missing or wrong secret header | A configuration error message, not something the end user can fix |

---

## GET /documents

### Response (200)

```json
[
  {
    "document_id": "exec-1043",
    "received_at": "2026-03-11T09:24:00Z",
    "file_name": "invoice-4471.pdf",
    "file_link": "https://drive.google.com/file/d/1a2b3c/view",
    "document_type": "invoice",
    "sender_or_company": "Nordic Supplies Ltd",
    "summary": "Invoice for office chairs delivered in February.",
    "requested_action": "Approve and pay invoice 4471",
    "deadline": "12 March 2026",
    "urgency": "High",
    "department": "Finance",
    "status": "Processed"
  }
]
```

---

## POST /review

### Request

| Field | Type | Notes |
|---|---|---|
| document_id | string | Must match a Document ID in the sheet |
| status | string | Reviewed or Needs Review |
| reviewed_by | string | Name or email of the person who reviewed it |
| review_note | string | Optional free text, up to 200 characters |

### Response (200)

```json
{ "status": "updated", "document_id": "exec-1043" }
```

Returns HTTP 404 when no matching row exists for `document_id`.

---

## Contract Discipline

Missing information arrives as `"Not found"` or `"No action found"` and must
be displayed as such, never hidden and never replaced with a guess.

The application never calls an AI model, never writes to Google Sheets, never
sends email, and never decides what "urgent" means. It only calls these three
endpoints and displays what comes back.
