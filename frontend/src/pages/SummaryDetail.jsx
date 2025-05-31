import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
      <ReactQuill
        className="summary-text-editor"
        theme="snow"
        value={summary}
        onChange={setSummary}
        modules={{
          toolbar: [
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            ['link', 'clean']
          ]
        }}
        formats={[
          'header', 'bold', 'italic', 'underline', 'strike',
          'color', 'background', 'align', 'link'
        ]}
      />
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

export default SummaryDetail;