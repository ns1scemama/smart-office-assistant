import { useEffect, useMemo, useState } from 'react';
import { getDocuments, ApiError } from '../api/client.js';
import UrgencyBadge from './UrgencyBadge.jsx';

const TYPE_LABELS = {
  invoice: 'חשבונית', request: 'פנייה', report: 'דוח',
  complaint: 'תלונה', contract: 'חוזה', quote: 'הצעת מחיר', other: 'אחר',
};
const STATUS_LABELS = { Processed: 'עובד', 'Needs Review': 'דורש בדיקה', Reviewed: 'נבדק' };

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function Dashboard({ onOpenDocument, refreshSignal, autoOpenId }) {
  const urlParams = new URLSearchParams(window.location.search);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState(urlParams.get('urgency') || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בטעינת הנתונים.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [refreshSignal]);

  useEffect(() => {
    if (!autoOpenId || documents.length === 0) return;
    const match = documents.find((d) => d.document_id === autoOpenId);
    if (match) onOpenDocument(match);
  }, [autoOpenId, documents]);

  const filtered = useMemo(() => {
    return documents
      .filter((d) => !urgencyFilter || d.urgency === urgencyFilter)
      .filter((d) => !typeFilter || d.document_type === typeFilter)
      .filter((d) => !deptFilter || d.department === deptFilter)
      .filter((d) => !statusFilter || d.status === statusFilter)
      .filter((d) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          d.file_name?.toLowerCase().includes(q) ||
          d.sender_or_company?.toLowerCase().includes(q) ||
          d.summary?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
  }, [documents, search, urgencyFilter, typeFilter, deptFilter, statusFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1>לוח מסמכים</h1>
          <p className="subtitle">כל המסמכים שעובדו, כולל אלה שנכנסו ישירות דרך תיקיית הדרייב.</p>
        </div>
        <button className="secondary" onClick={load}>רענון</button>
      </div>

      <div className="filters">
        <input
          placeholder="חיפוש לפי שם קובץ, שולח או תקציר…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
          <option value="">כל רמות הדחיפות</option>
          <option value="High">דחוף</option>
          <option value="Medium">בינוני</option>
          <option value="Low">נמוך</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">כל סוגי המסמך</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">כל המחלקות</option>
          {['Sales', 'Finance', 'Support', 'HR', 'Management', 'General'].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">כל הסטטוסים</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {error && <div className="message error">{error}</div>}

      {loading ? (
        <div className="empty-state">טוען…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {documents.length === 0 ? 'עדיין לא עובדו מסמכים.' : 'לא נמצאו מסמכים התואמים את הסינון.'}
        </div>
      ) : (
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th>התקבל</th>
                <th>שם קובץ</th>
                <th>שולח / חברה</th>
                <th>דחיפות</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.document_id} className="clickable" onClick={() => onOpenDocument(doc)}>
                  <td>{formatDate(doc.received_at)}</td>
                  <td><span dir="ltr">{doc.file_name}</span></td>
                  <td>{doc.sender_or_company}</td>
                  <td><UrgencyBadge urgency={doc.urgency} /></td>
                  <td>{STATUS_LABELS[doc.status] || doc.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
