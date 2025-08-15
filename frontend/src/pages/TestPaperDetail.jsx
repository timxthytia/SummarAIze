import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestPaperDetail.css';
import PopupModal from '../components/PopupModal';
import { Document, Page, pdfjs } from 'react-pdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const truncate = (str) => {
  if (Array.isArray(str)) {
    str = str.join(', ');
  }
  return typeof str === 'string' && str.length > 5 ? str.slice(0, 5) + '...' : str;
};

const TestPaperDetail = () => {
  const { uid, id } = useParams();
  const navigate = useNavigate();
  const [testpaper, setTestpaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsByPage, setQuestionsByPage] = useState([]);
  const [newQuestion, setNewQuestion] = useState({ type: 'MCQ', questionNumber: '', marks: '', correctAnswer: '', options: '' });
  const [otherAnswerFile, setOtherAnswerFile] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [saveDisabled, setSaveDisabled] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMsg, setPopupMsg] = useState('');

  useEffect(() => {
    const fetchTestpaper = async () => {
      try {
        const docRef = doc(db, 'users', uid, 'testpapers', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTestpaper(docSnap.data());
          setQuestionsByPage(docSnap.data().questionsByPage || []);
        } else {
          alert('Test paper not found.');
          navigate('/dashboard');
        }
      } catch {
        alert('Failed to fetch test paper.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchTestpaper();
  }, [uid, id, navigate]);

  const isMCQFormValid = (question) => {
    if (!question.marks || isNaN(Number(question.marks)) || Number(question.marks) < 0) return false;
    if (question.type === 'MCQ') {
      if (!question.options || question.options.trim() === '') return false;
      if (!question.correctAnswer || question.correctAnswer.length === 0) return false;
      const options = question.options.split(',').map(opt => opt.trim().toUpperCase());
      const answers = question.correctAnswer.split(',').map(ans => ans.trim().toUpperCase()).filter(Boolean);
      return answers.every(ans => options.includes(ans));
    }
    if (question.type === 'Open-ended' && (!question.correctAnswer || question.correctAnswer.trim() === '')) return false;
    if (question.type === 'Other' && !question.correctAnswer && !otherAnswerFile) return false;
    return true;
  };

  const handleAddQuestion = async () => {
    if (!isMCQFormValid(newQuestion)) {
      alert("Please ensure all fields are filled and that MCQ answers match the listed options.");
      return;
    }
    const pageData = questionsByPage.find(p => p.page === currentPage) || { page: currentPage, questions: [] };
    const isEditing = editingQuestionId !== null;
    let newQ = { ...newQuestion, id: isEditing ? editingQuestionId : uuidv4(), marks: Number(newQuestion.marks) };
    if (newQ.type === 'MCQ') {
      newQ.options = (newQ.options || '').split(',').map((opt) => opt.trim().toUpperCase()).filter(Boolean);
      newQ.correctAnswer = (newQ.correctAnswer || '').split(',').map((ans) => ans.trim().toUpperCase()).filter(Boolean);
    }
    if (newQ.type === 'Other') {
      if (otherAnswerFile) {
        const storageRef = ref(getStorage(), `testpapers/${uid}/${id}/answers/${otherAnswerFile.name}`);
        await uploadBytes(storageRef, otherAnswerFile);
        const downloadURL = await getDownloadURL(storageRef);
        newQ.correctAnswer = { name: otherAnswerFile.name, url: downloadURL, id: uuidv4() };
      } else if (!isEditing) {
        newQ.correctAnswer = '';
      }
    }
    if (isEditing) {
      pageData.questions = pageData.questions.map(q => q.id === editingQuestionId ? newQ : q);
    } else {
      pageData.questions.push(newQ);
    }
    const updated = questionsByPage.filter(p => p.page !== currentPage).concat(pageData);
    setQuestionsByPage(updated);
    setNewQuestion({ type: 'MCQ', questionNumber: '', marks: '', correctAnswer: '', options: '' });
    setOtherAnswerFile(null);
    setEditingQuestionId(null);
    setShowAddQuestion(false);
  };

  const handleDeleteQuestion = (id) => {
    const updated = questionsByPage.map(p =>
      p.page === currentPage ? { ...p, questions: p.questions.filter(q => q.id !== id) } : p
    );
    setQuestionsByPage(updated);
  };

  const handleSaveChanges = async () => {
    setSaveDisabled(true);
    setPopupMsg('');
    // Change button label to 'Saving...'
    try {
      const docRef = doc(db, 'users', uid, 'testpapers', id);
      const transformedQuestionsByPage = questionsByPage.map(pageData => ({
        ...pageData,
        questions: pageData.questions.map(q => {
          if (q.type === 'MCQ') {
            return { ...q, options: q.options, correctAnswer: q.correctAnswer };
          }
          return q;
        }),
      }));
      await updateDoc(docRef, { questionsByPage: transformedQuestionsByPage });
      setPopupMsg('Your updates have been saved successfully.');
      setPopupOpen(true);
    } catch {
      setSaveDisabled(false);
      setPopupMsg('Failed to save changes. Please try again.');
      setPopupOpen(true);
    }
  };

  const isAddUpdateDisabled = () => {
    if (!newQuestion.marks || isNaN(Number(newQuestion.marks)) || Number(newQuestion.marks) < 0) return true;
    if (newQuestion.type === 'MCQ') {
      if (!newQuestion.options || newQuestion.options.trim() === '') return true;
      let correctStr = '';
      if (typeof newQuestion.correctAnswer === 'string') correctStr = newQuestion.correctAnswer;
      else if (Array.isArray(newQuestion.correctAnswer)) correctStr = newQuestion.correctAnswer.join(',');
      else correctStr = '';
      if (!correctStr || correctStr.length === 0) return true;
      const options = newQuestion.options.split(',').map(opt => opt.trim().toUpperCase());
      const answers = correctStr.split(',').map(ans => ans.trim().toUpperCase()).filter(Boolean);
      return !answers.every(ans => options.includes(ans));
    }
    if (newQuestion.type === 'Open-ended') {
      return !newQuestion.correctAnswer || (typeof newQuestion.correctAnswer === 'string' && newQuestion.correctAnswer.trim() === '');
    }
    if (newQuestion.type === 'Other') {
      return (!newQuestion.correctAnswer || typeof newQuestion.correctAnswer !== 'object') && !otherAnswerFile;
    }
    return false;
  };

  if (loading) {
    return (
      <>
        <NavbarLoggedin />
        <div className="loading-container">Loading test paper...</div>
      </>
    );
  }

  if (!testpaper) return null;

  return (
    <div className="paper-container">
      <NavbarLoggedin />
      <main></main>
      <h1 className='upload-title'>{testpaper.paperTitle || 'Untitled Test Paper'}</h1>
      <div className="file-view-section view-uploaded-paper-link">
        View Uploaded File:
        {testpaper.fileUrl && (
          <a
            href={testpaper.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="selected-filename"
          >
            {truncate(testpaper.fileName)}
          </a>
        )}
      </div>
      <div className="pdf-and-questions">
        <div className="pdf-viewer-section">
          <div className="pdf-viewer-container">
            <Document
              file={testpaper.fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div style={{ textAlign: 'center' }}>Loading PDF...</div>}
            >
              <Page
                pageNumber={currentPage}
                width={800}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </Document>
            <div className="pdf-nav">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="nav-btn">
                ←
              </button>
              <span>Page {currentPage} of {numPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, numPages))} disabled={currentPage === numPages} className="nav-btn">
                →
              </button>
            </div>
          </div>
        </div>
        <div className="questions-section">
          <div className="question-panel">
            <ul>
              {questionsByPage.find(p => p.page === currentPage)?.questions.map((q) => (
                <li key={q.id} className="question-list-item question-list-row">
                  <span className="question-type">
                    <strong>{q.questionNumber ? `${q.questionNumber}. ` : ''}{q.type}</strong>
                  </span>
                  <span className="question-marks">Marks: <span>{q.marks}</span></span>
                  <span className="question-answer-label">Correct Answer:</span>
                  <span className="question-answer-value">
                    {Array.isArray(q.correctAnswer)
                      ? <span className="open-ended-answer" title={q.correctAnswer.join(', ')}>{truncate(q.correctAnswer.join(', '))}</span>
                      : typeof q.correctAnswer === 'object' && q.correctAnswer?.url
                      ? <a href={q.correctAnswer.url} target="_blank" rel="noopener noreferrer" className="question-answer-link">{truncate(q.correctAnswer.name) || 'File'}</a>
                      : <span className="open-ended-answer" title={q.correctAnswer}>{truncate(q.correctAnswer)}</span>
                    }
                  </span>
                  <button 
                    className="icon-edit-button" 
                    aria-label="Edit"
                    onClick={() => {
                      setNewQuestion({
                        type: q.type || 'MCQ',
                        questionNumber: q.questionNumber || '',
                        marks: q.marks || '',
                        correctAnswer: q.correctAnswer || '',
                        options: Array.isArray(q.options) ? q.options.join(', ') : (q.options || '')
                      });
                      setEditingQuestionId(q.id);
                      setOtherAnswerFile(null);
                      setShowAddQuestion(true);
                    }}>
                    <svg width="28" height="28" fill="none" stroke="#43a047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                    </svg>
                  </button>
                  <button 
                    className="icon-delete-button" 
                    onClick={() => handleDeleteQuestion(q.id)}
                    aria-label="Delete"
                  >
                    <svg width="28" height="28" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="add-question-button"
              onClick={() => setShowAddQuestion(true)}
            >
              + Add Question
            </button>
            {showAddQuestion && (
              <div className="question-form popup-question-form">
                <h3>{editingQuestionId ? 'Update Question' : 'Add Question'}</h3>
                <div className="popup-form-group">
                  <label htmlFor="popup-question-number">Question Number</label>
                  <input
                    id="popup-question-number"
                    type="text"
                    placeholder="Enter question number"
                    value={newQuestion.questionNumber}
                    onChange={e => setNewQuestion({ ...newQuestion, questionNumber: e.target.value })}
                  />
                </div>
                <div className="popup-form-group">
                  <label htmlFor="popup-question-type">Question Type</label>
                  <select
                    id="popup-question-type"
                    value={newQuestion.type}
                    onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="Open-ended">Open-Ended</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="popup-form-group">
                  <label htmlFor="popup-marks">Marks</label>
                  <input
                    id="popup-marks"
                    type="number"
                    placeholder="Enter marks"
                    value={newQuestion.marks}
                    onChange={e => setNewQuestion({ ...newQuestion, marks: e.target.value })}
                  />
                </div>
                {newQuestion.type === 'MCQ' && (
                  <>
                    <div className="popup-form-group">
                      <label htmlFor="popup-options">Options <span style={{ fontWeight: 400, fontSize: '0.95em' }}>(comma-separated, e.g. A,B,C)</span></label>
                      <input
                        id="popup-options"
                        type="text"
                        placeholder="Enter options (comma-separated)"
                        value={newQuestion.options || ''}
                        onChange={e => setNewQuestion({ ...newQuestion, options: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="popup-form-group">
                      <label htmlFor="popup-correct-answer">Correct Answer(s) <span style={{ fontWeight: 400, fontSize: '0.95em' }}>(comma-separated if multiple)</span></label>
                      <input
                        id="popup-correct-answer"
                        type="text"
                        placeholder="Enter correct answer(s)"
                        value={newQuestion.correctAnswer || ''}
                        onChange={e => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </>
                )}
                {newQuestion.type === 'Other' && (
                  <div className="popup-form-group">
                    <label htmlFor="popup-other-answer-upload">
                      {editingQuestionId ? 'Update Answer File:' : 'Upload Answer File:'}
                    </label>
                    <label htmlFor="popup-other-answer-upload" className="choose-file-btn">
                      Choose File
                      <input
                        id="popup-other-answer-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={e => setOtherAnswerFile(e.target.files[0])}
                      />
                    </label>
                    {otherAnswerFile && (
                      <a
                        className="selected-filename"
                        href={
                          otherAnswerFile instanceof File
                            ? URL.createObjectURL(otherAnswerFile)
                            : otherAnswerFile.url || '#'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {truncate(otherAnswerFile.name) || (typeof otherAnswerFile === "string" ? otherAnswerFile : "Answer File")}
                      </a>
                    )}
                  </div>
                )}
                {newQuestion.type === 'Open-ended' && (
                  <div className="popup-form-group">
                    <label htmlFor="popup-open-ended-answer">Correct Answer</label>
                    <input
                      id="popup-open-ended-answer"
                      type="text"
                      placeholder="Enter correct answer"
                      value={newQuestion.correctAnswer}
                      onChange={e => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    />
                  </div>
                )}
                <div className="popup-form-actions">
                  <button
                    onClick={handleAddQuestion}
                    disabled={isAddUpdateDisabled()}
                    className={`popup-form-button ${isAddUpdateDisabled() ? 'disabled' : ''}`}
                  >
                    {editingQuestionId ? 'Update' : 'Add'}
                  </button>
                  <button
                    type="button"
                    className="popup-form-button"
                    onClick={() => {
                      setNewQuestion({ type: 'MCQ', questionNumber: '', marks: '', correctAnswer: '', options: '' });
                      setEditingQuestionId(null);
                      setOtherAnswerFile(null);
                      setShowAddQuestion(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="save-button-wrapper">
        <button
          className={`save-buttonn${saveDisabled ? ' disabled' : ''}`}
          onClick={handleSaveChanges}
          disabled={saveDisabled}
        >
          {popupMsg === '' && saveDisabled ? 'Saving...' : saveDisabled ? 'Saved' : 'Save Changes'}
        </button>
      </div>
      {popupOpen && (
        <PopupModal
          message={popupMsg}
          confirmText="OK"
          onConfirm={() => {
            setPopupOpen(false);
            setSaveDisabled(false);
            setPopupMsg(''); 
          }}
        />
      )}
    </div>
  );
};

export default TestPaperDetail;
