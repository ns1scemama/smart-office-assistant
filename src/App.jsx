import { useState } from 'react';
import Upload from './screens/Upload.jsx';
import Dashboard from './screens/Dashboard.jsx';
import DocumentDetail from './screens/DocumentDetail.jsx';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const initialView = params.get('view') || 'upload';
  const [view, setView] = useState(initialView); // 'upload' | 'dashboard' | 'detail'
  const [selectedDoc, setSelectedDoc] = useState(null);
  const deepLinkDocId = params.get('doc');
  const [refreshSignal, setRefreshSignal] = useState(0);

  function openDashboard() {
    setView('dashboard');
  }

  function openDocument(doc) {
    setSelectedDoc(doc);
    setView('detail');
  }

  function bumpRefresh() {
    setRefreshSignal((n) => n + 1);
  }

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <button className={view === 'upload' ? 'active' : ''} onClick={() => setView('upload')}>
          העלאת מסמך
        </button>
        <button className={view === 'dashboard' || view === 'detail' ? 'active' : ''} onClick={openDashboard}>
          לוח מסמכים
        </button>
      </nav>

      {view === 'upload' && <Upload onProcessed={bumpRefresh} />}
      {view === 'dashboard' && (
        <Dashboard onOpenDocument={openDocument} refreshSignal={refreshSignal} />
      )}
      {view === 'detail' && !selectedDoc && deepLinkDocId && (
        <Dashboard onOpenDocument={openDocument} refreshSignal={refreshSignal} autoOpenId={deepLinkDocId} />
      )}
      {view === 'detail' && selectedDoc && (
        <DocumentDetail
          document={selectedDoc}
          onBack={() => setView('dashboard')}
          onReviewed={bumpRefresh}
        />
      )}
    </div>
  );
}
