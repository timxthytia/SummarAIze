import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import '../styles/CustomNode.css';

const CustomNode = ({ data }) => {
  const [text, setText] = useState(data.label || '');
  const [bgColor, setBgColor] = useState(data.bgColor || '#ffffff');
  const [borderColor, setBorderColor] = useState(data.borderColor || '#000000');
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const modalRef = React.useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorModalVisible && modalRef.current && !modalRef.current.contains(event.target)) {
        setColorModalVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [colorModalVisible]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    if (data.onChange) data.onChange(newText);
  };

  const handleBgColorChange = (e) => {
    const newColor = e.target.value;
    setBgColor(newColor);
    if (data.onChangeColors) data.onChangeColors({ bgColor: newColor, borderColor });
  };

  const handleBorderColorChange = (e) => {
    const newColor = e.target.value;
    setBorderColor(newColor);
    if (data.onChangeColors) data.onChangeColors({ bgColor, borderColor: newColor });
  };

  return (
    <>
      <div
        className="custom-node"
        style={{
          backgroundColor: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '4px',
          boxSizing: 'border-box',
          minWidth: 100,
          position: 'relative'
        }}
      >
        <Handle type="target" position={Position.Top} id="t" className="custom-handle" />
        <Handle type="target" position={Position.Left} id="l" className="custom-handle" />
        <Handle type="target" position={Position.Right} id="r" className="custom-handle" />
        <Handle type="target" position={Position.Bottom} id="b" className="custom-handle" />

        <textarea
          value={text}
          onChange={handleTextChange}
          className="custom-node-textarea"
          rows={1}
          style={{ overflow: 'hidden', resize: 'none' }}
        />

        <button
          className="node-options-button"
          onClick={() => setColorModalVisible(true)}
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            fontSize: '14px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ...
        </button>

        <Handle type="source" position={Position.Top} id="st" className="custom-handle" />
        <Handle type="source" position={Position.Left} id="sl" className="custom-handle" />
        <Handle type="source" position={Position.Right} id="sr" className="custom-handle" />
        <Handle type="source" position={Position.Bottom} id="sb" className="custom-handle" />
      </div>

      {colorModalVisible && (
        <div
          ref={modalRef}
          className="rename-modal"
          style={{
            position: 'absolute',
            top: '0',
            left: '105%',
            zIndex: 10,
            backgroundColor: '#fff',
            color: '#000',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minWidth: '160px'
          }}
        >
          <button
            className="close-modal-button"
            onClick={() => setColorModalVisible(false)}
            style={{
              position: 'absolute',
              top: '4px',
              right: '6px',
              border: 'none',
              background: 'transparent',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
          <h3 style={{ marginTop: '0.5rem' }}>Customize Node</h3>
          <label htmlFor="bg-color-picker" style={{ display: 'block', marginBottom: '8px', color: '#000' }}>
            <span style={{ marginRight: '6px' }}>Background:</span>
            <input
              id="bg-color-picker"
              type="color"
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value);
                if (data.onChangeColors) {
                  data.onChangeColors({ bgColor: e.target.value, borderColor });
                }
              }}
            />
          </label>
          <label htmlFor="border-color-picker" style={{ display: 'block', color: '#000' }}>
            <span style={{ marginRight: '6px' }}>Border:</span>
            <input
              id="border-color-picker"
              type="color"
              value={borderColor}
              onChange={(e) => {
                setBorderColor(e.target.value);
                if (data.onChangeColors) {
                  data.onChangeColors({ bgColor, borderColor: e.target.value });
                }
              }}
            />
          </label>
        </div>
      )}
    </>
  );
};

export default CustomNode;