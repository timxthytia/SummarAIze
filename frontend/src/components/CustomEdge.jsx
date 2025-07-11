import React from 'react';
import { getBezierPath } from 'reactflow';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  labelStyle,
  style = {},
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const fontColor = (labelStyle && labelStyle.fill) || '#000';
  const fontWeight = (labelStyle && labelStyle.fontWeight) || '600';

  return (
    <g>
      <path
        id={id}
        d={edgePath}
        stroke={style?.stroke || '#000'}
        strokeWidth={style?.strokeWidth || 1.5}
        fill="none"
        markerEnd={markerEnd ? `url(#${markerEnd.type})` : undefined}
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          fill={fontColor}
          fontWeight={fontWeight}
          fontSize="16"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{
            userSelect: 'none',
            paintOrder: 'stroke',
            stroke: 'white',
            strokeWidth: 3,
            strokeLinejoin: 'round',
            ...labelStyle,
          }}
        >
          <tspan
            x={labelX}
            y={labelY}
            fill={fontColor}
            fontWeight={fontWeight}
            stroke="white"
            strokeWidth={2}
          >
            {label}
          </tspan>
        </text>
      )}
    </g>
  );
};

export default CustomEdge;