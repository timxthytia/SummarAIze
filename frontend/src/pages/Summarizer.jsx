import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/Summarizer.css';
import DOMPurify from 'dompurify';

const TextSummarizer = () => {
  const [inputText, setInputText] = useState('');
  const [summaryType, setSummaryType] = useState('short');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('text');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showSaveOption, setShowSaveOption] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSummarize = async () => {
    if (authLoading || !user) {
      alert("You must be logged in to use this feature.");
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setShowSaveOption(false);

    try {
      if (mode === 'text') {
        if (!inputText.trim()) {
          setError("Please enter some text.");
          setLoading(false);
          return;
        }

        const response = await axios.post(`${import.meta.env.VITE_API_URL}/summarize`, {
          text: inputText,
          type: summaryType
        });

        setSummary(response.data.summary);
        setShowSaveOption(true);

      } else if (mode === 'file') {
        if (!selectedFile) {
          setError("Please upload a file.");
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', summaryType);

        const response = await axios.post(`${import.meta.env.VITE_API_URL}/summarize-file`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setSummary(response.data.summary);
        setShowSaveOption(true);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
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
      alert('Saved to Dashboard!');
      setTitle('');
      setShowSaveOption(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="summarizer-container">
      <NavbarLoggedin />
      <div className="summarizer-card">
        <h1 className="summarizer-title">Generate Your Own Personalised Summaries</h1>

        <div className="mode-toggle">
          <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>
            Text Mode
          </button>
          <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
            File Mode
          </button>
        </div>

        {mode === 'text' ? (
          <textarea
            className="input-textarea"
            placeholder="Enter text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        ) : (
          <div className="file-upload-section">
            <label>Upload PDF/DOCX:</label><br />
            <label className="custom-file-upload">
              Choose File
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </label>
            {selectedFile && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>
                {selectedFile.name}
              </div>
            )}
          </div>
        )}

        <button
          className="summarize-button"
          onClick={handleSummarize}
          disabled={loading || authLoading}
        >
          {loading ? "Summarizing..." : "Summarize"}
        </button>

        <div className="summary-options">
          <label>Summary Type:</label>
          <select
            value={summaryType}
            onChange={(e) => setSummaryType(e.target.value)}
            className="summary-select"
          >
            <option value="short">Short</option>
            <option value="long">Long</option>
            <option value="bullet">Bullet Points</option>
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        {summary && (
          <div className="summary-output">
            <h2>Summary:</h2>
            {summaryType === 'bullet' ? (
              <ul>
                {summary.split('\n').map((line, i) => (
                  <li key={i}>{line.replace(/^[-•*]\s*/, '')}</li>
                ))}
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
              className="save-summary-button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save to Dashboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextSummarizer;
