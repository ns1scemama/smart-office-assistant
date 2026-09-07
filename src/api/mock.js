// Returns the exact example JSON from CONTRACT.md.
// Used while VITE_USE_MOCK=true so the interface is testable before any
// n8n integration exists.

const mockDocuments = [
  {
    document_id: 'exec-1043',
    received_at: '2026-03-11T09:24:00Z',
    file_name: 'invoice-4471.pdf',
    file_link: 'https://drive.google.com/file/d/1a2b3c/view',
    document_type: 'invoice',
    sender_or_company: 'Nordic Supplies Ltd',
    summary: 'Invoice for office chairs delivered in February.',
    requested_action: 'Approve and pay invoice 4471',
    deadline: '12 March 2026',
    urgency: 'High',
    department: 'Finance',
    status: 'Processed',
  },
  {
    document_id: 'exec-1044',
    received_at: '2026-03-10T14:02:00Z',
    file_name: 'internal-report-august.docx',
    file_link: 'https://drive.google.com/file/d/2x9y8z/view',
    document_type: 'report',
    sender_or_company: 'Not found',
    summary: 'Monthly office supply consumption summary, no anomalies found.',
    requested_action: 'No action found',
    deadline: 'Not found',
    urgency: 'Low',
    department: 'General',
    status: 'Needs Review',
  },
  {
    document_id: 'exec-1045',
    received_at: '2026-03-09T11:15:00Z',
    file_name: 'complaint-delivery.txt',
    file_link: 'https://drive.google.com/file/d/3q7w6e/view',
    document_type: 'complaint',
    sender_or_company: 'Sagi & Sons Law Office',
    summary: 'Complaint about a delayed order and lack of response.',
    requested_action: 'Provide status update and explanation',
    deadline: 'Not found',
    urgency: 'Medium',
    department: 'Support',
    status: 'Reviewed',
  },
];

export function mockGetDocuments() {
  return Promise.resolve(mockDocuments);
}

export function mockProcessDocument({ file_name }) {
  return Promise.resolve({
    status: 'processed',
    document_id: 'exec-mock-' + Date.now(),
    file_name,
    file_link: 'https://drive.google.com/file/d/mock/view',
    received_at: new Date().toISOString(),
    fields: {
      document_type: 'invoice',
      sender_or_company: 'Nordic Supplies Ltd',
      summary: 'Invoice for office chairs delivered in February.',
      requested_action: 'Approve and pay invoice 4471',
      deadline: '12 March 2026',
      urgency: 'High',
      department: 'Finance',
    },
    notification_sent: true,
  });
}

export function mockReview({ document_id }) {
  return Promise.resolve({ status: 'updated', document_id });
}
