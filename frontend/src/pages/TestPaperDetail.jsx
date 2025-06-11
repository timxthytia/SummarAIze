import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestPaperDetail.css';
import { Document, Page, pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

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
      } catch (error) {
        console.error('Error fetching test paper:', error);
        alert('Failed to fetch test paper.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchTestpaper();
  }, [uid, id, navigate]);

  // Validation for MCQ correct answers matching options
  const isMCQFormValid = (question) => {
    if (!question.marks || isNaN(Number(question.marks)) || Number(question.marks) < 0) return false;
    if (question.type === 'MCQ') {
      if (!question.options || question.options.trim() === '') return false;
      if (!question.correctAnswer || question.correctAnswer.length === 0) return false;

      const options = question.options
        .split(',')
        .map(opt => opt.trim().toUpperCase());

      const answers = question.correctAnswer
        .split(',')
        .map(ans => ans.trim().toUpperCase())
        .filter(Boolean);

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
    let newQ = { ...newQuestion, id: isEditing ? editingQuestionId : uuidv4() };

    if (newQ.type === 'MCQ') {
      newQ.options = (newQ.options || '')
        .split(',')
        .map((opt) => opt.trim().toUpperCase())
        .filter(Boolean);
      newQ.correctAnswer = (newQ.correctAnswer || '')
        .split(',')
        .map((ans) => ans.trim().toUpperCase())
        .filter(Boolean);
    }

    if (newQ.type === 'Other') {
      if (otherAnswerFile) {
        const storageRef = ref(
          getStorage(),
          `testpapers/${uid}/${id}/answers/${otherAnswerFile.name}`
        );
        await uploadBytes(storageRef, otherAnswerFile);
        const downloadURL = await getDownloadURL(storageRef);
        newQ.correctAnswer = {
          name: otherAnswerFile.name,
          url: downloadURL,
          id: uuidv4(),
        };
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
    try {
      const docRef = doc(db, 'users', uid, 'testpapers', id);
      const transformedQuestionsByPage = questionsByPage.map(pageData => {
        return {
          ...pageData,
          questions: pageData.questions.map(q => {
            if (q.type === 'MCQ') {
              return {
                ...q,
                options: q.options,
                correctAnswer: q.correctAnswer,
              };
            }
            return q;
          }),
        };
      });
      await updateDoc(docRef, { questionsByPage: transformedQuestionsByPage });
      alert('Changes saved.');
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes.');
    }
  };

  const isAddUpdateDisabled = () => {
    if (!newQuestion.marks || isNaN(Number(newQuestion.marks)) || Number(newQuestion.marks) < 0) return true;
    if (newQuestion.type === 'MCQ') {
      if (!newQuestion.options || newQuestion.options.trim() === '') return true;
      if (!newQuestion.correctAnswer || (Array.isArray(newQuestion.correctAnswer) && newQuestion.correctAnswer.length === 0)) return true;

      const options = newQuestion.options
        .split(',')
        .map(opt => opt.trim().toUpperCase());

      const correct = typeof newQuestion.correctAnswer === 'string' ? newQuestion.correctAnswer : '';
      const answers = correct
        .split(',')
        .map(ans => ans.trim().toUpperCase())
        .filter(Boolean);

      return !answers.every(ans => options.includes(ans));
    }
    if (newQuestion.type === 'Open-ended') {
      return !newQuestion.correctAnswer || newQuestion.correctAnswer.trim() === '';
    }
    if (newQuestion.type === 'Other') {
      return !newQuestion.correctAnswer && !otherAnswerFile;
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

  if (!testpaper) {
    return null;
  }

  return (
    <>
      <NavbarLoggedin />
      <main>
        <div className="paper-container">
          <h1>{testpaper.paperTitle || 'Untitled Test Paper'}</h1>
          <div className="pdf-wrapper">
            <Document
              file={testpaper.fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div style={{ textAlign: 'center' }}>Loading PDF...</div>}
            >
              <Page pageNumber={currentPage} />
            </Document>
          </div>

          <div className="pdf-controls">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              Previous
            </button>
            <span>
              Page {currentPage} of {numPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, numPages))} disabled={currentPage === numPages}>
              Next
            </button>
          </div>

          <div className="question-panel">
            <h2 className="question-header">Questions on Page {currentPage}</h2>
            <ul className="question-list">
              {questionsByPage.find(p => p.page === currentPage)?.questions.map((q) => (
                <li key={q.id} style={{ marginBottom: '0.5rem' }}>
                  <strong>{q.questionNumber ? `${q.questionNumber}. ` : ''}{q.type}</strong> — Marks: {q.marks} — Correct Answer: &nbsp;
                  {(() => {
                    if (Array.isArray(q.correctAnswer)) {
                      return q.correctAnswer.join(', ');
                    } else if (typeof q.correctAnswer === 'object' && q.correctAnswer?.url) {
                      return (
                        <a
                          href={q.correctAnswer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#81d4fa' }}
                        >
                          {q.correctAnswer.name || 'PDF/DOCX file'}
                        </a>
                      );
                    } else {
                      return (
                        <span
                          className="open-ended-answer"
                          title={q.correctAnswer}
                        >
                          {q.correctAnswer}
                        </span>
                      );
                    }
                  })()}
                  <button
                    className="edit-button"
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
                    }}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDeleteQuestion(q.id)} style={{ marginLeft: '1rem' }}>Delete</button>
                </li>
              ))}
            </ul>
          </div>

          {showAddQuestion ? (
            <div className="question-form">
              <h3>{editingQuestionId ? 'Update Question' : 'Add Question'}</h3>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Question Number (e.g. 2a, 3bii)"
                  value={newQuestion.questionNumber}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionNumber: e.target.value })}
                />
                <select value={newQuestion.type} onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}>
                  <option value="MCQ">MCQ</option>
                  <option value="Open-ended">Open-Ended</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="number"
                  placeholder="Marks"
                  value={newQuestion.marks}
                  onChange={(e) => setNewQuestion({ ...newQuestion, marks: e.target.value })}
                />
                {newQuestion.type === 'MCQ' ? (
                  <>
                    <input
                      type="text"
                      placeholder="MCQ options, comma-separated"
                      value={newQuestion.options || ''}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, options: e.target.value.toUpperCase() })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Correct option(s), comma-separated"
                      value={newQuestion.correctAnswer || ''}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, correctAnswer: e.target.value.toUpperCase() })
                      }
                    />
                  </>
                ) : newQuestion.type === 'Other' ? (
                  <div className="file-upload-wrapper">
                    <label htmlFor="other-answer-upload">
                      {editingQuestionId ? 'Update Correct Answer (PDF/DOCX):' : 'Upload Correct Answer File (PDF/DOCX):'}
                    </label>
                    <label className="custom-file-upload">
                      Choose File
                      <input
                        id="other-answer-upload"
                        type="file"
                        accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => setOtherAnswerFile(e.target.files[0])}
                      />
                    </label>
                    {otherAnswerFile && (
                      <span className="selected-filename">{otherAnswerFile.name}</span>
                    )}
                    {otherAnswerFile && (
                      <div className="file-preview">
                        <a
                          href={URL.createObjectURL(otherAnswerFile)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#81d4fa', textDecoration: 'underline', fontStyle: 'italic' }}
                        >
                          Preview Uploaded File
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Correct answer"
                    value={newQuestion.correctAnswer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                  />
                )}
                <button
                  onClick={handleAddQuestion}
                  disabled={isAddUpdateDisabled()}
                  className={`submit-button ${isAddUpdateDisabled() ? 'disabled' : ''}`}
                >
                  {editingQuestionId ? 'Update' : 'Add'}
                </button>
                {editingQuestionId || showAddQuestion ? (
                  <button
                    type="button"
                    className="cancel-edit-button"
                    onClick={() => {
                      setNewQuestion({ type: 'MCQ', questionNumber: '', marks: '', correctAnswer: '', options: '' });
                      setEditingQuestionId(null);
                      setOtherAnswerFile(null);
                      setShowAddQuestion(false);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <button
              className="add-question-toggle"
              onClick={() => setShowAddQuestion(true)}
            >
              Add Question
            </button>
          )}
          <button className="save-button" onClick={handleSaveChanges}>Save Changes</button>
        </div>
      </main>
    </>
  );
};

export default TestPaperDetail;