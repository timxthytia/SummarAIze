import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';

const TestPaperDetail = () => {
  const { uid, id } = useParams();
  const navigate = useNavigate();
  const [testpaper, setTestpaper] = useState(null);
  const [loading, setLoading] = useState(true);

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
        console.error('Error fetching test paper:', error);
        alert('Failed to fetch test paper.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchTestpaper();
  }, [uid, id, navigate]);

  if (loading) {
    return (
      <>
        <NavbarLoggedin />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading test paper...</div>
      </>
    );
  }

  if (!testpaper) {
    return null; // Or fallback UI if you want
  }

  return (
    <>
      <NavbarLoggedin />
      <main>
        <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
        <h1>{testpaper.paperTitle || 'Untitled Test Paper'}</h1>
        <p>
          <strong>File Name:</strong> {testpaper.fileName || 'N/A'}
        </p>
        <p>
          <strong>Number of Pages:</strong> {testpaper.numPages || 'N/A'}
        </p>
        <p>
          <strong>Uploaded At:</strong>{' '}
          {testpaper.uploadedAt ? new Date(testpaper.uploadedAt).toLocaleString() : 'N/A'}
        </p>

        <h2>Questions by Page</h2>
        {testpaper.questionsByPage && testpaper.questionsByPage.length > 0 ? (
          testpaper.questionsByPage.map(({ page, questions }) => (
            <div key={page} style={{ marginBottom: '1.5rem' }}>
              <h3>Page {page}</h3>
              <ul>
                {questions.map((q) => (
                  <li key={q.id} style={{ marginBottom: '0.5rem' }}>
                    <strong>{q.type}</strong> — Marks: {q.marks} — Correct Answer
                    {q.multipleCorrect ? 's' : ''}:&nbsp;
                    {q.type === 'Other'
                      ? q.correctAnswer // For Other, assuming filename string or link
                      : Array.isArray(q.correctAnswer)
                      ? q.correctAnswer.join(', ')
                      : q.correctAnswer}
                  </li>
                ))}
              </ul>
            </div>
            ))
            ) : (
            <p>No questions available.</p>
            )}
        </div>
      </main>
      
    </>
  );
};

export default TestPaperDetail;