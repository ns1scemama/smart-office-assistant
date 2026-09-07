import { useRef, useState } from 'react';
import { processDocument, ApiError } from '../api/client.js';
import UrgencyBadge from './UrgencyBadge.jsx';

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const MAX_FILE_MB = 10;

const ERROR_MESSAGES = {
  UNSUPPORTED_FILE_TYPE: 'ניתן להעלות רק קבצי PDF, DOCX או TXT.',
  EMPTY_DOCUMENT: 'לא נמצא טקסט קריא במסמך הזה. נסה קובץ אחר.',
  EXTRACTION_FAILED: 'עיבוד המסמך נכשל. אפשר לנסות שוב.',
  UNAUTHORIZED: 'בעיית הגדרות מערכת. פנה למנהל המערכת.',
  TIMEOUT: 'העיבוד ארך זמן רב מדי. אפשר לנסות שוב.',
  UPSTREAM_UNREACHABLE: 'לא ניתן להתחבר למערכת האוטומציה כרגע.',
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Upload({ onProcessed }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  function validateAndSetFile(candidate) {
    setError(null);
    setResult(null);
    if (!candidate) return;
    if (!ACCEPTED_TYPES[candidate.type]) {
      setError('סוג קובץ לא נתמך. ניתן להעלות רק PDF, DOCX או TXT.');
      return;
    }
    if (candidate.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`הקובץ גדול מדי. הגודל המרבי הוא ${MAX_FILE_MB}MB.`);
      return;
    }
    setFile(candidate);
  }

  async function handleSend() {
    if (!file || sending) return;
    setSending(true);
    setError(null);
    try {
      const file_base64 = await fileToBase64(file);
      const response = await processDocument({
        file_name: file.name,
        mime_type: file.type,
        file_base64,
      });
      setResult(response);
      onProcessed?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(ERROR_MESSAGES[err.errorCode] || err.message);
      } else {
        setError('אירעה שגיאה לא צפויה.');
      }
    } finally {
      setSending(false);
    }
  }

  function handleRetry() {
    setError(null);
    handleSend();
  }

  return (
    <div>
      <h1>העלאת מסמך</h1>
      <p className="subtitle">גרור מסמך לתיבה, או לחץ לבחירה. יעובד אוטומטית ותוצג תוצאה כאן.</p>

      <div className="card">
        <div
          className={`dropzone${dragOver ? ' dragover' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            validateAndSetFile(e.dataTransfer.files?.[0]);
          }}
        >
          <p>גרור לכאן קובץ PDF, DOCX או TXT, או לחץ לבחירה</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => validateAndSetFile(e.target.files?.[0])}
          />
        </div>

        {file && (
          <div className="file-picked">
            <span dir="ltr">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
            <button className="secondary" onClick={() => setFile(null)} disabled={sending}>
              הסר
            </button>
          </div>
        )}

        {error && (
          <div className="message error">
            {error}
            <div>
              <button className="secondary" style={{ marginTop: 10 }} onClick={handleRetry}>
                נסה שוב
              </button>
            </div>
          </div>
        )}

        {sending && (
          <div className="processing">
            <span className="spinner" />
            מעבד את המסמך… זה עשוי לקחת עד דקה
          </div>
        )}

        <button className="primary" onClick={handleSend} disabled={!file || sending}>
          שלח לעיבוד
        </button>
      </div>

      {result && (
        <div className="card result-card">
          <h1 style={{ fontSize: 18 }}>תוצאת העיבוד</h1>
          <div className="result-field">
            <div className="label">סוג מסמך</div>
            <div className="value">{result.fields.document_type}</div>
          </div>
          <div className="result-field">
            <div className="label">שולח / חברה</div>
            <div className="value">{result.fields.sender_or_company}</div>
          </div>
          <div className="result-field">
            <div className="label">תקציר</div>
            <div className="value">{result.fields.summary}</div>
          </div>
          <div className="result-field">
            <div className="label">פעולה נדרשת</div>
            <div className="value">{result.fields.requested_action}</div>
          </div>
          <div className="result-field">
            <div className="label">מועד יעד</div>
            <div className="value">{result.fields.deadline}</div>
          </div>
          <div className="result-field">
            <div className="label">דחיפות</div>
            <div className="value"><UrgencyBadge urgency={result.fields.urgency} /></div>
          </div>
          <div className="result-field">
            <div className="label">מחלקה</div>
            <div className="value">{result.fields.department}</div>
          </div>
          <div className="result-field">
            <div className="label">קובץ בדרייב</div>
            <div className="value"><a href={result.file_link} target="_blank" rel="noreferrer">פתח קובץ</a></div>
          </div>
        </div>
      )}
    </div>
  );
}
