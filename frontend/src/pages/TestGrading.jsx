import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestGrading.css';

import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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

  useEffect(() => {
    const fetchData = async () => {
      if (!testpaper || !answers) {
        try {
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
        } catch (error) {
          console.error('Error fetching testpaper or attempt data:', error);
          alert('Failed to load test data.');
        }
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
      alert('Attempt saved successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error updating attempt:', err);
      alert('Failed to save attempt.');
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
    <div className="test-grading-container">
      <NavbarLoggedin />
      <main>
        <h2>Grade Your Attempt</h2>
      <div className="pdf-viewer-container">
        {testpaper?.fileUrl && (
          <Document
            file={testpaper.fileUrl}
            onLoadSuccess={({ numPages }) => {
              setCurrentPage(1);
              setNumPages(numPages);
            }}
          >
            <Page pageNumber={currentPage} />
          </Document>
        )}
        <div className="pdf-nav">
          <button onClick={handlePreviousPage} disabled={currentPage === 1}>←</button>
          <span>Page {currentPage} of {numPages}</span>
          <button onClick={handleNextPage} disabled={currentPage === numPages}>→</button>
        </div>
      </div>
      <main>
        {testpaper?.questionsByPage?.filter(p => p.page === currentPage).map((p) => (
          <div key={p.page} className="grading-page-block">
            <h3>Page {p.page}</h3>
            {p.questions.map((q) => {
              return (
                <div key={q.id} className="grading-question-block">
                  <p><strong>{q.questionNumber} ({q.type}) — {Number(q.marks)} marks</strong></p>
                  <p><strong>Correct Answer:</strong></p>
                  {q.type === 'MCQ' && Array.isArray(q.correctAnswer) && (
                    <p>{q.correctAnswer.join(', ')}</p>
                  )}
                  {q.type === 'Open-ended' && (
                    <p>{q.correctAnswer}</p>
                  )}
                  {q.type === 'Other' && q.correctAnswer?.url && (
                    <a href={q.correctAnswer.url} target="_blank" rel="noopener noreferrer" className="selected-filename">
                      {q.correctAnswer.name}
                    </a>
                  )}
                  <p><strong>Your Answer:</strong></p>
                  {q.type === 'MCQ' && (
                    <p>{Array.isArray(answers?.[q.id]) && answers[q.id].length > 0 ? answers[q.id].join(', ') : 'No answer submitted'}</p>
                  )}
                  {q.type === 'Open-ended' && (
                    <p>{typeof answers?.[q.id] === 'string' && answers[q.id] !== '' ? answers[q.id] : 'No answer submitted'}</p>
                  )}
                  {q.type === 'Other' && (
                    answers?.[q.id]?.url ? (
                      <a href={answers[q.id].url} target="_blank" rel="noopener noreferrer" className="selected-filename">
                        {answers[q.id].name}
                      </a>
                    ) : (
                      <p>No answer submitted</p>
                    )
                  )}
                  <label>
                    Marks You Scored:
                    <input
                      type="number"
                      min="0"
                      max={Number(q.marks)}
                      value={scores[q.id] === undefined ? '' : scores[q.id]}
                      onChange={(e) => handleScoreChange(q.id, e.target.value)}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ))}
        <div className="grading-summary">
          <p>Total Scored: {totalScored} / {totalMarks}</p>
          <button onClick={openSaveConfirm} disabled={saving}>Save Attempt</button>
        </div>
      </main>

      {saveConfirm.visible && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <p>
              You scored {totalScored} out of {totalMarks}.
              <br />
              Time taken: {formatTimeTaken(timeTaken)}
              <br />
              Are you sure you want to save this attempt?
            </p>
            <div className="delete-modal-buttons">
              <button className="delete-confirm-button" onClick={confirmSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="delete-cancel-button" onClick={cancelSave} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </div>
  );
};

export default TestGrading;
