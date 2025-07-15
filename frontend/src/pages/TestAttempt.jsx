import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestAttempt.css';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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

  // Timer effect
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

  // Change state of "answers" prop whenever user inputs answer
  const handleChange = (questionId, value) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: value };
      answersRef.current = newAnswers;
      return newAnswers;
    });
  };

  // Save submission details to firestore
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

        if (q.type === 'Other' && answer instanceof File) {
          const storageRef = ref(
            storage,
            `testpapers/${uid}/${id}/attempts/${attemptId}/answers/${q.id}/${answer.name}`
          );
          await uploadBytes(storageRef, answer);
          const url = await getDownloadURL(storageRef);
          processedAnswers[q.id] = { name: answer.name, url };
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

  // Format timer
  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="test-attempt-container">
      <NavbarLoggedin />
      <main>
        <div className="timer">Time Left: {formatTime()}</div>
        <div className="pdf-viewer">
          {testpaper?.fileUrl ? (
            <Document file={testpaper.fileUrl}>
              <div className="pdf-page">
                <Page pageNumber={currentPage} width={600} />
              </div>
            </Document>
          ) : (
            <p>Loading test paper...</p>
          )}
        </div>
        <div className="pdf-nav">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>←</button>
          <span>Page {currentPage} of {testpaper?.numPages}</span>
          <button disabled={currentPage === testpaper?.numPages} onClick={() => setCurrentPage(currentPage + 1)}>→</button>
        </div>
        <div className="question-list">
          {pageQuestions.map((q) => (
            <div key={q.id} className="question-block">
              <p><strong>{q.questionNumber}. ({q.type}) — {q.marks} marks</strong></p>

              {q.type === 'MCQ' && Array.isArray(q.options) && (
                <div className="mcq-answer">
                  {q.options.map((opt) => (
                    <label key={opt} style={{ marginRight: '1rem' }}>
                      <input
                        type="checkbox"
                        name={q.id}
                        value={opt}
                        checked={(answers[q.id] || []).includes(opt)}
                        onChange={(e) => {
                          const value = e.target.value;
                          const selected = new Set(answers[q.id] || []);
                          if (selected.has(value)) selected.delete(value);
                          else selected.add(value);
                          handleChange(q.id, Array.from(selected));
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'Open-ended' && (
                <div className="open-ended-answer">
                  <textarea
                    rows={4}
                    placeholder="Your answer..."
                    value={answers[q.id] || ''}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                  />
                </div>
              )}

              {q.type === 'Other' && (
                <div className="other-answer">
                  <>
                    <input
                      id={`file-upload-${q.id}`}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => handleChange(q.id, e.target.files[0])}
                    />
                    <label
                      htmlFor={`file-upload-${q.id}`}
                      className="submit-button"
                      style={{ display: 'inline-block', marginBottom: '8px', cursor: 'pointer' }}
                    >
                      Choose File
                    </label>
                    {answers[q.id] && typeof answers[q.id] === 'object' && (
                      <a
                        className="selected-filename"
                        href={URL.createObjectURL(answers[q.id])}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {answers[q.id].name}
                      </a>
                    )}
                  </>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="submit-button-wrapper">
          <button className="submit-button" onClick={handleSubmitClick} disabled={submitting}>
            Submit
          </button>
        </div>
      </main>
      {showSubmitConfirm && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <p>
              Are you sure you want to submit this test?<br />
              Your answers will be saved and cannot be changed.<br />
              <strong>Time taken: {formatTimeTaken(submitTimeTaken)}</strong>
            </p>
            <div className="delete-modal-buttons">
              <button
                className="delete-confirm-button"
                onClick={async () => {
                  setShowSubmitConfirm(false);
                  await submitAttempt();
                }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                className="delete-cancel-button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showTimeExpiredPopup && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <p>
              Time is up! Would you like to submit your attempt or continue?
            </p>
            <div className="delete-modal-buttons">
              <button className="delete-confirm-button" onClick={() => {
                setShowTimeExpiredPopup(false);
                setShowSubmitConfirm(true);
                const timeTaken = (Date.now() - startTimeRef.current) / 1000;
                setSubmitTimeTaken(timeTaken);
              }} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button className="delete-cancel-button" onClick={() => {
                setShowTimeExpiredPopup(false);
                // Keep timer stopped at zero so user can continue answering
                setTimerActive(false);
                setTimeLeft(0);
              }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestAttempt;
