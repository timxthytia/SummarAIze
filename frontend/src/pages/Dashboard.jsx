import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  collection, deleteDoc, doc, onSnapshot,
  query, where, orderBy, updateDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import html2pdf from 'html2pdf.js';
import DOMPurify from 'dompurify';
import '../styles/Dashboard.css'; 
import NavbarLoggedin from '../components/NavbarLoggedin';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [renameModal, setRenameModal] = useState({ visible: false, id: '', title: '' });
  const [downloadFormats, setDownloadFormats] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, id: '' });
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

  useEffect(() => {
    summaries.forEach((summary) => {
      const container = document.getElementById(`summary-${summary.id}`);
      if (container) {
        container.querySelectorAll('.ql-align-center').forEach(el => el.style.textAlign = 'center');
        container.querySelectorAll('.ql-align-right').forEach(el => el.style.textAlign = 'right');
        container.querySelectorAll('.ql-align-left').forEach(el => el.style.textAlign = 'left');
      }
    });
  }, [summaries]);

  const handleNavigate = (id) => {
    navigate(`/summary/${id}`);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'summaries', id));
      setDeleteConfirm({ visible: false, id: '' });
    } catch (error) {
      console.error('Error deleting summary:', error);
    }
  };

  const handleRename = async () => {
    const { id, title } = renameModal;
    if (!title.trim()) return;
    try {
      await updateDoc(doc(db, 'summaries', id), { title });
      setRenameModal({ visible: false, id: '', title: '' });
    } catch (error) {
      console.error('Error renaming summary:', error);
    }
  };

  const handleDownload = async (title, summaryHTML, format) => {
    const container = document.createElement('div');
    container.innerHTML = DOMPurify.sanitize(summaryHTML);

    if (format === 'pdf') {
      container.querySelectorAll('.ql-align-center').forEach(el => {
        el.style.textAlign = 'center';
      });
      container.querySelectorAll('.ql-align-right').forEach(el => {
        el.style.textAlign = 'right';
      });
      container.querySelectorAll('.ql-align-left').forEach(el => {
        el.style.textAlign = 'left';
      });
      html2pdf()
        .set({
          margin: [10, 20],
          filename: `${title || 'summary'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .save();
    } else if (format === 'docx') {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/generate-docx`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            html: container.innerHTML,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate DOCX');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'summary'}.docx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading DOCX:', error);
        alert('Failed to download DOCX file');
      }
    }
  };

  const openDeleteConfirm = (id) => {
    setDeleteConfirm({ visible: true, id });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ visible: false, id: '' });
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

              <div className="summary-link" onClick={() => handleNavigate(summary.id)}>
                <p>
                  <strong>Title:</strong> {summary.title || 'Untitled'}
                  <button
                    className="rename-trigger-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameModal({ visible: true, id: summary.id, title: summary.title || '' });
                    }}
                  >
                    Rename
                  </button>
                </p>
                <p><strong>Type:</strong> {summary.type}</p>
                <p><strong>Summary:</strong></p>
                <div id={`summary-${summary.id}`} dangerouslySetInnerHTML={{ __html: summary.summary }} />
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
}

export default Dashboard;
