import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/TestAttemptSetup.css';

const TestAttemptSetup = () => {
  const { uid, id } = useParams();
  const navigate = useNavigate();
  const [testpaper, setTestpaper] = useState(null);
  const [duration, setDuration] = useState(60); 
  const [user, setUser] = useState(null);

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
        alert('Failed to load test paper.');
        navigate('/dashboard');
      }
    };

    fetchTestpaper();
  }, [uid, id, navigate]);

  // Start attempt
  const handleStart = () => {
    navigate(`/testattempt/${uid}/${id}/exam`, {
      state: { duration },
    });
  };

  return (
    <div className="attempt-setup-container">
      <NavbarLoggedin user={user} />
      <main>
        <h2>Start Test Paper Attempt</h2>
        {testpaper ? (
          <div className="attempt-setup-card">
            <p><strong>Title:</strong> {testpaper.paperTitle}</p>
            <p><strong>Pages:</strong> {testpaper.numPages}</p>
            <label>
              Duration (minutes):
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={1}
              />
            </label>
            <button className="start-button" onClick={handleStart}>
              Start Paper
            </button>
          </div>
        ) : (
          <p>Loading test paper...</p>
        )}
      </main>
    </div>
  );
};

export default TestAttemptSetup;