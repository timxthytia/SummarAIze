import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import "../styles/TextLayer.css";
import "../styles/AnnotationLayer.css";
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestModeUpload.css';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const parseCorrectAnswer = (data) => {
  if (data.type === 'MCQ') {
    return data.correctAnswer
      .split(',')
      .map((a) => a.trim().toUpperCase());
  }
  if (data.type === 'Open-ended') {
    return data.correctAnswer.trim();
  }
  if (data.type === 'Other') {
    return data.correctAnswerFile;
  }
};

const truncate = (str) => {
  if (Array.isArray(str)) {
    str = str.join(', ');
  }
  return typeof str === 'string' && str.length > 5 ? str.slice(0, 5) + '...' : str;
};

export const isFormValid = (question) => {
  if (!question.marks || isNaN(Number(question.marks)) || Number(question.marks) < 0) {
    return false;
  }
  if (question.type === 'MCQ') {
    if (!question.options || question.options.trim() === '') return false;
    if (!question.correctAnswer || question.correctAnswer.length === 0) return false;
    const options = question.options.split(',').map(opt => opt.trim().toUpperCase());
    const answers = question.correctAnswer.split(',').map(ans => ans.trim().toUpperCase()).filter(Boolean);
    const allAnswersValid = answers.every(ans => options.includes(ans));
    if (!allAnswersValid) return false;
  }
  if (question.type === 'Open-ended' && (!question.correctAnswer || question.correctAnswer.trim() === '')) {
    return false;
  }
  if (question.type === 'Other' && !question.correctAnswerFile) {
    return false;
  }
  return true;
};

const TestModeUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [paperTitle, setPaperTitle] = useState('');
  const [questionsByPage, setQuestionsByPage] = useState({});
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionFormData, setQuestionFormData] = useState({
    id: null,
    questionNumber: '',
    type: 'MCQ',
    marks: '',
    correctAnswer: '',
    correctAnswerFile: null,
    options: '',
  });
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setError('');
    setQuestionsByPage({});
    setFileUrl('');
    setSelectedFile(null);
    setPdfData(null);
    setCurrentPage(1);
    setNumPages(0);

    if (!file) return;

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        setPdfData(arrayBuffer);
        setSelectedFile(file);
      };
      reader.onerror = () => {
        setError('Failed to read PDF file.');
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Unsupported file type. Please upload a PDF.');
    }
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const openQuestionForm = () => {
    setQuestionFormData({
      id: null,
      questionNumber: '',
      type: 'MCQ',
      marks: '',
      correctAnswer: '',
      correctAnswerFile: null,
      options: '',
    });
    setShowQuestionForm(true);
  };

  const closeQuestionForm = () => {
    setShowQuestionForm(false);
  };



  const handleSaveQuestion = () => {
    if (!isFormValid(questionFormData)) return;

    setQuestionsByPage((prev) => {
      const pageQuestions = prev[currentPage] || [];
      let newQuestions;
      if (questionFormData.id) {
        newQuestions = pageQuestions.map((q) =>
          q.id === questionFormData.id
            ? {
                ...questionFormData,
                marks: Number(questionFormData.marks),
                correctAnswer: parseCorrectAnswer(questionFormData),
                options:
                  questionFormData.type === 'MCQ'
                    ? questionFormData.options?.split(',').map(opt => opt.trim().toUpperCase())
                    : undefined,
              }
            : q
        );
      } else {
        newQuestions = [
          ...pageQuestions,
          {
            ...questionFormData,
            id: uuidv4(),
            marks: Number(questionFormData.marks),
            correctAnswer: parseCorrectAnswer(questionFormData),
            options:
              questionFormData.type === 'MCQ'
                ? questionFormData.options?.split(',').map(opt => opt.trim().toUpperCase())
                : undefined,
          },
        ];
      }
      return { ...prev, [currentPage]: newQuestions };
    });
    setShowQuestionForm(false);
  };

  const handleDeleteQuestion = (page, id) => {
    setQuestionsByPage((prev) => {
      const pageQuestions = prev[page] || [];
      const filtered = pageQuestions.filter((q) => q.id !== id);
      return { ...prev, [page]: filtered };
    });
  };

  const handleEditQuestion = (page, question) => {
    setQuestionFormData({
      ...question,
      questionNumber: question.questionNumber || '',
      correctAnswer: Array.isArray(question.correctAnswer)
        ? question.correctAnswer.join(',')
        : question.correctAnswer,
      correctAnswerFile: question.correctAnswerFile || null,
      options: Array.isArray(question.options) ? question.options.join(',') : (question.options || ''),
    });
    setShowQuestionForm(true);
  };

  const handleSubmitTestPaper = async () => {
    if (!paperTitle.trim() || !pdfData || !user) {
      setError("Missing paper title, PDF data, or user not logged in.");
      return;
    }

    const paperId = uuidv4();
    const testPaperRef = doc(collection(db, "users", user.uid, "testpapers"), paperId);
    const storage = getStorage();

    let fileUrl = "";
    try {
      const fileRef = ref(storage, `testpapers/${user.uid}/${paperId}/${selectedFile.name}`);
      await uploadBytes(fileRef, selectedFile);
      fileUrl = await getDownloadURL(fileRef);
      setFileUrl(fileUrl);
    } catch (err) {
      setError("Failed to upload test paper file.");
      return;
    }

    try {
      const questions = await Promise.all(
        Object.entries(questionsByPage).map(async ([page, questionList]) => {
          const resolvedQuestions = await Promise.all(
            questionList.map(async (q) => {
              let correctAnswer = q.correctAnswer;
              if (q.type === "Other" && q.correctAnswer instanceof File) {
                try {
                  const answerRef = ref(
                    storage,
                    `testpapers/${user.uid}/${paperId}/answers/${q.correctAnswer.name}`
                  );
                  await uploadBytes(answerRef, q.correctAnswer);
                  const url = await getDownloadURL(answerRef);
                  correctAnswer = {
                    name: q.correctAnswer.name,
                    url,
                  };
                } catch (err) {
                  setError("Failed to upload answer file.");
                  throw err;
                }
              }
              return {
                id: q.id,
                type: q.type,
                questionNumber: q.questionNumber || '',
                marks: Number(q.marks),
                correctAnswer:
                  q.type === 'MCQ'
                    ? (typeof q.correctAnswer === 'string'
                        ? q.correctAnswer.split(',').map((a) => a.trim().toUpperCase())
                        : q.correctAnswer)
                    : correctAnswer,
                options:
                  q.type === 'MCQ'
                    ? (typeof q.options === 'string'
                        ? q.options.split(',').map((a) => a.trim().toUpperCase())
                        : q.options)
                    : q.options || [],
              };
            })
          );
          return {
            page: Number(page),
            questions: resolvedQuestions,
          };
        })
      );

      await setDoc(testPaperRef, {
        paperTitle,
        uploadedAt: new Date().toISOString(),
        numPages,
        fileName: selectedFile.name,
        fileUrl,
        questionsByPage: questions,
      });
      alert("Test paper submitted successfully!");
    } catch (err) {
      setError("Failed to submit test paper to Firestore.");
    }
  };

  return (
    <div className="upload-container">
      <NavbarLoggedin />
      <main></main>
      <div className="upload-card">
        <h1 className="upload-title">Upload Test Paper</h1>
        <div className="title-input-section">
          <label htmlFor="paperTitle">Test Paper Title:</label>
          <input
            id="paperTitle"
            type="text"
            placeholder="Enter test paper title"
            value={paperTitle}
            onChange={(e) => setPaperTitle(e.target.value)}
            required
          />
        </div>
        <div className="file-upload-section">
          <label>Upload PDF:</label><br />
          <label className="custom-file-upload">
            Choose File
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
            />
          </label>
          {selectedFile && (
            <a
              className="selected-filename"
              href={URL.createObjectURL(selectedFile)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1976d2', textDecoration: 'underline' }}
            >
              {truncate(selectedFile.name)}
            </a>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}
        
        <div className="submit-testpaper-container">
          <button onClick={handleSubmitTestPaper} className="submit-testpaper-button">
            Upload Test Paper
          </button>
        </div>
        {fileUrl && (
          <div className="view-uploaded-paper-link">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1976d2', textDecoration: 'underline' }}
            >
              {selectedFile ? truncate(selectedFile.name) : 'View Uploaded Test Paper'}
            </a>
          </div>
        )}
      </div>
      {selectedFile && pdfData && (
        <div className="pdf-and-questions">
          <div className="pdf-viewer-section">
            <div className="pdf-viewer-container">
              <Document
                file={pdfData}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={() => setError('Failed to load PDF file.')}
                loading="Loading PDF..."
                error="Failed to load PDF."
              >
                <Page
                  pageNumber={currentPage}
                  width={800}
                  className="pdf-page"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
              <div className="pdf-nav">
                <button onClick={goToPreviousPage} disabled={currentPage <= 1} className="nav-btn">
                  ←
                </button>
                <span>
                  Page {currentPage} of {numPages}
                </span>
                <button onClick={goToNextPage} disabled={currentPage >= numPages} className="nav-btn">
                  → 
                </button>
              </div>
            </div>
          </div>
          <div className="questions-section">
            <div className="question-panel">
              <ul>
                {(questionsByPage[currentPage] || []).map((q) => (
                  <li key={q.id} className="question-list-item question-list-row">
                    <span className="question-type"><strong>{q.questionNumber}.</strong> {q.type}</span>
                    <span className="question-marks">Marks: <span>{q.marks}</span></span>
                    <span className="question-answer-label">Correct Answer: </span>
                    <span className="question-answer-value">
                      {q.type === 'Other' ? (
                        q.correctAnswer?.url ? (
                          <a
                            href={q.correctAnswer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="question-answer-link"
                          >
                            {truncate(q.correctAnswer.name) || 'PDF/DOCX file'}
                          </a>
                        ) : q.correctAnswer instanceof File ? (
                          <a
                            href={URL.createObjectURL(q.correctAnswer)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="question-answer-link"
                          >
                            {truncate(q.correctAnswer.name)}
                          </a>
                        ) : (
                          <span className="fallback-answer">
                            {truncate(q.correctAnswer?.name) || 'PDF/DOCX file (not uploaded)'}
                          </span>
                        )
                      ) : (
                        <span
                          className="open-ended-answer"
                          title={Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                        >
                          {truncate(Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer)}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => handleEditQuestion(currentPage, q)}
                      className="icon-edit-button"
                      aria-label="Edit"
                    >
                      <svg width="28" height="28" fill="none" stroke="#43a047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(currentPage, q.id)}
                      className="icon-delete-button"
                      aria-label="Delete"
                    >
                      <svg width="28" height="28" fill="none" stroke="#e53935" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => openQuestionForm()} className="add-question-button">
                + Add Question
              </button>
              {showQuestionForm && (
                <div className="question-form popup-question-form">
                  <h3>{questionFormData.id ? 'Edit Question' : 'Add Question'}</h3>
                  <label>
                    Question Number:
                    <input
                      type="text"
                      value={questionFormData.questionNumber}
                      placeholder='(e.g. 2a, 3bii)'
                      onChange={(e) =>
                        setQuestionFormData((prev) => ({ ...prev, questionNumber: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Question Type:
                    <select
                      value={questionFormData.type}
                      onChange={(e) =>
                        setQuestionFormData((prev) => ({
                          ...prev,
                          type: e.target.value,
                          correctAnswer: '',
                          correctAnswerFile: null,
                        }))
                      }
                    >
                      <option value="MCQ">MCQ</option>
                      <option value="Open-ended">Open-ended</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label>
                    Marks:
                    <input
                      type="number"
                      min="0"
                      value={questionFormData.marks}
                      onChange={(e) =>
                        setQuestionFormData((prev) => ({ ...prev, marks: e.target.value }))
                      }
                    />
                  </label>
                  {questionFormData.type === 'MCQ' && (
                    <>
                      <label>
                        MCQ Options (comma-separated):
                        <input
                          type="text"
                          placeholder="E.g. A,B,C,D or 1,2,3,4 or True,False"
                          value={questionFormData.options || ''}
                          onChange={(e) =>
                            setQuestionFormData((prev) => ({
                              ...prev,
                              options: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Correct Answer(s) (comma-separated):
                        <input
                          type="text"
                          placeholder="E.g. A,B"
                          value={questionFormData.correctAnswer}
                          onChange={(e) =>
                            setQuestionFormData((prev) => ({
                              ...prev,
                              correctAnswer: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                      </label>
                    </>
                  )}
                  {(questionFormData.type === 'Open-ended') && (
                    <label>
                      Correct Answer:
                      <input
                        type="text"
                        value={questionFormData.correctAnswer}
                        placeholder='Enter the correct answer'
                        onChange={(e) =>
                          setQuestionFormData((prev) => ({ ...prev, correctAnswer: e.target.value }))
                        }
                      />
                    </label>
                  )}
                  {questionFormData.type === 'Other' && (
                    <div className="file-upload-wrapper">
                      <label htmlFor="correctAnswerFile">Upload Correct Answer File (PDF/DOCX):</label>
                      <label className="custom-file-upload">
                        Choose File
                        <input
                          id="correctAnswerFile"
                          type="file"
                          accept=".pdf,.docx"
                          onChange={(e) =>
                            setQuestionFormData((prev) => ({ ...prev, correctAnswerFile: e.target.files[0] }))
                          }
                        />
                      </label>
                      {questionFormData.correctAnswerFile && (
                        <a
                          className="selected-filename"
                          href={questionFormData.correctAnswerFile instanceof File
                            ? URL.createObjectURL(questionFormData.correctAnswerFile)
                            : questionFormData.correctAnswerFile.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {truncate(questionFormData.correctAnswerFile.name) || (typeof questionFormData.correctAnswerFile === "string" ? questionFormData.correctAnswerFile : "Answer File")}
                        </a>
                      )}
                    </div>
                  )}
                  <div className="form-actions">
                    <button
                      onClick={handleSaveQuestion}
                      disabled={!isFormValid(questionFormData)}
                      className="popup-form-button"
                    >
                      Add
                    </button>
                    <button
                      onClick={closeQuestionForm}
                      className="popup-form-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestModeUpload;
