import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import NavbarLoggedin from '../components/NavbarLoggedin';
import '../styles/SummaryDetail.css';
import PopupModal from '../components/PopupModal';

const SummaryDetail = () => {
  const { uid, id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [type, setType] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [user, setUser] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMsg, setPopupMsg] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      const docRef = doc(db, 'users', uid, 'summaries', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title);
        setSummary(data.summary);
        setType(data.type);
        setLastSaved(data.timestamp?.toDate().toLocaleString());
      } else {
        navigate('/dashboard');
      }
    };

    fetchSummary();
  }, [uid, id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'users', uid, 'summaries', id);
      await updateDoc(docRef, { summary });
      setLastSaved(new Date().toLocaleString());
      setPopupMsg('Changes saved successfully.');
      setPopupOpen(true);
    } catch (e) {
      console.error(e);
      setPopupMsg('Failed to save changes. Please try again.');
      setPopupOpen(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="summary-detail-container">
      <NavbarLoggedin user={user} />
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
            ['bold', 'italic', 'underline'],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            ['clean']
          ]
        }}
        formats={[
          'header', 'bold', 'italic', 'underline',
          'color', 'background', 'align'
        ]}
      />
      <button className="save-buttonn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
      {popupOpen && (
        <PopupModal
          message={popupMsg}
          confirmText="OK"
          onConfirm={() => {
            setPopupOpen(false);
            setSaving(false);
          }}
        />
      )}
    </div>
  );
};

export default SummaryDetail;
