import React, { useState, useEffect } from 'react';
import '../styles/MindmapGenerator.css';
import NavbarLoggedin from '../components/NavbarLoggedin';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';

const MindmapGenerator = () => {
  const [user, setUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapTitle, setMapTitle] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mode, setMode] = useState('text'); // "text" or "file"
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Generate mindmap 
  const handleGenerate = async () => {
    if (mode === 'text') {
      if (!inputText.trim()) return;
    } else if (mode === 'file') {
      if (!selectedFile) return;
    }
    setLoading(true);
    try {
      let response;
      if (mode === 'text') {
        response = await axios.post(`${import.meta.env.VITE_API_URL}/generate-mindmap`, {
          text: inputText
        });
      } else {
        const formData = new FormData();
        formData.append('file', selectedFile);
        response = await axios.post(`${import.meta.env.VITE_API_URL}/generate-mindmap-file`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      const { nodes: genNodes, edges: genEdges } = response.data;

      setNodes(
        genNodes.map((node, index) => {
          const col = index % 4;
          const row = Math.floor(index / 4);
          return {
            ...node,
            position: {
              x: col * 300,
              y: row * 200
            },
            data: {
              label: node.label
            }
          };
        })
      );

      setEdges(genEdges.map(edge => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#000000' },
        label: edge.label || ''
      })));
    } catch (err) {
      console.error('Error generating mindmap:', err);
      if (err.response?.data?.detail) {
        alert(`Error: ${err.response.data.detail}`);
      } else {
        alert('An unexpected error occurred while generating the mindmap.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Save mindmap data to firestore db, including nodes and edge positions
  const handleSaveMindmap = async () => {
    if (!user || !mapTitle.trim() || nodes.length === 0) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'mindmaps'), {
        title: mapTitle,
        nodes,
        edges,
        uid: user.uid,
        timestamp: serverTimestamp()
      });
      alert('Mindmap saved successfully!');
      setMapTitle('');
    } catch (err) {
      console.error('Error saving mindmap:', err);
      alert('Failed to save mindmap.');
    }
  };


  return (
    <ReactFlowProvider>
      <div className="mindmap-generator-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NavbarLoggedin user={user} />
        <div className="mode-toggle">
          <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>
            Text Mode
          </button>
          <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
            File Mode
          </button>
        </div>
        <main></main>
        <h1>Mind Map Generator</h1>
        {mode === 'text' ? (
          <>
            <textarea
              placeholder="Enter your text here..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={5}
              style={{ width: '100%', maxWidth: '800px', marginBottom: '10px' }}
            />
            <button className='mindmap-button' onClick={handleGenerate} disabled={loading} style={{ marginBottom: '1rem' }}>
              {loading ? 'Generating...' : 'Generate Mind Map'}
            </button>
          </>
        ) : (
          <div className="file-upload-section" style={{ marginBottom: '1rem' }}>
            <label>Upload PDF/ DOCX/ Image:</label><br />
            <label className="custom-file-upload">
              Choose File
              <input
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={e => setSelectedFile(e.target.files[0])}
              />
            </label>
            {selectedFile && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                {selectedFile.name}
              </div>
            )}
            <button className='mindmap-button' onClick={handleGenerate} disabled={loading || !selectedFile} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Generating...' : 'Generate Mind Map'}
            </button>
          </div>
        )}

        <div className='mindmap-flow-wrapper'>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={false}
            edgesFocusable={true}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode={null}
          />
        </div>

        {nodes.length > 0 && (
          <div className='save-container' style={{ marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="Enter mind map title..."
              value={mapTitle}
              onChange={e => setMapTitle(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', width: '60%', marginRight: '1rem' }}
            />
            <button className='mindmap-button' onClick={handleSaveMindmap}>Save</button>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default MindmapGenerator;
