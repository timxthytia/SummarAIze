import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestAttempt.css';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const formatTimeTaken = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
};

const TestAttempt = () => {
  const { uid, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const duration = location.state?.duration || 60;
  const [testpaper, setTestpaper] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState({});
  const answersRef = useRef({});
  const objectURLsRef = useRef({});
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [timerActive, setTimerActive] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitTimeTaken, setSubmitTimeTaken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showTimeExpiredPopup, setShowTimeExpiredPopup] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    const fetchTestpaper = async () => {
      try {
        const docRef = doc(db, 'users', uid, 'testpapers', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTestpaper(docSnap.data());
        } else {
          alert('Test paper not found.');
          navigate('/dashboard');
        }
      } catch (error) {
        alert('Failed to load test.');
        navigate('/dashboard');
      }
    };
    fetchTestpaper();
  }, [uid, id, navigate]);

  useEffect(() => {
    if (!timerActive) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerActive(false);
          setShowTimeExpiredPopup(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(intervalRef.current);
    };
  }, [timerActive]);

  const handleChange = (questionId, value) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: value };
      answersRef.current = newAnswers;
      return newAnswers;
    });
  };

  // Local file select handler for Other questions
  const handleLocalFileSelect = (questionId, file) => {
    if (!file) return;
    // Revoke previous object URL for this question if it exists
    const prevUrl = objectURLsRef.current[questionId];
    if (prevUrl) {
      try { URL.revokeObjectURL(prevUrl); } catch (_) {}
    }
    const previewUrl = URL.createObjectURL(file);
    objectURLsRef.current[questionId] = previewUrl;
    const value = { name: file.name, file, previewUrl };
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: value };
      answersRef.current = newAnswers;
      return newAnswers;
    });
  };

  // Cleanup for object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(objectURLsRef.current).forEach((u) => {
        try { URL.revokeObjectURL(u); } catch (_) {}
      });
    };
  }, []);

  const submitAttempt = async () => {
    if (submitting) return;
    setSubmitting(true);
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    try {
      setTimerActive(false);
      const attemptRef = collection(db, 'users', uid, 'testpapers', id, 'attempts');
      const newAttempt = doc(attemptRef);
      const attemptId = newAttempt.id;
      const processedAnswers = {};
      for (const q of testpaper?.questionsByPage?.flatMap(p => p.questions) || []) {
        const answer = answersRef.current[q.id];
        if (answer === undefined) continue;
        if (q.type === 'Other') {
          if (answer && typeof answer === 'object' && answer.url) {
            processedAnswers[q.id] = { name: answer.name, url: answer.url };
          } else if (answer && typeof answer === 'object' && answer.file instanceof File) {
            const storageRef = ref(storage, `testpapers/${uid}/${id}/attempts/${attemptId}/answers/${q.id}/${answer.file.name}`);
            await uploadBytes(storageRef, answer.file);
            const url = await getDownloadURL(storageRef);
            processedAnswers[q.id] = { name: answer.file.name, url };
          } else {
            processedAnswers[q.id] = answer;
          }
        } else {
          processedAnswers[q.id] = answer;
        }
      }
      const attemptData = {
        answers: processedAnswers,
        timeTaken,
        graded: false,
        timestamp: serverTimestamp(),
      };
      await setDoc(newAttempt, attemptData);
      navigate(`/testattempt/${uid}/${id}/${attemptId}/grade`, {
        state: {
          answers: processedAnswers,
          timeTaken,
          attemptId,
          testpaper,
        },
      });
      setSubmitting(false);
    } catch (err) {
      alert('Failed to submit test.');
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    setSubmitTimeTaken(timeTaken);
    setShowSubmitConfirm(true);
  };

  const pageQuestions = testpaper?.questionsByPage?.find(p => p.page === currentPage)?.questions || [];

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="upload-container">
      <NavbarLoggedin />
      <main></main>
      {/* Timer and paper title above pdf-and-questions */}
      <div className="timer-title-row">
        <div
          className="timer"
          style={{ marginBottom: 0, color: "white" }}
        >
          {formatTime()}
        </div>
        <div className="paper-title">
          {testpaper?.title || testpaper?.name || testpaper?.paperTitle || "Untitled Paper"}
        </div>
        <div className="topbar-submit">
          <button className="testattempt-submit-button" onClick={handleSubmitClick} disabled={submitting}>Submit</button>
        </div>
      </div>
      <div className="pdf-and-questions">
        <div className="pdf-viewer-section">
          <div className="pdf-viewer-container">
            {testpaper?.fileUrl ? (
              <Document file={testpaper.fileUrl}>
                <Page
                  pageNumber={currentPage}
                  width={800}
                  className="pdf-page"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            ) : (
              <p>Loading test paper...</p>
            )}
            <div className="pdf-nav">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="nav-btn"
              >
                ←
              </button>
              <span>
                Page {currentPage} of {testpaper?.numPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, testpaper?.numPages || 1))}
                disabled={currentPage === testpaper?.numPages}
                className="nav-btn"
              >
                →
              </button>
            </div>
          </div>
        </div>
        <div className="questions-section">
          <div className="question-panel">
            <ul>
              {pageQuestions.map((q) => (
                <li key={q.id} className="testattempt-question-block">
                  <div className="testattempt-question-header">
                    <span className="testattempt-question-number"><strong>{q.questionNumber}.</strong></span>
                    <span className="testattempt-question-marks">Marks: {q.marks}</span>
                  </div>
                  <div className="testattempt-answer-label">Your Answer:</div>
                  <div className="testattempt-answer-input">
                    {q.type === 'MCQ' && Array.isArray(q.options) && (
                      <div className="testattempt-mcq-answer">
                        {q.options.map((opt) => (
                          <label key={opt}>
                            <input
                              type="checkbox"
                              name={q.id}
                              value={opt}
                              checked={Array.isArray(answers[q.id]) && answers[q.id].includes(opt)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setAnswers((prev) => {
                                  const currentAnswers = Array.isArray(prev[q.id]) ? prev[q.id] : [];
                                  const newAnswers = isChecked
                                    ? [...currentAnswers, opt]
                                    : currentAnswers.filter((item) => item !== opt);
                                  const updatedAnswers = { ...prev, [q.id]: newAnswers };
                                  answersRef.current = updatedAnswers;
                                  return updatedAnswers;
                                });
                              }}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type === 'Open-ended' && (
                      <textarea
                        className="testattempt-open-ended-answer"
                        placeholder="Type your answer..."
                        value={answers[q.id] || ''}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                      />
                    )}
                    {q.type === 'Other' && (
                      <div className="testattempt-other-answer">
                        <button onClick={() => document.getElementById(`file-upload-${q.id}`).click()}>Upload File</button>
                        <input
                          id={`file-upload-${q.id}`}
                          type="file"
                          style={{ display: 'none' }}
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleLocalFileSelect(q.id, e.target.files && e.target.files[0])}
                        />
                        {answers[q.id] && (
                          (answers[q.id].url) ? (
                            <a
                              className="testattempt-selected-filename"
                              href={answers[q.id].url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {answers[q.id].name}
                            </a>
                          ) : (answers[q.id].previewUrl) ? (
                            <a
                              className="testattempt-selected-filename"
                              href={answers[q.id].previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {answers[q.id].name}
                            </a>
                          ) : (
                            <span className="testattempt-selected-filename">{answers[q.id].name || String(answers[q.id])}</span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {/* Modals */}
      {showSubmitConfirm && (
        <div className="testattempt-delete-modal-overlay">
          <div className="testattempt-delete-modal">
            <p>Are you sure you want to submit this test?<br />Your answers will be saved and cannot be changed.<br /><strong>Time taken: {formatTimeTaken(submitTimeTaken)}</strong></p>
            <div className="testattempt-delete-modal-buttons">
              <button className="testattempt-delete-confirm-button" onClick={async () => { setShowSubmitConfirm(false); await submitAttempt(); }} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button className="testattempt-delete-cancel-button" onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showTimeExpiredPopup && (
        <div className="testattempt-delete-modal-overlay">
          <div className="testattempt-delete-modal">
            <p>Time is up! Would you like to submit your attempt or continue?</p>
            <div className="testattempt-delete-modal-buttons">
              <button className="testattempt-delete-confirm-button" onClick={() => { setShowTimeExpiredPopup(false); setShowSubmitConfirm(true); const timeTaken = (Date.now() - startTimeRef.current) / 1000; setSubmitTimeTaken(timeTaken); }} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button className="testattempt-delete-cancel-button" onClick={() => { setShowTimeExpiredPopup(false); setTimerActive(false); setTimeLeft(0); }}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestAttempt;
