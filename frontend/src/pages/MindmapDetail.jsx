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
  const [edgeModal, setEdgeModal] = useState({ visible: false, edgeId: '', label: '' });

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
                nds.map((n) =>
                  n.id === node.id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          label: newLabel,
                          onChange: n.data.onChange,
                          onChangeColors: n.data.onChangeColors
                        }
                      }
                    : n
                )
              );
            },
            onChangeColors: ({ bgColor, borderColor }) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          bgColor,
                          borderColor,
                          onChange: n.data.onChange,
                          onChangeColors: n.data.onChangeColors
                        }
                      }
                    : n
                )
              );
            }
          }
        }));
        setNodes(typedNodes);
        setEdges(
          (data.edges || []).map(edge => ({
            ...edge,
            style: { stroke: '#000000', strokeWidth: 1.5 },
            labelStyle: { fill: '#000000', fontWeight: '600' }
          }))
        );
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
          label: data.label || '',
          bgColor: data.bgColor || '#ffffff',
          borderColor: data.borderColor || '#000000'
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
    const newEdgeId = `e${params.source}-${params.target}-${Date.now()}`;
    setEdgeModal({
      visible: true,
      edgeId: newEdgeId,
      label: '',
      connection: {
        ...params,
        id: newEdgeId
      }
    });
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
      setEdgeModal({
        visible: true,
        edgeId: edge.id,
        label: edge.label || ''
      });
    }
  };

  const handleConfirmEdgeLabel = () => {
    if (edgeModal.connection) {
      const newEdge = {
        ...edgeModal.connection,
        id: edgeModal.edgeId,
        label: edgeModal.label,
        style: { stroke: '#000000', strokeWidth: 1.5 },
        labelStyle: { fill: '#000000', fontWeight: '600' }
      };
      setEdges((eds) => addEdge(newEdge, eds));
    } else {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeModal.edgeId ? { ...e, label: edgeModal.label } : e
        )
      );
    }
    setEdgeModal({ visible: false, edgeId: '', label: '' });
  };

  const handleAddNode = () => {
    const id = `${+new Date()}`;
    const newNode = {
      id,
      type: 'custom',
      data: {
        label: 'New Node',
        bgColor: '#ffffff',
        borderColor: '#000000',
        onChange: (newLabel) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      label: newLabel,
                      onChange: n.data.onChange,
                      onChangeColors: n.data.onChangeColors
                    }
                  }
                : n
            )
          );
        },
        onChangeColors: ({ bgColor, borderColor }) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      bgColor,
                      borderColor,
                      onChange: n.data.onChange,
                      onChangeColors: n.data.onChangeColors
                    }
                  }
                : n
            )
          );
        }
      },
      position: { x: Math.random() * 250, y: Math.random() * 250 }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="summary-detail-container">
      <NavbarLoggedin user={user} />
      <main className="page-content">
        <h2>{title}</h2>
        {timestamp && <p><small>Created: {timestamp}</small></p>}
        <button onClick={handleAddNode} className="add-node-btn">
          Add Node
        </button>
        <button onClick={() => setDeleteMode(!deleteMode)} className="delete-mode-btn">
          {deleteMode ? 'Exit' : 'Delete Mode'}
        </button>
        {deleteMode && (
          <p style={{ color: '#d32f2f', fontSize: '14px', marginTop: '0.5rem' }}>
            Click on nodes or edges you wish to delete
          </p>
        )}
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
        {edgeModal.visible && (
          <div className="rename-modal-overlay">
            <div className="rename-modal">
              <button
                className="close-modal-button"
                onClick={() => setEdgeModal({ visible: false, edgeId: '', label: '' })}
              >
                ×
              </button>
              <h3>{edgeModal.connection ? 'Create Edge Label' : 'Edit Edge Label'}</h3>
              <input
                type="text"
                value={edgeModal.label}
                onChange={(e) => setEdgeModal(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Edge label"
              />
              <button
                onClick={handleConfirmEdgeLabel}
                className="confirm-rename-button"
                //disabled={!edgeModal.label.trim()}
              >
                {edgeModal.connection ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MindmapDetail;