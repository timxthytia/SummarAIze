import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  collection, deleteDoc, doc, onSnapshot,
  query, where, orderBy, updateDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [renameModal, setRenameModal] = useState({ visible: false, id: '', title: '' });
  const [editingSummaryId, setEditingSummaryId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [downloadFormats, setDownloadFormats] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, id: '' });  // New state
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = getAuth().onAuthStateChanged((user) => {
      if (user) {
        setUser(user);

        const q = query(
          collection(db, 'summaries'),
          where('uid', '==', user.uid),
          orderBy('timestamp', 'desc')
        );

        const unsubscribeSummaries = onSnapshot(q, (snapshot) => {
          const summariesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSummaries(summariesList);
        });

        return () => unsubscribeSummaries();
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleDownload = (title, summary, format) => {
    if (format === 'pdf') {
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(summary, 180);
      doc.text(lines, 10, 10);
      doc.save(`${title || 'summary'}.pdf`);
    } else if (format === 'docx') {
      const doc = new Document({
        sections: [{
          children: summary.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
        }]
      });

      Packer.toBlob(doc).then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title || 'summary'}.docx`;
        link.click();
      });
    }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'summaries', id));
    setDeleteConfirm({ visible: false, id: '' }); // Close modal after delete
  };

  const openDeleteConfirm = (id) => {
    setDeleteConfirm({ visible: true, id });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ visible: false, id: '' });
  };

  const handleRename = async () => {
    const { id, title } = renameModal;
    if (!title.trim()) return;
    await updateDoc(doc(db, 'summaries', id), { title });
    setRenameModal({ visible: false, id: '', title: '' });
  };

  return (
    <div className="dashboard-container">
      <NavbarLoggedin user={user} />
      <div className="summary-list">
        <h3>Your Saved Summaries</h3>
        {summaries.length === 0 ? (
          <p>No summaries found.</p>
        ) : (
          summaries.map((summary) => (
            <div key={summary.id} className="summary-card">
              <div className="summary-card-header">
                <select
                  value={downloadFormats[summary.id] || 'pdf'}
                  onChange={(e) => setDownloadFormats(prev => ({ ...prev, [summary.id]: e.target.value }))}
                  className="download-format-select"
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                </select>
                <button
                  className="download-button"
                  onClick={() =>
                    handleDownload(summary.title, summary.summary, downloadFormats[summary.id] || 'pdf')
                  }
                >
                  Download
                </button>
              </div>

              <div className="summary-link">
                <p>
                  <strong>Title:</strong> {summary.title || 'Untitled'}
                  <button
                    className="rename-trigger-button"
                    onClick={() =>
                      setRenameModal({ visible: true, id: summary.id, title: summary.title || '' })
                    }
                  >
                    Rename
                  </button>
                </p>
                <p><strong>Type:</strong> {summary.type}</p>

                <div className="summary-content-row">
                  <strong>Summary:</strong>
                  {editingSummaryId === summary.id ? (
                    <div style={{ width: '100%' }}>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        autoFocus
                        rows={5}
                        style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem' }}
                      />
                      <button
                        className="confirm-rename-button"
                        style={{ marginTop: '0.5rem' }}
                        onClick={async () => {
                          if (!editingContent.trim()) return;
                          await updateDoc(doc(db, 'summaries', summary.id), { summary: editingContent });
                          setEditingSummaryId(null);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="summary-copy-wrapper">
                      <span
                        onClick={() => {
                          setEditingSummaryId(summary.id);
                          setEditingContent(summary.summary);
                        }}
                        className="summary-snippet"
                      >
                        {summary.summary.slice(0, 150)}...
                      </span>
                      <button
                        className="copy-button"
                        onClick={() => navigator.clipboard.writeText(summary.summary)}
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>

                <p><small>{summary.timestamp?.toDate().toLocaleString()}</small></p>
              </div>

              <button
                className="delete-button"
                onClick={() => openDeleteConfirm(summary.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {/* Rename Modal */}
      {renameModal.visible && (
        <div className="rename-modal-overlay">
          <div className="rename-modal">
            <button
              className="close-modal-button"
              onClick={() => setRenameModal({ visible: false, id: '', title: '' })}
            >
              ×
            </button>
            <h3>Rename Summary</h3>
            <input
              type="text"
              value={renameModal.title}
              onChange={(e) => setRenameModal(prev => ({ ...prev, title: e.target.value }))}
              placeholder="New title"
            />
            <button
              onClick={handleRename}
              className="confirm-rename-button"
              disabled={!renameModal.title.trim()}
            >
              Rename
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.visible && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <p>Are you sure you want to delete this summary?</p>
            <div className="delete-modal-buttons">
              <button className="delete-confirm-button" onClick={() => handleDelete(deleteConfirm.id)}>Yes</button>
              <button className="delete-cancel-button" onClick={cancelDelete}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
