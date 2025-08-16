import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_URL } from '../config';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  collection, deleteDoc, doc, onSnapshot,
  query, orderBy, updateDoc, getDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import '../styles/Dashboard.css';
import { FiMoreVertical } from 'react-icons/fi';
import NavbarLoggedin from '../components/NavbarLoggedin';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { handleDownload } from '../utils/exportUtils';
import ExportMindmapModal from '../components/ExportMindmapModel';
import PopupModal from '../components/PopupModal';

import CustomNode from '../components/CustomNode'; 
import CustomEdge from '../components/CustomEdge'; 
import InputModal from '../components/InputModal';

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
  const [tagModal, setTagModal] = useState({ visible: false, id: '', tags: [], isMindmap: false, isTestpaper: false });
  const [newTag, setNewTag] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [tagSearchSuggestions, setTagSearchSuggestions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const allTags = useMemo(() => {
    const tagsSet = new Set();
    [...summaries, ...mindmaps, ...testpapers].forEach(item => {
      (item.tags || []).forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [summaries, mindmaps, testpapers]);

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

  const onTagSearchInputChange = (e) => {
    const val = e.target.value;
    setTagSearchInput(val);
    if (!val.trim()) {
      setTagSearchSuggestions([]);
      return;
    }
    const filtered = allTags.filter(tag =>
      tag.toLowerCase().includes(val.toLowerCase()) &&
      !selectedTags.includes(tag)
    );
    setTagSearchSuggestions(filtered);
  };

  const addTagToFilter = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setTagSearchInput('');
    setTagSearchSuggestions([]);
  };

  const removeTagFromFilter = (tag) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const TagChip = ({ tag, onRemove }) => (
    <span className="tag-chip">
      {tag}
      {onRemove && (
        <button className="tag-remove-btn" onClick={onRemove}>×</button>
      )}
    </span>
  );

  const filterByTags = (items) => {
    if (selectedTags.length === 0) return items;
    return items.filter(item => (item.tags || []).some(tag => selectedTags.includes(tag)));
  };
  const navigate = useNavigate();

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMindmap, setExportMindmap] = useState(null);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportNodes, setExportNodes] = useState([]);
  const [exportEdges, setExportEdges] = useState([]);
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);
  const mindmapRefs = useRef({});

  // Card Actions Dropdown State 
  const [openMenu, setOpenMenu] = useState({ id: null, kind: null });
  useEffect(() => {
    const onDocClick = () => setOpenMenu({ id: null, kind: null });
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
  const toggleMenu = (id, kind, e) => {
    e?.stopPropagation();
    setOpenMenu((prev) => (prev.id === id && prev.kind === kind ? { id: null, kind: null } : { id, kind }));
  };

  const openTagModal = (id, tags = [], isMindmap = false, isTestpaper = false) => {
    setNewTag('');
    setTagModal({ visible: true, id, tags, isMindmap, isTestpaper });
  };

  const handleSaveTag = async () => {
    if (!newTag.trim()) return;
    try {
      const { id, tags, isMindmap, isTestpaper } = tagModal;
      const docPath = isMindmap ? 'mindmaps' : isTestpaper ? 'testpapers' : 'summaries';
      const docRef = doc(db, 'users', user.uid, docPath, id);
      const updatedTags = tags.includes(newTag.trim()) ? tags : [...tags, newTag.trim()];
      await updateDoc(docRef, { tags: updatedTags });
      setTagModal({ visible: false, id: '', tags: [], isMindmap: false, isTestpaper: false });
    } catch (error) {}
  };

  const handleRemoveTag = async (id, tagToRemove, isMindmap = false, isTestpaper = false) => {
    try {
      const docPath = isMindmap ? 'mindmaps' : isTestpaper ? 'testpapers' : 'summaries';
      const docRef = doc(db, 'users', user.uid, docPath, id);
      let currentTags = [];
      if (isMindmap) currentTags = mindmaps.find(m => m.id === id)?.tags || [];
      else if (isTestpaper) currentTags = testpapers.find(t => t.id === id)?.tags || [];
      else currentTags = summaries.find(s => s.id === id)?.tags || [];
      const updatedTags = currentTags.filter(t => t !== tagToRemove);
      await updateDoc(docRef, { tags: updatedTags });
    } catch (error) {}
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

  const handleDelete = async (id) => {
    try {
      const isMindmap = deleteConfirm.isMindmap;
      const isTestpaper = deleteConfirm.isTestpaper;
      const docPath = isMindmap ? 'mindmaps' : isTestpaper ? 'testpapers' : 'summaries';
      const docRef = doc(db, 'users', user.uid, docPath, id);
      if (isTestpaper) {
        const paperDoc = await getDoc(docRef);
        if (paperDoc.exists()) {
          const data = paperDoc.data();
          const storage = getStorage();
          if (data.fileName) {
            const fileRef = ref(storage, `testpapers/${user.uid}/${id}/${data.fileName}`);
            await deleteObject(fileRef).catch(err => {});
          }
          if (Array.isArray(data.questionsByPage)) {
            for (const pageData of data.questionsByPage) {
              for (const question of pageData.questions) {
                if (question.type === 'Other' && question.correctAnswer?.url) {
                  const answerFileName = question.correctAnswer.name;
                  const answerRef = ref(storage, `testpapers/${user.uid}/${id}/answers/${answerFileName}`);
                  await deleteObject(answerRef).catch(err => {});
                }
              }
            }
          }
        }
      }
      await deleteDoc(docRef);
      setDeleteConfirm({ visible: false, id: '', isMindmap: false, isTestpaper: false });
    } catch (error) {}
  };

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
    } catch (error) {}
  };

  const openDeleteConfirm = (id) => {
    setDeleteConfirm({ visible: true, id, isMindmap: false, isTestpaper: false });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ visible: false, id: '', isMindmap: false, isTestpaper: false });
  };

  return (
    <div className={`dashboard-container ${view}`}>
      <NavbarLoggedin user={user} />
      <div className="fixed-sidebar">
        <button
          className={`toggle-button ${view === 'summaries' ? 'active' : ''}`}
          data-view="summaries"
          onClick={() => setView('summaries')}
        >
          SUMMARIES
        </button>
        <button
          className={`toggle-button ${view === 'mindmaps' ? 'active' : ''}`}
          data-view="mindmaps"
          onClick={() => setView('mindmaps')}
        >
          MINDMAPS
        </button>
        <button
          className={`toggle-button ${view === 'testpapers' ? 'active' : ''}`}
          data-view="testpapers"
          onClick={() => setView('testpapers')}
        >
          TEST PAPERS
        </button>
        <div className="sidebar-tag-filter">
          <div className="tag-filter-bar">
            <div className="tag-filter-input-wrapper" style={{ position: 'relative' }}>
              <input
                type="text"
                value={tagSearchInput}
                onChange={onTagSearchInputChange}
                placeholder="Filter by tag..."
                autoComplete="off"
                className="tag-filter-input"
                onKeyDown={e => {
                  if (e.key === 'Enter' && tagSearchInput.trim()) {
                    addTagToFilter(tagSearchInput.trim());
                  }
                }}
              />
              {tagSearchSuggestions.length > 0 && (
                <div className="autocomplete-container">
                  <ul className="autocomplete-list">
                    {tagSearchSuggestions.map((tag, idx) => (
                      <li
                        key={idx}
                        className="autocomplete-item"
                        onClick={() => addTagToFilter(tag)}
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="tag-filter-chips">
              {selectedTags.map((tag, idx) => (
                <TagChip key={idx} tag={tag} onRemove={() => removeTagFromFilter(tag)} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="main-content">
        {view === 'summaries' && (
          <div className="summary-list">
            <h3>Your Saved Summaries</h3>
            {filterByTags(summaries).length === 0 ? (
              <p>No summaries found.</p>
            ) : (
              <div className="card-grid">
                {filterByTags(summaries).map((summary) => (
                  <div key={summary.id} className="glass-card" id={`summary-${summary.id}`}>
                    <div className="card-header">
                      <p className="card-title">{summary.title || 'Untitled'}</p>
                      <button className="card-actions-toggle" onClick={(e) => toggleMenu(summary.id, 'summary', e)} aria-label="More actions">
                        <FiMoreVertical />
                      </button>
                      {openMenu.id === summary.id && openMenu.kind === 'summary' && (
                        <div className="card-actions-menu" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <button
                            className="card-menu-item"
                            onClick={() => setRenameModal({ visible: true, id: summary.id, title: summary.title || '' })}
                          >Rename</button>
                          <button
                            className="card-menu-item"
                            onClick={() => openTagModal(summary.id, summary.tags || [], false, false)}
                          >Tag</button>
                          <button
                            className="card-menu-item"
                            onClick={() => handleDownload(
                              summary.title,
                              summary.summary,
                              'pdf',
                              API_URL
                            )}
                          >Download as PDF</button>
                          <button
                            className="card-menu-item"
                            onClick={() => handleDownload(
                              summary.title,
                              summary.summary,
                              'docx',
                              API_URL
                            )}
                          >Download as DOCX</button>
                          <button
                            className="card-menu-item"
                            onClick={() => handleNavigate(summary.id)}
                          >View</button>
                          <button
                            className="card-menu-item"
                            onClick={() => openDeleteConfirm(summary.id)}
                          >Delete</button>
                        </div>
                      )}
                    </div>


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
                          >×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'mindmaps' && (
          <div className="mindmap-list">
            <h3>Your Saved Mindmaps</h3>
            {filterByTags(mindmaps).length === 0 ? (
              <p>No mind maps found.</p>
            ) : (
              <div className="card-grid">
                {filterByTags(mindmaps).map((mindmap) => (
                  <div key={mindmap.id} className="glass-card" ref={el => mindmapRefs.current[mindmap.id] = el}>
                    <div className="card-header">
                      <p className="card-title">{mindmap.title || 'Untitled'}</p>
                      <button className="card-actions-toggle" onClick={(e) => toggleMenu(mindmap.id, 'mindmap', e)} aria-label="More actions">
                        <FiMoreVertical />
                      </button>
                      {openMenu.id === mindmap.id && openMenu.kind === 'mindmap' && (
                        <div className="card-actions-menu" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <button
                            className="card-menu-item"
                            onClick={() => setRenameModal({ visible: true, id: mindmap.id, title: mindmap.title || '', isMindmap: true })}
                          >Rename</button>
                          <button
                            className="card-menu-item"
                            onClick={(e) => { e.stopPropagation(); openTagModal(mindmap.id, mindmap.tags || [], true, false); }}
                          >Tag</button>
                          <button
                            className="card-menu-item"
                            onClick={async () => {
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
                          >Download</button>
                          <button className="card-menu-item" onClick={() => handleNavigate(mindmap.id, true)}>View</button>
                          <button className="card-menu-item" onClick={() => setDeleteConfirm({ visible: true, id: mindmap.id, isMindmap: true })}>Delete</button>
                        </div>
                      )}
                    </div>


                    <div className="tags-container">
                      {(mindmap.tags || []).map((tag, idx) => (
                        <span key={idx} className="tag-chip">
                          {tag}
                          <button
                            className="tag-remove-btn"
                            onClick={(e) => { e.stopPropagation(); handleRemoveTag(mindmap.id, tag, true, false); }}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'testpapers' && (
          <div className="testpaper-list">
            <h3>Your Uploaded Test Papers</h3>
            {filterByTags(testpapers).length === 0 ? (
              <p>No test papers found.</p>
            ) : (
              <div className="card-grid">
                {filterByTags(testpapers).map((paper) => (
                  <div key={paper.id} className="glass-card">
                    <div className="card-header">
                      <p className="card-title">{paper.paperTitle || 'Untitled'}</p>
                      <button className="card-actions-toggle" onClick={(e) => toggleMenu(paper.id, 'testpaper', e)} aria-label="More actions">
                        <FiMoreVertical />
                      </button>
                      {openMenu.id === paper.id && openMenu.kind === 'testpaper' && (
                        <div className="card-actions-menu" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <button className="card-menu-item" onClick={(e) => { e.stopPropagation(); setRenameModal({ visible: true, id: paper.id, title: paper.paperTitle || '', isTestpaper: true, isMindmap: false }); }}>Rename</button>
                          <button className="card-menu-item" onClick={(e) => { e.stopPropagation(); openTagModal(paper.id, paper.tags || [], false, true); }}>Tag</button>
                          <button className="card-menu-item" onClick={(e) => { e.stopPropagation(); navigate(`/testpaperdetail/${user.uid}/${paper.id}`); }}>Edit</button>
                          <button className="card-menu-item" onClick={(e) => { e.stopPropagation(); navigate(`/testattemptsetup/${user.uid}/${paper.id}`); }}>Start Attempt</button>
                          <button className="card-menu-item" onClick={(e) => { e.stopPropagation(); navigate(`/testreview/${user.uid}/${paper.id}`, { state: { testpaper: paper } }); }}>Review</button>
                          <button className="card-menu-item" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ visible: true, id: paper.id, isTestpaper: true, isMindmap: false }); }}>Delete</button>
                        </div>
                      )}
                    </div>


                    <div className="tags-container">
                      {(paper.tags || []).map((tag, idx) => (
                        <span key={idx} className="tag-chip">
                          {tag}
                          <button
                            className="tag-remove-btn"
                            onClick={(e) => { e.stopPropagation(); handleRemoveTag(paper.id, tag, false, true); }}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {tagModal.visible && (
        <InputModal
          isOpen={tagModal.visible}
          title="Add Tag"
          placeholder="Enter tag keyword"
          value={newTag}
          onChange={setNewTag}
          onClose={() => setTagModal({ visible: false, id: '', tags: [], isMindmap: false, isTestpaper: false })}
          onSubmit={handleSaveTag}
          submitText="Save"
        >
          {filteredSuggestions.length > 0 && (
            <div className="autocomplete-popup-container" style={{ marginTop: '0.5rem' }}>
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
        </InputModal>
      )}
      {renameModal.visible && (
        <InputModal
          isOpen={renameModal.visible}
          title={
            renameModal.isMindmap
              ? 'Rename Mind Map'
              : renameModal.isTestpaper
                ? 'Rename Test Paper'
                : 'Rename Summary'
          }
          placeholder="New title"
          value={renameModal.title}
          onChange={(val) => setRenameModal(prev => ({ ...prev, title: val }))}
          onClose={() => setRenameModal({ visible: false, id: '', title: '', isMindmap: false, isTestpaper: false })}
          onSubmit={handleRename}
          submitText="Rename"
        />
      )}
      {deleteConfirm.visible && (
        <PopupModal
          message={
            deleteConfirm.isMindmap
              ? 'Are you sure you want to delete this mind map?'
              : deleteConfirm.isTestpaper
                ? 'Are you sure you want to delete this test paper?'
                : 'Are you sure you want to delete this summary?'
          }
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={cancelDelete}
          confirmText="Yes"
          cancelText="No"
        />
      )}
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
    </div>
  );
};

export default Dashboard;
