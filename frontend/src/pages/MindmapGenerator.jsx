import React, { useState, useEffect } from 'react';
import '../styles/MindmapGenerator.css';
import NavbarLoggedin from '../components/NavbarLoggedin';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const MindmapGenerator = () => {
    const [user, setUser] = useState(null);
    const [inputText, setInputText] = useState('');
    const [file, setFile] = useState(null);
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
        setNodes([]);
        setEdges([]);

        try {
            const response = await fetch('http://localhost:8000/generate-mindmap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: inputText }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate mind map');
            }

            const data = await response.json();

            const gridSpacingX = 300;
            const gridSpacingY = 200;
            const nodesPerRow = 4;

            const nodesWithPos = data.nodes.map((node, index) => {
              const row = Math.floor(index / nodesPerRow);
              const col = index % nodesPerRow;
              return {
                id: node.id,
                data: { label: node.label },
                position: {
                  x: col * gridSpacingX,
                  y: row * gridSpacingY
                }
              };
            });

            const edgesWithIds = data.edges.map((edge, index) => ({
              id: edge.id || `e${edge.source}-${edge.target}-${index}`,
              source: edge.source,
              target: edge.target,
              label: edge.label,
            }));

            setNodes(nodesWithPos);
            setEdges(edgesWithIds);
        } catch (error) {
            console.error('Error generating mind map:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMindmap = async () => {
      if (!mapTitle.trim() || !nodes.length || !user) return;
      try {
        await addDoc(collection(db, 'users', user.uid, 'mindmaps'), {
          title: mapTitle,
          nodes: nodes,
          edges: edges,
          timestamp: serverTimestamp(),
          uid: user.uid
        });
        alert('Mind map saved successfully!');
        setMapTitle('');
      } catch (err) {
        console.error('Error saving mindmap:', err);
        alert('Failed to save mind map.');
      }
    };

    const MindMapCanvas = () => {
      return (
        <div style={{ width: '100%', height: '600px' }}>
          <ReactFlow
            key={nodes.length}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            edgesFocusable={false}
            panOnDrag={true}
            panOnScroll={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
            minZoom={0.2}
            maxZoom={2}
          />
        </div>
      );
    };
    
    return (
      <ReactFlowProvider>
        <div className="mindmap-generator-container">
            <NavbarLoggedin user={user} />
            <h1>Mind Map Generator</h1>
            <textarea
                placeholder="Enter your text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="mindmap-textarea"
            />
            <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files[0])}
            />
            <button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Mind Map'}
            </button>
            <div className="mindmap-output">
              <MindMapCanvas />
              {nodes.length > 0 && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <input
                    type="text"
                    placeholder="Enter mind map title..."
                    value={mapTitle}
                    onChange={(e) => setMapTitle(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '8px', width: '60%', marginRight: '1rem' }}
                    />
                    <button onClick={handleSaveMindmap} className="generate-button">
                    Save Mind Map
                    </button>
                </div>
              )}
            </div>
        </div>
      </ReactFlowProvider>
    );
};

export default MindmapGenerator;
