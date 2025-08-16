import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import PopupModal from '../components/PopupModal';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestAttempt.css';

import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';



const formatTimeTaken = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
};

const TestGrading = () => {
  const { uid, id, attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state || {};
  const [testpaper, setTestpaper] = useState(locationState.testpaper);
  const [answers, setAnswers] = useState(locationState.answers);
  const [timeTaken, setTimeTaken] = useState(locationState.timeTaken);
  const [numPages, setNumPages] = useState(null);

  const [scores, setScores] = useState({});
  const [saveConfirm, setSaveConfirm] = useState({ visible: false });
  const [saving, setSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [popup, setPopup] = useState({ visible: false, message: '', isError: false });


  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!testpaper || !answers) {
          const testpaperDocRef = doc(db, 'users', uid, 'testpapers', id);
          const testpaperSnap = await getDoc(testpaperDocRef);
          if (testpaperSnap.exists()) {
            setTestpaper(testpaperSnap.data());
          }
          const attemptDocRef = doc(db, 'users', uid, 'testpapers', id, 'attempts', attemptId);
          const attemptSnap = await getDoc(attemptDocRef);
          if (attemptSnap.exists()) {
            const attemptData = attemptSnap.data();
            setAnswers(attemptData.answers);
            setTimeTaken(attemptData.timeTaken);
          }
        }
      } catch (error) {
        console.error('Error fetching testpaper or attempt data:', error);
        alert('Failed to load test data.');
      }
    };
    fetchData();
  }, [uid, id, attemptId, testpaper, answers]);

  // Total marks using marks of all questions
  const totalMarks = testpaper?.questionsByPage?.flatMap(p => p.questions).reduce((acc, q) => acc + Number(q.marks || 0), 0) || 0;
  // Total score for user's attempt
  const totalScored = Object.values(scores).reduce((a, b) => a + Number(b || 0), 0);

  const handleScoreChange = (qid, val) => {
    const numericVal = val === '' ? '' : Number(val);
    setScores(prev => ({ ...prev, [qid]: numericVal }));
  };

  const openSaveConfirm = () => {
    setSaveConfirm({ visible: true });
  };

  const cancelSave = () => {
    setSaveConfirm({ visible: false });
  };

  const confirmSave = async () => {
    setSaving(true);
    try {
      const attemptDocRef = doc(db, 'users', uid, 'testpapers', id, 'attempts', attemptId);
      await updateDoc(attemptDocRef, {
        scores,
        totalScored,
        graded: true,
      });
      setSaveConfirm({ visible: false });
      // Use PopupModal for success
      setPopup({ visible: true, message: 'Attempt saved successfully!', isError: false });
    } catch (err) {
      console.error('Error updating attempt:', err);
      // Use PopupModal for failure
      setPopup({ visible: true, message: 'Failed to save attempt.', isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < testpaper?.numPages) setCurrentPage(currentPage + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };


  return (
    <div className="upload-container">
      <NavbarLoggedin />
      <main></main>
        {/* Top bar row */}
        <div className="timer-title-row">
          <div
            className="timer"
            style={{ marginBottom: 0, color: "white", fontSize: '1.8rem' }}
          >
            Time Taken: {formatTimeTaken(timeTaken)}
          </div>
          <div className="paper-title-center-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem' }}>
            <div className="paper-title">
              {testpaper?.title || testpaper?.name || testpaper?.paperTitle || "Untitled Paper"}
            </div>
          </div>
          <div className="topbar-submit">
          </div>
        </div>

        {/* Layout for PDF nav and Question list */}
        <div className="pdf-and-questions">
          <div className="pdf-viewer-section">
            <div className="pdf-viewer-container">
              {testpaper?.fileUrl && (
                <Document
                  file={testpaper.fileUrl}
                  onLoadSuccess={({ numPages }) => {
                    setCurrentPage(1);
                    setNumPages(numPages);
                  }}
                >
                  <Page
                    pageNumber={currentPage}
                    width={800}
                    className="pdf-page"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              )}
              <div className="pdf-nav">
                <button onClick={handlePreviousPage} disabled={currentPage === 1}>←</button>
                <span>Page {currentPage} of {numPages}</span>
                <button onClick={handleNextPage} disabled={currentPage === numPages}>→</button>
              </div>
            </div>
          </div>

          <div className="questions-section">
            <div className="question-panel">
              <ul>
                {(testpaper?.questionsByPage?.find(p => p.page === currentPage)?.questions || []).map((q) => (
                  <li key={q.id} className="testattempt-question-block">
                    <div className="testattempt-question-header">
                      <span className="testattempt-question-number"><strong>{q.questionNumber}.</strong></span>
                      <span className="testattempt-question-marks">Marks: {Number(q.marks)}</span>
                    </div>

                    <div className="testattempt-answer-label">Correct Answer:</div>
                    <div className="testattempt-answer-input">
                      {q.type === 'MCQ' && Array.isArray(q.correctAnswer) && (
                        <div>{q.correctAnswer.join(', ')}</div>
                      )}
                      {q.type === 'Open-ended' && (
                        <div>{q.correctAnswer}</div>
                      )}
                      {q.type === 'Other' && q.correctAnswer?.url && (
                        <a href={q.correctAnswer.url} target="_blank" rel="noopener noreferrer" className="testattempt-selected-filename">
                          {q.correctAnswer.name}
                        </a>
                      )}
                    </div>

                    <div className="testattempt-answer-label">Your Answer:</div>
                    <div className="testattempt-answer-input">
                      {q.type === 'MCQ' && (
                        <div>{Array.isArray(answers?.[q.id]) && answers[q.id].length > 0 ? answers[q.id].join(', ') : 'No answer submitted'}</div>
                      )}
                      {q.type === 'Open-ended' && (
                        <div>{typeof answers?.[q.id] === 'string' && answers[q.id] !== '' ? answers[q.id] : 'No answer submitted'}</div>
                      )}
                      {q.type === 'Other' && (
                        answers?.[q.id]?.url ? (
                          <a href={answers[q.id].url} target="_blank" rel="noopener noreferrer" className="testattempt-selected-filename">
                            {answers[q.id].name}
                          </a>
                        ) : (
                          <div>No answer submitted</div>
                        )
                      )}
                    </div>

                    <div className="testattempt-answer-label">Marks You Scored:</div>
                    <div className="testattempt-answer-input">
                      <input
                        type="number"
                        min="0"
                        max={Number(q.marks)}
                        value={scores[q.id] === undefined ? '' : scores[q.id]}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const clamped = Math.min(Number(q.marks), Math.max(0, val));
                          handleScoreChange(q.id, isNaN(clamped) ? '' : clamped);
                        }}
                        style={{ width: '120px' }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="testgrading-bottom-right-wrapper">
          <div
            className="testgrading-grading-summary"
            style={{ fontSize: '1.6rem', color: 'white', textAlign: 'right' }}
          >
            <span>Total Scored: {totalScored} / {totalMarks}</span>
          </div>
          <button
            className="testattempt-submit-button"
            onClick={openSaveConfirm}
            disabled={saving}
          >
            Save Attempt
          </button>
        </div>

        {saveConfirm.visible && (
          <div className="testattempt-delete-modal-overlay">
            <div className="testattempt-delete-modal">
              <p>
                You scored {totalScored} out of {totalMarks}.
                <br />
                Are you sure you want to save this attempt?
              </p>
              <div className="testattempt-delete-modal-buttons">
                <button className="testattempt-delete-confirm-button" onClick={confirmSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="testattempt-delete-cancel-button" onClick={cancelSave} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      {/* Success / Error popup modal */}
      {popup.visible && (
        <PopupModal
          message={popup.message}
          onConfirm={() => {
            setPopup({ visible: false, message: '', isError: false });
            if (!popup.isError) {
              navigate('/dashboard');
            }
          }}
          confirmText="OK"
        />
      )}
    </div>
    
  );
};

export default TestGrading;
