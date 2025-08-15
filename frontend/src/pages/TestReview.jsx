import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestReview.css';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const TestReview = () => {
  const { uid, id } = useParams();
  const [view, setView] = useState('attempts');
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMarks, setTotalMarks] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [questionsByPage, setQuestionsByPage] = useState([]);
  // PDF state for two-pane stats layout
  const [pdfUrl, setPdfUrl] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = React.useState({ visible: false, attemptId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const pdfPaneRef = React.useRef(null);
  const [pdfHeight, setPdfHeight] = useState(null);
  const navigate = useNavigate();

  const onDocumentLoadSuccess = ({ numPages: np }) => {
    setNumPages(np);
    if (currentPage > np) setCurrentPage(np);
  };

  useEffect(() => {
    if (!pdfPaneRef.current) return;

    const updateHeight = () => {
      const pageEl = pdfPaneRef.current.querySelector('.react-pdf__Page');
      if (pageEl) {
        const h = pageEl.getBoundingClientRect().height;
        if (h && h !== pdfHeight) setPdfHeight(h);
      }
    };

    // Observe size changes
    const ro = new ResizeObserver(() => updateHeight());
    ro.observe(pdfPaneRef.current);

    // Also try to observe the inner canvas when it appears
    const observer = new MutationObserver(() => updateHeight());
    observer.observe(pdfPaneRef.current, { childList: true, subtree: true });

    // Initial measurement (after next paint)
    requestAnimationFrame(updateHeight);

    return () => {
      try { ro.disconnect(); } catch {}
      try { observer.disconnect(); } catch {}
    };
  }, [pdfPaneRef, currentPage, numPages]);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const attemptsRef = collection(db, 'users', uid, 'testpapers', id, 'attempts');
        const snapshot = await getDocs(attemptsRef);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => b.timestamp - a.timestamp);
        setAttempts(list);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [uid, id, deleteConfirm.visible]);

  const handleDeleteAttempt = async () => {
    setIsDeleting(true);
    try {
      const docRef = doc(db, 'users', uid, 'testpapers', id, 'attempts', deleteConfirm.attemptId);
      await deleteDoc(docRef);
      setDeleteConfirm({ visible: false, attemptId: null });
    } catch (error) {
      setDeleteConfirm({ visible: false, attemptId: null });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchTestpaper = async () => {
      try {
        const testpaperRef = doc(db, 'users', uid, 'testpapers', id);
        const testpaperSnap = await getDoc(testpaperRef);
        if (testpaperSnap.exists()) {
          const data = testpaperSnap.data();
          // set PDF meta for left pane
          setPdfUrl(data.fileUrl || '');
          const qb = data.questionsByPage || [];
          setQuestionsByPage(qb);
          // prefer Firestore numPages, fallback to questionsByPage length
          const computedPages = Number(data.numPages || qb.length || 0);
          setNumPages(computedPages);
          const allQuestions = qb.flatMap(p => p.questions || []);
          const total = allQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0);
          setTotalMarks(total);
          setQuestions(allQuestions);
        } else {
          setTotalMarks(0);
          setQuestions([]);
          setQuestionsByPage([]);
          setNumPages(0);
        }
      } catch (err) {
      }
    };
    fetchTestpaper();
  }, [uid, id]);

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

  const getPerQuestionStats = (sourceQuestions) => {
    if (attempts.length === 0) return [];
    return sourceQuestions.map((question) => {
      const scores = attempts
        .map(attempt => {
          const answerObj = attempt.scores?.[question.id];
          if (typeof answerObj === 'number') return answerObj;
          if (typeof answerObj === 'object' && answerObj !== null && typeof answerObj.score === 'number') return answerObj.score;
          if (typeof answerObj === 'string' && !isNaN(Number(answerObj))) return Number(answerObj);
          return undefined;
        });
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

  const currentQuestions = (questionsByPage[currentPage - 1]?.questions) || [];
  const perQuestionStats = getPerQuestionStats(currentQuestions);

  useEffect(() => {
    setCurrentPage(p => {
      if (!numPages) return 1;
      if (p < 1) return 1;
      if (p > numPages) return numPages;
      return p;
    });
  }, [numPages]);

  // Preserve window scroll position across page flips
  const preserveScroll = (updateFn) => {
    const x = window.scrollX;
    const y = window.scrollY;
    updateFn();
    // Restore after React commit/paint
    requestAnimationFrame(() => window.scrollTo(x, y));
  };

  // Page navigation handlers for PDF pane
  const handlePrevPage = () =>
    preserveScroll(() => setCurrentPage(p => Math.max(1, p - 1)));

  const handleNextPage = () =>
    preserveScroll(() => setCurrentPage(p => (numPages ? Math.min(numPages, p + 1) : p + 1)));

  return (
    <div className="test-review-container">
      <NavbarLoggedin />
      <main>
        <div className="test-review-toggle-buttons">
          <button
            className={`test-review-toggle-btn ${view === 'attempts' ? 'active' : ''}`}
            onClick={() => setView('attempts')}
          >
            <span className="icon-badge">
              <svg className="toggle-icon" viewBox="0 0 28 28" fill="none">
                <rect x="5" y="7" width="18" height="14" rx="3" stroke="#5f27cd" strokeWidth="2"/>
                <rect x="8.5" y="11" width="3" height="3" rx="1.5" fill="#5f27cd"/>
                <rect x="16.5" y="11" width="3" height="3" rx="1.5" fill="#5f27cd"/>
              </svg>
              <span className="badge-count">{attempts.length}</span>
            </span>
            Attempts
          </button>
          <button
            className={`test-review-toggle-btn ${view === 'stats' ? 'active' : ''}`}
            onClick={() => setView('stats')}
          >
            <span className="icon-badge">
              <svg className="toggle-icon" viewBox="0 0 28 28" fill="none">
                <rect x="5" y="17" width="3.5" height="6" rx="1.75" fill="#5f27cd"/>
                <rect x="12.25" y="10" width="3.5" height="13" rx="1.75" fill="#5f27cd"/>
                <rect x="19.5" y="5" width="3.5" height="18" rx="1.75" fill="#5f27cd"/>
              </svg>
            </span>
            Paper Statistics
          </button>
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
                    <button
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ visible: true, attemptId: attempt.id });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <>
            {/* Overall statistics container ABOVE the split */}
            <div className="paper-stats" style={{ marginBottom: '1rem' }}>
              <h3>Overall Statistics</h3>
              <p><strong>Average Score:</strong> {avg}</p>
              <p><strong>Highest Score:</strong> {high}</p>
              <p><strong>Lowest Score:</strong> {low}</p>
            </div>
            <div className="testreview-split-wrapper">
              {/* BELOW: two-pane layout with PDF navigation on the left and per-page questions on the right */}
              <div className="testreview-split">
                {/* LEFT: PDF viewer + navigation */}
                <section className="testreview-pdf-section">
                  <div className="testreview-pdf-container" ref={pdfPaneRef}>
                    {pdfUrl ? (
                      <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                        <Page
                          pageNumber={currentPage}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="pdf-page"
                        />
                      </Document>
                    ) : (
                      <div className="pdf-placeholder">No PDF available</div>
                    )}
                  </div>
                  <div className="testreview-pdf-nav">
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handlePrevPage} disabled={currentPage <= 1}>←</button>
                    <span>Page {currentPage} of {numPages || '?'}</span>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleNextPage} disabled={!!numPages && currentPage >= numPages}>→</button>
                  </div>
                </section>

                {/* RIGHT: Questions for the CURRENT PAGE with existing info */}
                <aside
                  className="testreview-questions-section"
                  style={{ maxHeight: pdfHeight ? `${pdfHeight}px` : undefined, overflowY: pdfHeight ? 'auto' : undefined }}
                >
                  {perQuestionStats.length > 0 && perQuestionStats.map(({ question, avgScore, highScore, lowScore }, idx) => (
                    <div key={idx} className="question-stats">
                      <h4>Question {question.questionNumber ?? question.number ?? (idx + 1)}</h4>
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
                </aside>
              </div>
            </div>
          </>
        )}
        {deleteConfirm.visible && (
          <div className="delete-modal-overlay">
            <div className="delete-modal">
              <p>Delete attempt?</p>
              <div className="delete-modal-buttons">
                <button className={`modal-cancel-button ${isDeleting ? 'disabled-button' : ''}`} disabled={isDeleting} onClick={() => setDeleteConfirm({ visible: false, attemptId: null })}>Cancel</button>
                <button className={`modal-cancel-button ${isDeleting ? 'disabled-button' : ''}`} disabled={isDeleting} onClick={handleDeleteAttempt}>{isDeleting ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TestReview;
