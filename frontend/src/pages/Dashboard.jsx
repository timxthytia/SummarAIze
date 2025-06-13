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
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { getDoc } from 'firebase/firestore';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [mindmaps, setMindmaps] = useState([]);
  const [testpapers, setTestpapers] = useState([]);
const [renameModal, setRenameModal] = useState({ visible: false, id: '', title: '', isMindmap: false, isTestpaper: false });
  const [downloadFormats, setDownloadFormats] = useState({});
const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, id: '', isMindmap: false, isTestpaper: false });
  const [view, setView] = useState('summaries');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = getAuth().onAuthStateChanged((user) => {
      if (user) {
        setUser(user);

        const q = query(
          collection(db, 'users', user.uid, 'summaries'),
          orderBy('timestamp', 'desc')
        );

        const unsubscribeSummaries = onSnapshot(q, (snapshot) => {
          const summariesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSummaries(summariesList);
        });

        const mindmapQuery = query(
          collection(db, 'users', user.uid, 'mindmaps'),
          orderBy('timestamp', 'desc')
        );

        const unsubscribeMindmaps = onSnapshot(mindmapQuery, (snapshot) => {
          const mindmapList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMindmaps(mindmapList);
        });

        const testpaperQuery = query(
          collection(db, 'users', user.uid, 'testpapers'),
          orderBy('uploadedAt', 'desc')
        );

        const unsubscribeTestpapers = onSnapshot(testpaperQuery, (snapshot) => {
          const paperList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTestpapers(paperList);
        });

        return () => {
          unsubscribeSummaries();
          unsubscribeMindmaps();
          unsubscribeTestpapers();
        };
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // For displaying text styles in dashboard
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

  const handleNavigate = (id, isMindmap = false, isTestpaper = false) => {
    let basePath = 'summary';
    if (isMindmap) basePath = 'mindmap';
    navigate(`/${basePath}/${user.uid}/${id}`);
  };

  // Delete files from firestore
  const handleDelete = async (id) => {
    try {
      const isMindmap = deleteConfirm.isMindmap;
      const isTestpaper = deleteConfirm.isTestpaper;
      const docPath = isMindmap ? 'mindmaps' : isTestpaper ? 'testpapers' : 'summaries';
      const docRef = doc(db, 'users', user.uid, docPath, id);

      // Only for testpapers: delete associated files from Storage
      if (isTestpaper) {
        const paperDoc = await getDoc(docRef);
        if (paperDoc.exists()) {
          const data = paperDoc.data();
          const storage = getStorage();

          // Delete test paper file
          if (data.fileName) {
            const fileRef = ref(storage, `testpapers/${user.uid}/${id}/${data.fileName}`);
            await deleteObject(fileRef).catch(err =>
              console.warn('Failed to delete test paper file:', err)
            );
          }

          // Delete "Other" type answer files
          if (Array.isArray(data.questionsByPage)) {
            for (const pageData of data.questionsByPage) {
              for (const question of pageData.questions) {
                if (question.type === 'Other' && question.correctAnswer?.url) {
                  const answerFileName = question.correctAnswer.name;
                  const answerRef = ref(storage, `testpapers/${user.uid}/${id}/answers/${answerFileName}`);
                  await deleteObject(answerRef).catch(err =>
                    console.warn('Failed to delete answer file:', err)
                  );
                }
              }
            }
          }
        }
      }

      await deleteDoc(docRef);
      setDeleteConfirm({ visible: false, id: '', isMindmap: false, isTestpaper: false });
    } catch (error) {
      const type = deleteConfirm.isMindmap ? 'mindmap' : deleteConfirm.isTestpaper ? 'testpaper' : 'summary';
      console.error(`Error deleting ${type}:`, error);
    }
  };

  // Rename files saved in firestore
  const handleRename = async () => {
    const { id, title, isMindmap, isTestpaper } = renameModal;
    if (!title.trim()) return;
    try {
      const updatePayload = {};
      if (isTestpaper) updatePayload.paperTitle = title;
      else updatePayload.title = title;

      await updateDoc(
        doc(db, 'users', user.uid, isMindmap ? 'mindmaps' : isTestpaper ? 'testpapers' : 'summaries', id),
        updatePayload
      );
      setRenameModal({ visible: false, id: '', title: '', isMindmap: false, isTestpaper: false });
    } catch (error) {
      let type = 'summary';
      if (isMindmap) type = 'mindmap';
      else if (isTestpaper) type = 'testpaper';
      console.error(`Error renaming ${type}:`, error);
    }
  };

  // Exporting as PDF/ DOCX documents
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

  // Delete files
  const openDeleteConfirm = (id) => {
    setDeleteConfirm({ visible: true, id, isMindmap: false, isTestpaper: false });
  };

  // Cancel delete operation
  const cancelDelete = () => {
    setDeleteConfirm({ visible: false, id: '', isMindmap: false, isTestpaper: false });
  };


  return (
    <div className="dashboard-container">
      <NavbarLoggedin user={user} />
      <main>
      <div className="dashboard-toggle-buttons">
        <button
          className={`toggle-button ${view === 'summaries' ? 'active' : ''}`}
          onClick={() => setView('summaries')}
        >
          Summaries
        </button>
        <button
          className={`toggle-button ${view === 'mindmaps' ? 'active' : ''}`}
          onClick={() => setView('mindmaps')}
        >
          Mind Maps
        </button>
        <button
          className={`toggle-button ${view === 'testpapers' ? 'active' : ''}`}
          onClick={() => setView('testpapers')}
        >
          Test Papers
        </button>
      </div>

      {view === 'summaries' && (
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
      )}

      {view === 'mindmaps' && (
        <div className="mindmap-list">
          <h3>Your Saved Mindmaps</h3>
          {mindmaps.length === 0 ? (
            <p>No mind maps found.</p>
          ) : (
            mindmaps.map((mindmap) => (
              <div
                key={mindmap.id}
                className="mindmap-card"
                onClick={() => handleNavigate(mindmap.id, true)}
              >
                <p>
                  <strong>Title:</strong> {mindmap.title || 'Untitled'}
                  <button
                    className="rename-trigger-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameModal({ visible: true, id: mindmap.id, title: mindmap.title || '', isMindmap: true });
                    }}
                  >
                    Rename
                  </button>
                </p>
                <p><small>{mindmap.timestamp?.toDate().toLocaleString()}</small></p>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ visible: true, id: mindmap.id, isMindmap: true });
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'testpapers' && (
        <div className="testpaper-list">
          <h3>Your Uploaded Test Papers</h3>
          {testpapers.length === 0 ? (
            <p>No test papers found.</p>
          ) : (
            testpapers.map((paper) => (
              <div
                key={paper.id}
                className="testpaper-card"
              >
                <p><strong>Title:</strong> {paper.paperTitle}</p>
                <button
                  className="rename-trigger-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameModal({ visible: true, id: paper.id, title: paper.paperTitle || '', isTestpaper: true, isMindmap: false });
                  }}
                >
                  Rename
                </button>
                <p><strong>File:</strong> {paper.fileName}</p>
                <p><strong>Pages:</strong> {paper.numPages}</p>
                <p><small>{new Date(paper.uploadedAt).toLocaleString()}</small></p>
                <div className="testpaper-actions">
                  <button
                    className="edit-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/testpaperdetail/${user.uid}/${paper.id}`);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="review-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/testreview/${user.uid}/${paper.id}`, { state: { testpaper: paper } });
                    }}
                  >
                    Review
                  </button>
                  <button
                    className="attempt-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/testattemptsetup/${user.uid}/${paper.id}`);
                    }}
                  >
                    Start Attempt
                  </button>
                </div>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ visible: true, id: paper.id, isTestpaper: true, isMindmap: false });
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {renameModal.visible && (
        <div className="rename-modal-overlay">
          <div className="rename-modal">
            <button
              className="close-modal-button"
              onClick={() => setRenameModal({ visible: false, id: '', title: '', isMindmap: false, isTestpaper: false })}
            >
              ×
            </button>
            <h3>
              {renameModal.isMindmap
                ? 'Rename Mind Map'
                : renameModal.isTestpaper
                  ? 'Rename Test Paper'
                  : 'Rename Summary'}
            </h3>
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
            <p>
              {deleteConfirm.isMindmap
                ? 'Are you sure you want to delete this mind map?'
                : deleteConfirm.isTestpaper
                  ? 'Are you sure you want to delete this test paper?'
                  : 'Are you sure you want to delete this summary?'}
            </p>
            <div className="delete-modal-buttons">
              <button className="delete-confirm-button" onClick={() => handleDelete(deleteConfirm.id)}>Yes</button>
              <button className="delete-cancel-button" onClick={cancelDelete}>No</button>
            </div>
          </div>
        </div>
      )}
    </main>
    </div>
  );
}

export default Dashboard;
