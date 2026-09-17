// Server-side mock of the three n8n endpoints, used when N8N_SECRET is absent
// or API_MODE=mock. It lets the project run from a fresh clone with no
// credentials at all, so a reviewer can see the whole interface before any
// setup. The shapes are the ones in CONTRACT.md, nothing else.

const seed = [
  {
    document_id: 'exec-381',
    received_at: '2026-09-07T09:35:44.701-04:00',
    file_name: '1-invoice-urgent.docx',
    file_link: 'https://drive.google.com/file/d/mock-invoice/view',
    document_type: 'invoice',
    sender_or_company: 'נורדיק ריהוט משרדי בע"מ',
    summary: 'חשבונית מספר 4471 עבור כיסאות ושולחנות משרד. סה"כ 12,567 ₪ כולל מע"מ.',
    requested_action: 'לבצע את התשלום עד לתאריך הפירעון הנקוב',
    deadline: '07/09/2026',
    urgency: 'High',
    department: 'Finance',
    status: 'Processed',
    reviewed_by: '',
    review_note: '',
  },
  {
    document_id: 'exec-385',
    received_at: '2026-09-07T09:36:02.036-04:00',
    file_name: '3-complaint-no-deadline.txt',
    file_link: 'https://drive.google.com/file/d/mock-complaint/view',
    document_type: 'complaint',
    sender_or_company: 'אורית שגיא, משרד עורכי דין שגיא ובניו',
    summary: 'הזמנת ציוד משרדי שטרם סופקה לאחר שלושה שבועות, ללא מענה ברור בטלפון.',
    requested_action: 'לספק הסבר ועדכון סטטוס ברור לגבי ההזמנה',
    deadline: 'Not found',
    urgency: 'Medium',
    department: 'Support',
    status: 'Processed',
    reviewed_by: '',
    review_note: '',
  },
  {
    document_id: 'exec-389',
    received_at: '2026-09-07T09:36:19.262-04:00',
    file_name: '5-internal-report.pdf',
    file_link: 'https://drive.google.com/file/d/mock-report/view',
    document_type: 'report',
    sender_or_company: 'Not found',
    summary: 'דוח פנימי על צריכת ציוד משרדי באוגוסט. לא נרשמו חריגות.',
    requested_action: 'No action found',
    deadline: 'Not found',
    urgency: 'Low',
    department: 'General',
    status: 'Needs Review',
    reviewed_by: '',
    review_note: '',
  },
];

const documents = [...seed];

export function listDocuments() {
  return documents;
}

const ACCEPTED = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Live mode refuses unsupported types inside Workflow A. The mock has to do
// the same or the two modes would disagree about what the API accepts.
export function isSupported(mime_type) {
  return ACCEPTED.includes(mime_type);
}

export function processDocument({ file_name }) {
  const id = 'exec-mock-' + Date.now();
  const row = {
    document_id: id,
    received_at: new Date().toISOString(),
    file_name,
    file_link: 'https://drive.google.com/file/d/mock-new/view',
    document_type: 'invoice',
    sender_or_company: 'Nordic Supplies Ltd',
    summary: 'Invoice for office chairs delivered in February.',
    requested_action: 'Approve and pay invoice 4471',
    deadline: '12 March 2026',
    urgency: 'High',
    department: 'Finance',
    status: 'Processed',
    reviewed_by: '',
    review_note: '',
  };
  documents.unshift(row);
  return {
    status: 'processed',
    document_id: row.document_id,
    file_name: row.file_name,
    file_link: row.file_link,
    received_at: row.received_at,
    fields: {
      document_type: row.document_type,
      sender_or_company: row.sender_or_company,
      summary: row.summary,
      requested_action: row.requested_action,
      deadline: row.deadline,
      urgency: row.urgency,
      department: row.department,
    },
    notification_sent: true,
  };
}

export function recordReview({ document_id, status, reviewed_by, review_note }) {
  const row = documents.find((d) => d.document_id === document_id);
  if (!row) return null;
  row.status = status || 'Reviewed';
  row.reviewed_by = reviewed_by || '';
  row.review_note = review_note || '';
  return { status: 'updated', document_id };
}
