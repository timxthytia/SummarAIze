import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestReview.css';

const TestReview = () => {
  const { uid, id } = useParams();
  const [view, setView] = useState('attempts');
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMarks, setTotalMarks] = useState(0);
  const [questions, setQuestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Get all previous attempts for paper
    const fetchAttempts = async () => {
      try {
        const attemptsRef = collection(db, 'users', uid, 'testpapers', id, 'attempts');
        const snapshot = await getDocs(attemptsRef);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => b.timestamp - a.timestamp);
        setAttempts(list);
      } catch (err) {
        console.error('Failed to fetch attempts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [uid, id]);

  useEffect(() => {
    // Fetch full testpaper document and calculate total marks from questionsByPage
    const fetchTestpaper = async () => {
      try {
        const testpaperRef = doc(db, 'users', uid, 'testpapers', id);
        const testpaperSnap = await getDoc(testpaperRef);
        if (testpaperSnap.exists()) {
          const data = testpaperSnap.data();
          const questionsByPage = data.questionsByPage || [];
          // Flatten questionsByPage to a single array of questions
          const allQuestions = questionsByPage.flatMap(p => p.questions || []);
          const total = allQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0);
          setTotalMarks(total);
          setQuestions(allQuestions);
        } else {
          setTotalMarks(0);
          setQuestions([]);
        }
      } catch (err) {
        console.error('Failed to fetch testpaper document:', err);
      }
    };

    fetchTestpaper();
  }, [uid, id]);

  // Calculate stats for Breakdown display
  const calculateStats = () => {
    const graded = attempts.filter(attempt => attempt.graded);
    if (graded.length === 0) return { avg: '-', high: '-', low: '-' };

    const scores = graded.map(a => a.totalScored || 0);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    return { avg, high, low };
  };

  const { avg, high, low } = calculateStats();

  // Calculate per-question stats using question.id as key 
  const getPerQuestionStats = () => {
    // Use all attempts, not just graded
    if (attempts.length === 0) return [];

    return questions.map((question, index) => {
      const scores = attempts
        .map(attempt => {
          // attempt.scores is expected to be an object
          const answerObj = attempt.scores?.[question.id];
          // Allow ungraded scores
          if (typeof answerObj === 'number') return answerObj;
          if (typeof answerObj === 'object' && answerObj !== null && typeof answerObj.score === 'number') return answerObj.score;
          if (typeof answerObj === 'string' && !isNaN(Number(answerObj))) return Number(answerObj);
          // If not graded, return undefined
          return undefined;
        });
      // Only use numeric scores for stats
      const numericScores = scores.filter(score => typeof score === 'number' && !isNaN(score));
      const avgScore = numericScores.length > 0 ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(2) : '-';
      const highScore = numericScores.length > 0 ? Math.max(...numericScores) : '-';
      const lowScore = numericScores.length > 0 ? Math.min(...numericScores) : '-';
      return {
        question,
        avgScore,
        highScore,
        lowScore,
        scores,
      };
    });
  };

  const perQuestionStats = getPerQuestionStats();

  return (
    <div className="test-review-container">
      <NavbarLoggedin />
      <main>
        <div className="review-toggle-buttons">
            <button className={view === 'attempts' ? 'active' : ''} onClick={() => setView('attempts')}>Attempts</button>
            <button className={view === 'stats' ? 'active' : ''} onClick={() => setView('stats')}>Paper Statistics</button>
        </div>
        {loading ? (
            <p>Loading...</p>
        ) : view === 'attempts' ? (
            <div className="attempt-list">
                {attempts.length === 0 ? (
                    <p>No attempts yet.</p>
                ) : (
                    attempts.map((attempt, index) => {
                      return (
                      <div key={attempt.id} className="attempt-entry">
                          <button
                          className="attempt-link"
                          onClick={() => {
                            navigate(`/testattempt/${uid}/${id}/${attempt.id}/grade`, {
                              state: {
                                graded: attempt.graded,
                                answers: attempt.answers,
                                timeTaken: attempt.timeTaken,
                                attemptId: attempt.id,
                                timestamp: attempt.timestamp
                              }
                            });
                          }}
                          >
                          Attempt {attempts.length - index}
                          </button>
                          <p>{attempt.timestamp ? `Attempted at: ${attempt.timestamp.toDate().toLocaleString()}` : 'Unknown time'}</p>
                          <p>{attempt.graded ? `Score: ${attempt.totalScored} / ${totalMarks}` : 'Score: Ungraded'}</p>
                          <p>Time Taken: {attempt.timeTaken ? `${Math.round(attempt.timeTaken / 60)} mins` : '-'}</p>
                      </div>
                      )
                    })
                )}
            </div>
        ) : (
            <div className="paper-stats">
            <h3>Overall Statistics</h3>
            <p><strong>Average Score:</strong> {avg}</p>
            <p><strong>Highest Score:</strong> {high}</p>
            <p><strong>Lowest Score:</strong> {low}</p>
            {perQuestionStats.length > 0 && perQuestionStats.map(({ question, avgScore, highScore, lowScore, scores }, idx) => (
              <div key={idx} className="question-stats">
                <h4>Question {idx + 1}</h4>
                <p><strong>Marks:</strong> {question.marks}</p>
                <p><strong>Average Score:</strong> {avgScore}</p>
                <p><strong>Highest Score:</strong> {highScore}</p>
                <p><strong>Lowest Score:</strong> {lowScore}</p>
                <p><strong>Correct Answer:</strong> {typeof question.correctAnswer === 'object' && question.correctAnswer?.url ? (
                  <a href={question.correctAnswer.url} target="_blank" rel="noopener noreferrer" className="selected-filename">
                    {question.correctAnswer.name}
                  </a>
                ) : (
                  question.correctAnswer || 'N/A'
                )}</p>
                <div className="scrollable-scores">
                  {attempts.map((attempt, index) => {
                    const score = attempt.scores?.[question.id];
                    const userAnswer = attempt.answers?.[question.id];
                    // Render attempts in reverse order (latest attempt first)
                    const revIdx = attempts.length - 1 - index;
                    const displayAttemptNum = attempts.length - index;
                    return (
                      <div key={index} className="score-entry">
                        Attempt {displayAttemptNum}: {typeof score === 'number' && !isNaN(score) ? `${score} mark(s)` : 'Ungraded'}
                        <div className="user-answer">
                          {(() => {
                            if (typeof userAnswer === 'string') {
                              return userAnswer.length > 100 ? userAnswer.slice(0, 100) + '...' : userAnswer;
                            } else if (typeof userAnswer === 'object' && userAnswer?.url) {
                              return <a href={userAnswer.url} target="_blank" rel="noopener noreferrer" className="selected-filename">{userAnswer.name}</a>;
                            } else if (Array.isArray(userAnswer)) {
                              return userAnswer.join(', ');
                            } else {
                              return 'No answer submitted';
                            }
                          })()}
                        </div>
                      </div>
                    );
                  }).slice().reverse()}
                </div>
              </div>
            ))}
            </div>
        )}
        </main>
    </div>
  );
};

export default TestReview;