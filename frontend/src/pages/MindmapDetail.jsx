import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import NavbarLoggedin from '../components/NavbarLoggedin';
import CustomNode from '../components/CustomNode';
import ReactFlow, { useNodesState, useEdgesState, addEdge, Handle, Position, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import '../styles/MindmapDetail.css';

const nodeTypes = { custom: CustomNode };

const MindmapDetail = () => {
  const { uid, id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [timestamp, setTimestamp] = useState('');
  const [user, setUser] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMindmap = async () => {
      const docRef = doc(db, 'users', uid, 'mindmaps', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title || 'Untitled Mind Map');
        const typedNodes = (data.nodes || []).map(node => ({
          ...node,
          type: 'custom',
          data: {
            ...node.data,
            onChange: (newLabel) => {
              setNodes((nds) =>
                nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label: newLabel, onChange: n.data.onChange } } : n)
              );
            },
          },
        }));
        setNodes(typedNodes);
        setEdges(data.edges || []);
        setTimestamp(data.timestamp?.toDate().toLocaleString() || '');
      } else {
        navigate('/dashboard');
      }
    };

    fetchMindmap();
  }, [uid, id, navigate]);

  const handleSaveChanges = async () => {
    try {
      const docRef = doc(db, 'users', uid, 'mindmaps', id);

      const sanitizedNodes = nodes.map(({ id, type, position, data }) => ({
        id,
        type,
        position,
        data: {
          label: data.label
        }
      }));

      await updateDoc(docRef, {
        nodes: sanitizedNodes,
        edges
      });

      alert('Changes saved successfully.');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes.');
    }
  };

  const onConnect = (params) => {
    const label = prompt('Enter a label for this edge:');
    const newEdge = {
      ...params,
      id: `e${params.source}-${params.target}-${Date.now()}`,
      label: label || '',
    };
    setEdges((eds) => addEdge(newEdge, eds));
  };

  const handleNodeClick = (_, node) => {
    if (deleteMode) {
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
    }
  };

  const handleEdgeClick = (_, edge) => {
    if (deleteMode) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    } else {
      const newLabel = prompt('Edit edge label:', edge.label || '');
      if (newLabel !== null) {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === edge.id ? { ...e, label: newLabel } : e
          )
        );
      }
    }
  };

  const handleAddNode = () => {
    const id = `${+new Date()}`;
    const newNode = {
      id,
      type: 'custom',
      data: {
        label: 'New Node',
        onChange: (newLabel) => {
          setNodes((nds) =>
            nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: newLabel, onChange: n.data.onChange } } : n)
          );
        },
      },
      position: { x: Math.random() * 250, y: Math.random() * 250 }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="summary-detail-container">
      <NavbarLoggedin user={user} />
      <h2>{title}</h2>
      {timestamp && <p><small>Created: {timestamp}</small></p>}
      <button onClick={handleAddNode} className="add-node-btn">
        Add Node
      </button>
      <button onClick={() => setDeleteMode(!deleteMode)} className="delete-mode-btn">
        {deleteMode ? 'Exit Delete Mode' : 'Enter Delete Mode'}
      </button>
      <div style={{ height: '600px', background: 'white', borderRadius: '10px', marginTop: '1rem' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            fitView
            nodeTypes={nodeTypes}
          />
        </ReactFlowProvider>
      </div>
      <button onClick={handleSaveChanges} className="save-btn">
        Save Changes
      </button>
    </div>
  );
};

export default MindmapDetail;