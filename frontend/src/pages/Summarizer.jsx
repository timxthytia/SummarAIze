import React, { useState } from 'react';
import axios from 'axios';

const Summarizer = () => {
  const [inputText, setInputText] = useState('');
  const [summaryType, setSummaryType] = useState('short');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const summarizeText = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/summarize', {
        text: inputText,
        type: summaryType,
      });
      setSummary(res.data.summary);
    } catch (error) {
      console.error('Error summarizing:', error);
      alert('Failed to summarize. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="summarizer-container">
      <textarea
        rows={10}
        placeholder="Paste your text here..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />

      <select value={summaryType} onChange={(e) => setSummaryType(e.target.value)}>
        <option value="short">Short Paragraph</option>
        <option value="long">Long Paragraph</option>
        <option value="bullet">Bullet Points</option>
      </select>

      <button onClick={summarizeText} disabled={loading}>
        {loading ? 'Summarizing...' : 'Summarize'}
      </button>

      <div className="summary-output">
        <h3>Summary:</h3>
        <p>{summary}</p>
      </div>
    </div>
  );
};

export default Summarizer;