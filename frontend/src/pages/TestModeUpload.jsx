import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestModeUpload.css';
import axios from 'axios';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const WORDS_PER_PAGE = 500;

const TestModeUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null);
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
    multipleCorrect: false,
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
    setFileType(null);
    setPdfData(null);
    setCurrentPage(1);
    setNumPages(0);

    if (!file) {
      return;
    }

    const type = file.type;
    setFileType(type);

    if (type === 'application/pdf') {
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
    } else if (
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${import.meta.env.VITE_API_URL}/convert-docx-to-pdf`, formData, {
          responseType: 'blob',
        });

        const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        setPdfData(pdfUrl);
        setSelectedFile(file);
        setCurrentPage(1);
        setNumPages(0);
      } catch (err) {
        console.error(err);
        setError('Failed to convert DOCX to PDF.');
      }
    } else {
      setError('Unsupported file type. Please upload PDF or DOCX.');
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
      multipleCorrect: false,
    });
    setShowQuestionForm(true);
  };

  const closeQuestionForm = () => {
    setShowQuestionForm(false);
  };

  const isFormValid = () => {
    if (!questionFormData.marks || isNaN(Number(questionFormData.marks)) || Number(questionFormData.marks) < 0) {
      return false;
    }
    if (questionFormData.type === 'MCQ' && !questionFormData.correctAnswer.trim()) {
      return false;
    }
    if (questionFormData.type === 'Open-ended' && !questionFormData.correctAnswer.trim()) {
      return false;
    }
    if (questionFormData.type === 'Other' && !questionFormData.correctAnswerFile) {
      return false;
    }
    return true;
  };

  const parseCorrectAnswer = (data) => {
    if (data.type === 'MCQ') {
      return data.multipleCorrect
        ? data.correctAnswer.split(',').map((a) => a.trim().toUpperCase())
        : data.correctAnswer.trim().toUpperCase();
    }
    if (data.type === 'Open-ended') {
      return data.correctAnswer.trim();
    }
    if (data.type === 'Other') {
      return data.correctAnswerFile;
    }
  };

  const handleSaveQuestion = () => {
    if (!isFormValid()) return;

    setQuestionsByPage((prev) => {
      const pageQuestions = prev[currentPage] || [];
      let newQuestions;
      if (questionFormData.id) {
        // edit existing
        newQuestions = pageQuestions.map((q) =>
          q.id === questionFormData.id
            ? { ...questionFormData, correctAnswer: parseCorrectAnswer(questionFormData) }
            : q
        );
      } else {
        // add new
        newQuestions = [
          ...pageQuestions,
          { ...questionFormData, id: uuidv4(), correctAnswer: parseCorrectAnswer(questionFormData) },
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
      multipleCorrect: Array.isArray(question.correctAnswer),
      correctAnswer: Array.isArray(question.correctAnswer)
        ? question.correctAnswer.join(',')
        : question.correctAnswer,
      correctAnswerFile: question.correctAnswerFile || null,
    });
    setShowQuestionForm(true);
  };

  // Submit test paper to Firestore
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
      // Upload the test paper file to Firebase Storage
      const fileRef = ref(storage, `testpapers/${user.uid}/${paperId}/${selectedFile.name}`);
      await uploadBytes(fileRef, selectedFile);
      fileUrl = await getDownloadURL(fileRef);
      setFileUrl(fileUrl);
    } catch (err) {
      console.error("Error uploading test paper file:", err);
      setError("Failed to upload test paper file.");
      return;
    }

    try {
      // Map and upload "Other" type answers if needed
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
                  console.error("Error uploading answer file:", err);
                  setError("Failed to upload answer file.");
                  throw err;
                }
              }
              return {
                id: q.id,
                type: q.type,
                questionNumber: q.questionNumber || '',
                marks: q.marks,
                correctAnswer,
                multipleCorrect: q.multipleCorrect || false,
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
      console.error("Error submitting test paper:", err);
      setError("Failed to submit test paper to Firestore.");
    }
  };

  return (
    <div className="upload-container">
      <NavbarLoggedin />
      <main></main>
      <div className="upload-card">
        <h1 className="upload-title">Upload Past-Year Test Paper</h1>

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
          <label>Upload PDF/DOCX:</label><br />
          <label className="custom-file-upload">
            Choose File
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
          </label>
          {selectedFile && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>
              {selectedFile.name}
            </div>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}

        {selectedFile && pdfData && (
          <div>
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('PDF load error:', error);
                setError('Failed to load PDF file.');
              }}
              loading="Loading PDF..."
              error="Failed to load PDF."
            >
              <Page pageNumber={currentPage} />
            </Document>
            <div>
              <button onClick={goToPreviousPage} disabled={currentPage <= 1}>
                Previous
              </button>
              <span style={{ margin: '0 1rem' }}>
                Page {currentPage} of {numPages}
              </span>
              <button onClick={goToNextPage} disabled={currentPage >= numPages}>
                Next
              </button>
            </div>

            <div className="question-panel">
              <h3>Questions on Page {currentPage}</h3>
              {(questionsByPage[currentPage] || []).length === 0 && (
                <p>No questions added for this page.</p>
              )}
              <ul>
                {(questionsByPage[currentPage] || []).map((q) => (
                  <li key={q.id}>
                    <strong>{q.questionNumber}</strong>. {q.type} — Marks: {q.marks} — Correct Answer{q.multipleCorrect ? 's' : ''}:&nbsp;
                    {q.type === 'Other' ? (
                      q.correctAnswer?.url ? (
                        <a
                          href={q.correctAnswer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#81d4fa',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          {q.correctAnswer.name || 'PDF/DOCX file'}
                        </a>
                      ) : q.correctAnswer instanceof File ? (
                        <a
                          href={URL.createObjectURL(q.correctAnswer)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#81d4fa',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          {q.correctAnswer.name}
                        </a>
                      ) : (
                        <span style={{ color: '#ccc', fontStyle: 'italic' }}>
                          {q.correctAnswer?.name || 'PDF/DOCX file (not uploaded)'}
                        </span>
                      )
                    ) : (
                      <span
                        className="open-ended-answer"
                        title={Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                      >
                        {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteQuestion(currentPage, q.id)}
                      className="delete-question-button"
                      aria-label="Delete question"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleEditQuestion(currentPage, q)}
                      className="edit-question-button"
                      aria-label="Edit question"
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => openQuestionForm()} className="add-question-button">
                + Add Question
              </button>

              {showQuestionForm && (
                <div
                  className="question-form"
                >
                  <h4>{questionFormData.id ? 'Edit Question' : 'New Question'}</h4>

                  <label>
                    Question Number (e.g. 2a, 3bii):
                    <input
                      type="text"
                      value={questionFormData.questionNumber}
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
                          multipleCorrect: false,
                        }))
                      }
                    >
                      <option value="MCQ">MCQ</option>
                      <option value="Open-ended">Open-ended</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <br />

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
                      <label>
                        <input
                          type="checkbox"
                          checked={questionFormData.multipleCorrect}
                          onChange={(e) =>
                            setQuestionFormData((prev) => ({
                              ...prev,
                              multipleCorrect: e.target.checked,
                            }))
                          }
                        />
                        Multiple correct options
                      </label>
                    </>
                  )}

                  {(questionFormData.type === 'Open-ended') && (
                    <label>
                      Correct Answer:
                      <input
                        type="text"
                        value={questionFormData.correctAnswer}
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
                        <span className="selected-filename">{questionFormData.correctAnswerFile.name}</span>
                      )}
                    </div>
                  )}

                  <div>
                    <button onClick={handleSaveQuestion} disabled={!isFormValid()}>
                      Save Question
                    </button>
                    <button onClick={closeQuestionForm}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Submit Test Paper Button */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={handleSubmitTestPaper} className="submit-testpaper-button">
            Submit Test Paper
          </button>
        </div>
        {fileUrl && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4fc3f7', textDecoration: 'underline' }}
            >
              View Uploaded Test Paper
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestModeUpload;
