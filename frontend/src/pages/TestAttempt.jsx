import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestAttempt.css';
import { Document, Page, pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
//import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
//import 'react-pdf/dist/esm/Page/TextLayer.css';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const TestAttempt = () => {
  const { uid, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const duration = location.state?.duration || 60;

  const [testpaper, setTestpaper] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [timerActive, setTimerActive] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

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
        console.error('Error loading test paper:', error);
        alert('Failed to load test.');
        navigate('/dashboard');
      }
    };

    fetchTestpaper();
  }, [uid, id, navigate]);

  // Timer effect
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  // Change state of "answers" prop whenever user inputs answer
  const handleChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Save submission details to firestore
  const handleSubmit = async () => {
    try {
      setTimerActive(false);

      const attemptRef = collection(db, 'users', uid, 'testpapers', id, 'attempts');
      const newAttempt = doc(attemptRef);
      const attemptId = newAttempt.id;

      const processedAnswers = {};

      for (const q of testpaper?.questionsByPage?.flatMap(p => p.questions) || []) {
        const answer = answers[q.id];
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
        timeTaken: duration * 60 - timeLeft,
        graded: false,
        timestamp: serverTimestamp(),
      };
      await setDoc(newAttempt, attemptData);

      // Redirect to TestGrading.jsx
      navigate(`/testattempt/${uid}/${id}/${attemptId}/grade`, {
        state: {
          answers: processedAnswers,
          timeTaken: duration * 60 - timeLeft,
          attemptId,
          testpaper,
        },
      });
    } catch (err) {
      console.error('Error submitting attempt:', err);
      alert('Failed to submit test.');
    }
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
              <p><strong>{q.questionNumber} ({q.type}) — {q.marks} marks</strong></p>

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
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleChange(q.id, e.target.files[0])}
                  />
                  {answers[q.id] && typeof answers[q.id] === 'object' && (
                    <p className="selected-file-name">{answers[q.id].name}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="submit-button-wrapper">
          <button className="submit-button" onClick={() => setShowSubmitConfirm(true)}>
            Submit
          </button>
        </div>
      </main>
      {showSubmitConfirm && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <p>
              Are you sure you want to submit this test?
              <br />
              Your answers will be saved and cannot be changed.
            </p>
            <div className="delete-modal-buttons">
              <button className="delete-confirm-button" onClick={handleSubmit}>
                Submit
              </button>
              <button className="delete-cancel-button" onClick={() => setShowSubmitConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestAttempt;
