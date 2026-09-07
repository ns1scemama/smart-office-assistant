import { useState } from 'react';
import { submitReview, ApiError } from '../api/client.js';
import UrgencyBadge from './UrgencyBadge.jsx';

export default function DocumentDetail({ document, onBack, onReviewed }) {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(document.status === 'Reviewed');

  async function handleMarkReviewed() {
    setSending(true);
    setError(null);
    try {
      await submitReview({
        document_id: document.document_id,
        status: 'Reviewed',
        reviewed_by: 'משתמש האפליקציה',
        review_note: note.slice(0, 200),
      });
      setDone(true);
      onReviewed?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'עדכון הבדיקה נכשל.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <button className="secondary" onClick={onBack} style={{ marginBottom: 16 }}>
        → חזרה ללוח
      </button>
      <h1 dir="ltr" style={{ textAlign: 'right' }}>{document.file_name}</h1>
      <p className="subtitle">התקבל: {new Date(document.received_at).toLocaleString('he-IL')}</p>

      <div className="card">
        <div className="result-field">
          <div className="label">סוג מסמך</div>
          <div className="value">{document.document_type}</div>
        </div>
        <div className="result-field">
          <div className="label">שולח / חברה</div>
          <div className="value">{document.sender_or_company}</div>
        </div>
        <div className="result-field">
          <div className="label">תקציר</div>
          <div className="value">{document.summary}</div>
        </div>
        <div className="result-field">
          <div className="label">פעולה נדרשת</div>
          <div className="value">{document.requested_action}</div>
        </div>
        <div className="result-field">
          <div className="label">מועד יעד</div>
          <div className="value">{document.deadline}</div>
        </div>
        <div className="result-field">
          <div className="label">דחיפות</div>
          <div className="value"><UrgencyBadge urgency={document.urgency} /></div>
        </div>
        <div className="result-field">
          <div className="label">מחלקה</div>
          <div className="value">{document.department}</div>
        </div>
        <div className="result-field">
          <div className="label">קובץ בדרייב</div>
          <div className="value"><a href={document.file_link} target="_blank" rel="noreferrer">פתח קובץ</a></div>
        </div>

        <div className="detail-actions">
          {done ? (
            <div className="message info">המסמך סומן כנבדק.</div>
          ) : (
            <>
              <textarea
                placeholder="הערה אופציונלית (עד 200 תווים)"
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
              />
              {error && <div className="message error">{error}</div>}
              <button className="primary" onClick={handleMarkReviewed} disabled={sending}>
                {sending ? 'מעדכן…' : 'סמן כנבדק'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
