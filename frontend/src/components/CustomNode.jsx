import React from 'react';
import { Handle, Position } from 'reactflow';
import '../styles/MindmapDetail.css'; // Adjust the path if your CSS is elsewhere

const CustomNode = ({ data }) => (
  <div className="custom-node">
    <Handle type="target" position={Position.Top} id="t" className="custom-handle" />
    <Handle type="target" position={Position.Left} id="l" className="custom-handle" />
    <Handle type="target" position={Position.Right} id="r" className="custom-handle" />
    <Handle type="target" position={Position.Bottom} id="b" className="custom-handle" />

    <input
      type="text"
      value={data.label}
      onChange={(e) => data.onChange(e.target.value)}
      className="custom-node-input"
    />

    <Handle type="source" position={Position.Top} id="st" className="custom-handle" />
    <Handle type="source" position={Position.Left} id="sl" className="custom-handle" />
    <Handle type="source" position={Position.Right} id="sr" className="custom-handle" />
    <Handle type="source" position={Position.Bottom} id="sb" className="custom-handle" />
  </div>
);

export default CustomNode;