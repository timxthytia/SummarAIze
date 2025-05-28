import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../styles/Summarizer.css';

const TextSummarizer = () => {
  const [inputText, setInputText] = useState('');
  const [summaryType, setSummaryType] = useState('short');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('')
  const [mode, setMode] = useState('text');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showSaveOption, setShowSaveOption] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Wait for auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            console.log("User authenticated:", currentUser.email);
        } else {
            console.log("No user logged in.")
        }
      setAuthLoading(false); // Done loading user
    });
    return () => unsubscribe();
  }, []);

  const handleSummarize = async () => {
    if (authLoading) {
      alert("Authentication is still loading. Please wait a moment.");
      return;
    }
    if (!user) {
      alert("You must be logged in to generate and save summaries.");
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setShowSaveOption(false);

    try {
      if (mode === 'text') {
        if (!inputText.trim()) {
          setError("Please enter some text to summarize.");
          setLoading(false);
          return;
        }

        const response = await axios.post('http://localhost:8000/summarize', {
          text: inputText,
          type: summaryType
        });

        const generatedSummary = response.data.summary;
        setSummary(generatedSummary);
        setShowSaveOption(true);

        /*
        await addDoc(collection(db, 'summaries'), {
          uid: user.uid,
          text: inputText,
          summary: generatedSummary,
          type: summaryType,
          timestamp: serverTimestamp()
        });
        */

      } else if (mode === 'file') {
        if (!selectedFile) {
          setError("Please upload a file before summarizing.");
          setLoading(false);
          return;
        }
        const formData = new FormData();
        /*
        const storage = getStorage();
        const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile);
        const fileURL = await getDownloadURL(storageRef);
        */
        
        formData.append('file', selectedFile);
        formData.append('type', summaryType);

        const response = await axios.post('http://localhost:8000/summarize-file', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        const generatedSummary = response.data.summary;
        setSummary(generatedSummary);
        setShowSaveOption(true);

        /*
        await addDoc(collection(db, 'summaries'), {
          uid: user.uid,
          fileName: selectedFile.name,
          // fileURL, // Wanted store fileURL within Firestore but doesnt work for now
          summary: generatedSummary,
          type: summaryType,
          timestamp: serverTimestamp()
        });
        */
      }
    } catch (err) {
      console.error("Error summarizing or saving:", err);
      setError('Failed to generate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!user || !summary || !title.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'summaries'), {
        uid: user.uid,
        title,
        summary,
        type: summaryType,
        timestamp: serverTimestamp()
      });
      alert('Summary saved to Dashboard!');
      setTitle('');
      setShowSaveOption(false);
    } catch (err) {
      console.error('Error saving summary:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setSelectedFile(file);
  };

  return (
    <div className="summarizer-container">
      <div className="summarizer-card">
        <h1 className="summarizer-title">Text Summarizer</h1>
        <div className="mode-toggle">
          <button
            className={mode === 'text' ? 'active' : ''}
            onClick={() => setMode('text')}>
            Text Mode
          </button>
          <button
            className={mode === 'file' ? 'active' : ''}
            onClick={() => setMode('file')}>
            File Mode
          </button>
        </div>

        {mode === 'text' && (
          <>
            <textarea
              className="input-textarea"
              placeholder="Enter text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </>
        )}

        {mode === 'file' && (
          <div className="file-upload-section">
            <label>Upload a PDF/DOCX:</label>
            <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} />
          </div>
        )}

        <button className="summarize-button" onClick={handleSummarize} disabled={loading || authLoading}>
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>

        <div className="summary-options">
          <label>Summary Type:</label>
          <select
            className="summary-select"
            value={summaryType}
            onChange={(e) => setSummaryType(e.target.value)}
          >
            <option value="short">Short Paragraph</option>
            <option value="long">Long Paragraph</option>
            <option value="bullet">Bullet Points</option>
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        {summary && (
          <div className="summary-output">
            <h2>Summary:</h2>
            {summaryType === 'bullet' ? (
              <ul>
                {summary
                    .split('\n')
                    .map((point, idx) => {
                        const cleanPoint = point.replace(/^[-•*]\s*/, ''); // remove leading bullet
                        return <li key={idx}>{cleanPoint}</li>;
                })}
              </ul>
            ) : (
              <p>{summary}</p>
            )}
          </div>
        )}

        {showSaveOption && (
          <div className="save-summary-section">
            <input
              type="text"
              placeholder="Enter title for your summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="summary-title-input"
            />
            <button
              onClick={handleSaveToFirestore}
              disabled={!title.trim() || saving}
              className="save-summary-button"
            >
              {saving ? 'Saving...' : 'Save to Dashboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextSummarizer;