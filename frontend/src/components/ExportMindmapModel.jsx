import React, { useRef, useEffect, useState } from 'react';
import ReactFlow from 'reactflow';
import jsPDF from 'jspdf';
import CustomEdge from './CustomEdge';
import '../styles/ExportMindmapModel.css'

const ExportMindmapModal = ({
  open,
  onClose,
  mindmap,
  format,
  setFormat,
  nodes,
  edges,
  nodeTypes = {},
  edgeTypes = {},
}) => {
  const ref = useRef();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Fit all nodes in view when modal opens
    if (open && ref.current && ref.current.fitView) {
      setTimeout(() => ref.current.fitView(), 50);
    }
  }, [open, nodes, edges]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const container = document.getElementById('export-mindmap-canvas');
      if (!container) throw new Error('Export container not found');
      if (format === 'png') {
        const dataUrl = await toPng(container, { pixelRatio: 3, backgroundColor: '#fff' });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${mindmap?.title || 'mindmap'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'pdf') {
        const dataUrl = await toPng(container, { pixelRatio: 3, backgroundColor: '#fff' });
        const img = new window.Image();
        img.src = dataUrl;
        img.onload = () => {
          const pdf = new jsPDF({
            orientation: img.width > img.height ? 'l' : 'p',
            unit: 'pt',
            format: [img.width, img.height]
          });
          pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
          pdf.save(`${mindmap?.title || 'mindmap'}.pdf`);
        };
      }
    } catch (err) {
      alert('Failed to export mindmap.');
    }
    setExporting(false);
  };

  if (!open) return null;

  // Large, fixed size for best quality
  const WIDTH = 1600, HEIGHT = 1200;

  return (
    <div className="export-modal-overlay">
      <div className="export-modal-content">
        <button className="close-modal-button" onClick={onClose}>×</button>
        <h3>Export Mindmap: {mindmap?.title || ''}</h3>
        <div
          id="export-mindmap-canvas"
          style={{ width: WIDTH, height: HEIGHT, background: '#fff', margin: '0 auto', border: '1px solid #888', position: 'relative', maxWidth: '100%', maxHeight: '70vh', overflow: 'auto' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            ref={ref}
            style={{ width: '100%', height: '100%' }}
          />
          <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 99999,
                background: 'transparent',
                pointerEvents: 'all'
            }}
            tabIndex={-1}/>
        </div>
        <div className="export-controls">
          <select
            className="export-format-select"
            value={format}
            onChange={e => setFormat(e.target.value)}
          >
            <option value="png">PNG</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            className="export-button"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportMindmapModal;