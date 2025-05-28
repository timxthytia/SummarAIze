import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import '../styles/SummaryDetail.css';

const SummaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [type, setType] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const docRef = doc(db, 'summaries', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title);
        setSummary(data.summary);
        setType(data.type);
        setLastSaved(data.timestamp?.toDate().toLocaleString());
      } else {
        navigate('/dashboard'); // If not found
      }
    };

    fetchSummary();
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    const docRef = doc(db, 'summaries', id);
    await updateDoc(docRef, {
      summary
    });
    setLastSaved(new Date().toLocaleString());
    setSaving(false);
  };

  return (
    <div className="summary-detail-container">
      <h2>{title || 'Untitled'}</h2>
      {lastSaved && <p><small>Last saved: {lastSaved}</small></p>}
      <textarea
        className="summary-textarea"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

export default SummaryDetail;