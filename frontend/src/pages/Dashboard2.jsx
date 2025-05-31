import React, { useEffect, useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import DOMPurify from 'dompurify';
import { mapToClosestDocxHighlight } from '../services/closestColor';
import htmlToDocx from 'html-to-docx';
import '../styles/Dashboard.css'; 

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [editTitles, setEditTitles] = useState({});
  const [renameModal, setRenameModal] = useState({ visible: false, id: '', title: '' });
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const navigate = useNavigate();

  useEffect(() => {
    return getAuth().onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        console.log("User authenticated:", user.email);

        const q = query(
          collection(db, 'summaries'),
          where('uid', '==', user.uid),
          orderBy('timestamp', 'desc')
        );

        const unsubscribeSummaries = onSnapshot(q, (snapshot) => {
          const summaryList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSummaries(summaryList);
        });

        return () => {
          unsubscribeSummaries();
        };
      } else {
        navigate('/login'); // Redirect to /login if not logged in
      }
    });
  }, [navigate]);

  const handleLogout = () => {
    signOut(getAuth()).then(() => {
      navigate('/login');
    }).catch((error) => {
      console.error("Error signing out:", error);
    });
  };

  const handleNavigate = (id) => {
    navigate(`/summary/${id}`);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'summaries', id));
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
    console.log("Sanitized summary HTML:", container.innerHTML);

    if (format === 'pdf') {
      html2pdf().from(container).save(`${title || 'summary'}.pdf`);
    } else if (format === 'docx') {
      const fileBuffer = await htmlToDocx(container.innerHTML, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });

      const blob = new Blob([fileBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      saveAs(blob, `${title || 'summary'}.docx`);
    }
  };

  if (!user) return;

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <img className="profile-pic" src={user.photoURL} alt="Profile" />
        <h2>Welcome, {user.displayName}!</h2>
        <p>Email: {user.email}</p>
        <button onClick={handleLogout} className="logout-button">Sign Out</button>
      </div>
      <div className="summary-list">
        <h3>Your Saved Summaries</h3>
        {summaries.length === 0 ? (
          <p>No summaries found.</p>
        ) : (
          summaries.map((summary) => (
            <div key={summary.id} className="summary-card">
              <div className="summary-card-header">
                <select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                  className="download-format-select"
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                </select>
                <button
                  className="download-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(summary.title, summary.summary, downloadFormat);
                  }}
                >
                  Download
                </button>
              </div>
              <div className="summary-link" onClick={() => handleNavigate(summary.id)}>
                <p>
                  <strong>Title:</strong> {summary.title || 'Untitled'}{' '}
                  <button
                    className="rename-trigger-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameModal({
                        visible: true,
                        id: summary.id,
                        title: summary.title || ''
                      });
                    }}
                  >
                    Rename
                  </button>
                </p>
                <p><strong>Type:</strong> {summary.type}</p>
                <p><strong>Summary:</strong></p>
                <div dangerouslySetInnerHTML={{ __html: summary.summary }} />
                <p><small>{summary.timestamp?.toDate().toLocaleString()}</small></p>
              </div>
              <button onClick={() => handleDelete(summary.id)} className="delete-button">
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
              onChange={(e) =>
                setRenameModal((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter new title"
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
    </div>
  );
};

export default Dashboard;