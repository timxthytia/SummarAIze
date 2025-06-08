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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/generate-mindmap`, {
        text: inputText
      });

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
      alert('Error generating mindmap.');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="page-content">
            
        </div>
        <h1>Mind Map Generator</h1>
        <textarea
          placeholder="Enter your text here..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          rows={5}
          style={{ width: '100%', maxWidth: '800px', marginBottom: '10px' }}
        />
        <button onClick={handleGenerate} disabled={loading} style={{ marginBottom: '1rem' }}>
          {loading ? 'Generating...' : 'Generate Mind Map'}
        </button>

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
          <div style={{ marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="Enter mind map title..."
              value={mapTitle}
              onChange={e => setMapTitle(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', width: '60%', marginRight: '1rem' }}
            />
            <button onClick={handleSaveMindmap}>Save Mind Map</button>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default MindmapGenerator;
