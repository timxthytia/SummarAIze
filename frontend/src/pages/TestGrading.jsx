import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestGrading.css';

const TestGrading = () => {
  const { uid, id, attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { testpaper, answers, timeTaken } = location.state || {};

  const [scores, setScores] = useState({});
  const [saveConfirm, setSaveConfirm] = useState({ visible: false });
  const [saving, setSaving] = useState(false);

  const totalMarks = testpaper?.questionsByPage?.flatMap(p => p.questions).reduce((acc, q) => acc + Number(q.marks || 0), 0) || 0;
  const totalScored = Object.values(scores).reduce((a, b) => a + Number(b || 0), 0);

  const handleScoreChange = (qid, val) => {
    setScores(prev => ({ ...prev, [qid]: val }));
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

  return (
    <div className="test-grading-container">
      <NavbarLoggedin />
      <main>
        <h2>Grade Your Attempt</h2>
        {testpaper?.questionsByPage?.map((p) => (
          <div key={p.page} className="grading-page-block">
            <h3>Page {p.page}</h3>
            {p.questions.map((q) => (
              <div key={q.id} className="grading-question-block">
                <p><strong>{q.questionNumber} ({q.type}) — {q.marks} marks</strong></p>
                <p><strong>Correct Answer:</strong></p>
                {q.type === 'MCQ' && Array.isArray(q.correctAnswer) && (
                  <p>{q.correctAnswer.join(', ')}</p>
                )}
                {q.type === 'Open-Ended' && (
                  <p>{q.correctAnswer}</p>
                )}
                {q.type === 'Other' && q.correctAnswer?.url && (
                  <a href={q.correctAnswer.url} target="_blank" rel="noopener noreferrer">
                    {q.correctAnswer.name}
                  </a>
                )}
                <p><strong>Your Answer:</strong></p>
                {q.type === 'MCQ' && Array.isArray(answers[q.id]) && (
                  <p>{answers[q.id].join(', ')}</p>
                )}
                {q.type === 'Open-Ended' && typeof answers[q.id] === 'string' && (
                  <p>{answers[q.id]}</p>
                )}
                {q.type === 'Other' && answers[q.id]?.url && (
                  <a href={answers[q.id].url} target="_blank" rel="noopener noreferrer">
                    {answers[q.id].name}
                  </a>
                )}
                <label>
                  Marks You Scored:
                  <input
                    type="number"
                    min="0"
                    max={q.marks}
                    value={scores[q.id] || ''}
                    onChange={(e) => handleScoreChange(q.id, e.target.value)}
                  />
                </label>
              </div>
            ))}
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
              Time taken: {Math.floor(timeTaken / 60)} minutes and {timeTaken % 60} seconds.
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
    </div>
  );
};

export default TestGrading;
