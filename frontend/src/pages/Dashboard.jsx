import React, { useState, useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  collection, deleteDoc, doc, onSnapshot,
  query, where, orderBy, updateDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import '../styles/Dashboard.css';
import NavbarLoggedin from '../components/NavbarLoggedin';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { getDoc } from 'firebase/firestore';
import { handleDownload, handleMindmapDownload } from '../utils/exportUtils';

import ExportMindmapModal from '../components/ExportMindmapModel';
import CustomNode from '../components/CustomNode'; 
import CustomEdge from '../components/CustomEdge'; 

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [mindmaps, setMindmaps] = useState([]);
  const [testpapers, setTestpapers] = useState([]);
  const [renameModal, setRenameModal] = useState({ visible: false, id: '', title: '', isMindmap: false, isTestpaper: false });
  const [downloadFormats, setDownloadFormats] = useState({});
  const [mindmapExportFormats, setMindmapExportFormats] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, id: '', isMindmap: false, isTestpaper: false });
  const [view, setView] = useState('summaries');
  // Tag modal state
  const [tagModal, setTagModal] = useState({ visible: false, id: '', tags: [], isMindmap: false, isTestpaper: false });
  const [newTag, setNewTag] = useState('');
  // Tag autocomplete
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  // All unique tags from summaries, mindmaps, testpapers
  const allTags = useMemo(() => {
    const tagsSet = new Set();
    [...summaries, ...mindmaps, ...testpapers].forEach(item => {
      (item.tags || []).forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [summaries, mindmaps, testpapers]);

  // Handler for tag input change (autocomplete)
  const onTagInputChange = (e) => {
    const val = e.target.value;
    setNewTag(val);

    if (!val.trim()) {
      setFilteredSuggestions([]);
      return;
    }

    const filtered = allTags.filter(tag =>
      tag.toLowerCase().includes(val.toLowerCase()) &&
      tag.toLowerCase() !== val.toLowerCase()
    );
    setFilteredSuggestions(filtered);
  };
  const navigate = useNavigate();

  // States for ExportMindmapModel
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMindmap, setExportMindmap] = useState(null);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportNodes, setExportNodes] = useState([]);
  const [exportEdges, setExportEdges] = useState([]);
  // Pass in custom nodes and edges
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);
  const mindmapRefs = useRef({});
 
  // Tag modal open function
  const openTagModal = (id, tags = [], isMindmap = false, isTestpaper = false) => {
    setNewTag('');
    setTagModal({ visible: true, id, tags, isMindmap, isTestpaper });
  };

  // Save new tag function
  const handleSaveTag = async () => {
    if (!newTag.trim()) return;
    try {
      const { id, tags, isMindmap, isTestpaper } = tagModal;
      const docPath = isMindmap ? 'mindmaps' : isTestpaper ? 'testpapers' : 'summaries';
      const docRef = doc(db, 'users', user.uid, docPath, id);

      // Add new tag only if not duplicate
      const updatedTags = tags.includes(newTag.trim()) ? tags : [...tags, newTag.trim()];

      await updateDoc(docRef, { tags: updatedTags });

      setTagModal({ visible: false, id: '', tags: [], isMindmap: false, isTestpaper: false });
    } catch (error) {
      console.error('Error saving tag:', error);
    }
  };

  // Remove tag function
  const handleRemoveTag = async (id, tagToRemove, isMindmap = false, isTestpaper = false) => {
    try {
      const docPath = isMindmap ? 'mindmaps' : isTestpaper ? 'testpapers' : 'summaries';
      const docRef = doc(db, 'users', user.uid, docPath, id);

      // Find the document's tags
      let currentTags = [];
      if (isMindmap) currentTags = mindmaps.find(m => m.id === id)?.tags || [];
      else if (isTestpaper) currentTags = testpapers.find(t => t.id === id)?.tags || [];
      else currentTags = summaries.find(s => s.id === id)?.tags || [];

      const updatedTags = currentTags.filter(t => t !== tagToRemove);

      await updateDoc(docRef, { tags: updatedTags });
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

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
          SUMMARIES
        </button>
        <button
          className={`toggle-button ${view === 'mindmaps' ? 'active' : ''}`}
          onClick={() => setView('mindmaps')}
        >
          MINDMAPS
        </button>
        <button
          className={`toggle-button ${view === 'testpapers' ? 'active' : ''}`}
          onClick={() => setView('testpapers')}
        >
          TEST PAPERS
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
                <div className="summary-header">
                  <p><strong>Title:</strong> {summary.title || 'Untitled'}</p>
                  <button
                    className="rename-trigger-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameModal({ visible: true, id: summary.id, title: summary.title || '' });
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTagModal(summary.id, summary.tags || [], false, false);
                    }}
                  >
                    Tag
                  </button>
                </div>
                <p><small>{summary.timestamp?.toDate().toLocaleString()}</small></p>
                <div className="summary-actions">
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
                      handleDownload(
                        summary.title,
                        summary.summary,
                        downloadFormats[summary.id] || 'pdf',
                        import.meta.env.VITE_API_URL
                      )
                    }
                  >
                    Download
                  </button>
                </div>
                <button
                  className="delete-button"
                  onClick={() => handleNavigate(summary.id)}
                >
                  View
                </button>
                <button
                  className="delete-button"
                  onClick={() => openDeleteConfirm(summary.id)}
                >
                  Delete
                </button>
                <div className="tags-container">
                  {(summary.tags || []).map((tag, idx) => (
                    <span key={idx} className="tag-chip">
                      {tag}
                      <button
                        className="tag-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(summary.id, tag);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
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
                ref={el => mindmapRefs.current[mindmap.id] = el}
              >
                <div className="summary-header">
                  <p><strong>Title:</strong> {mindmap.title || 'Untitled'}</p>
                  <button
                    className="rename-trigger-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameModal({ visible: true, id: mindmap.id, title: mindmap.title || '', isMindmap: true });
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTagModal(mindmap.id, mindmap.tags || [], true, false);
                    }}
                  >
                    Tag
                  </button>
                </div>
                <p><small>{mindmap.timestamp?.toDate().toLocaleString()}</small></p>
                <div className="summary-actions">
                  <button
                    className="download-button"
                    onClick={async () => {
                      // Fetch the latest nodes/edges for this mindmap
                      const docRef = doc(db, 'users', user.uid, 'mindmaps', mindmap.id);
                      const mindmapDoc = await getDoc(docRef);
                      if (mindmapDoc.exists()) {
                        const data = mindmapDoc.data();
                        setExportNodes(data.nodes || []);
                        setExportEdges((data.edges || []).map(e => ({ ...e, type: 'custom' })));
                        setExportMindmap(mindmap);
                        setExportFormat('png');
                        setExportModalOpen(true);
                      } else {
                        alert('Mindmap not found.');
                      }
                    }}
                  >
                    Download
                  </button>
                </div>
                <button
                  className="delete-button"
                  onClick={() => handleNavigate(mindmap.id, true)}
                >
                  View
                </button>
                <button
                  className="delete-button"
                  onClick={() => setDeleteConfirm({ visible: true, id: mindmap.id, isMindmap: true })}
                >
                  Delete
                </button>
                <div className="tags-container">
                  {(mindmap.tags || []).map((tag, idx) => (
                    <span key={idx} className="tag-chip">
                      {tag}
                      <button
                        className="tag-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(mindmap.id, tag, true, false);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
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
              <div key={paper.id} className="mindmap-card">
                <div className="summary-header">
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
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTagModal(paper.id, paper.tags || [], false, true);
                    }}
                  >
                    Tag
                  </button>
                </div>
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
                    navigate(`/testreview/${user.uid}/${paper.id}`, { state: { testpaper: paper } });
                  }}
                >
                  Review
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ visible: true, id: paper.id, isTestpaper: true, isMindmap: false });
                  }}
                >
                  Delete
                </button>
                <div className="tags-container">
                  {(paper.tags || []).map((tag, idx) => (
                    <span key={idx} className="tag-chip">
                      {tag}
                      <button
                        className="tag-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(paper.id, tag, false, true);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Tag Modal */}
      {tagModal.visible && (
        <div className="rename-modal-overlay">
          <div className="rename-modal">
            <button
              className="close-modal-button"
              onClick={() => setTagModal({ visible: false, id: '', tags: [], isMindmap: false, isTestpaper: false })}
            >
              ×
            </button>
            <h3>Add Tag</h3>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={newTag}
                onChange={onTagInputChange}
                placeholder="Enter tag keyword"
                autoFocus
                autoComplete="off"
              />
              {filteredSuggestions.length > 0 && (
                <div className="autocomplete-container">
                  <ul className="autocomplete-list">
                    {filteredSuggestions.map((tag, idx) => (
                      <li
                        key={idx}
                        className="autocomplete-item"
                        onClick={() => {
                          setNewTag(tag);
                          setFilteredSuggestions([]);
                        }}
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="rename-modal-buttons">
              <button
                onClick={handleSaveTag}
                disabled={!newTag.trim()}
                className="modal-cancel-button"
              >
                Save
              </button>
              <button
                onClick={() => setTagModal({ visible: false, id: '', tags: [], isMindmap: false, isTestpaper: false })}
                className="modal-cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
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
            <div className="rename-modal-buttons">
              <button
                onClick={handleRename}
                className="modal-cancel-button"
                disabled={!renameModal.title.trim()}
              >
                Rename
              </button>
              <button
                className="modal-cancel-button"
                onClick={() => setRenameModal({ visible: false, id: '', title: '', isMindmap: false, isTestpaper: false })}
              >
                Cancel
              </button>
            </div>
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
              <button className="modal-cancel-button" onClick={() => handleDelete(deleteConfirm.id)}>Yes</button>
              <button className="modal-cancel-button" onClick={cancelDelete}>No</button>
            </div>
          </div>
        </div>
      )}
      {/* Mindmap Export Modal */}
      <ExportMindmapModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        mindmap={exportMindmap}
        format={exportFormat}
        setFormat={setExportFormat}
        nodes={exportNodes}
        edges={exportEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
      />
    </main>
    </div>
  );
}

export default Dashboard;
