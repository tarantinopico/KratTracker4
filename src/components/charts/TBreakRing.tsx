import React from 'react';
import { clamp } from '../../lib/format';

interface TBreakRingProps {
  pct: number;
  size?: number;
}

export const TBreakRing: React.FC<TBreakRingProps> = ({ pct, size = 68 }) => {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const clamped = clamp(pct, 0, 100);
  const offset = c * (1 - clamped / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0 }}
      role="img"
      aria-label={`T-Break postup ${clamped}%`}
    >
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </g>
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fill="#fff"
        fontSize="13"
        fontWeight="700"
      >
        {clamped}%
      </text>
    </svg>
  );
};
