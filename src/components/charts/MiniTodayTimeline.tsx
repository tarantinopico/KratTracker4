import React from 'react';
import { Dose } from '../../types';

interface MiniTodayTimelineProps {
  doses: Dose[];
}

export const MiniTodayTimeline: React.FC<MiniTodayTimelineProps> = ({ doses }) => {
  const maxG = Math.max(4, ...doses.map((d) => d.amountG));
  const w = 220;
  const h = 54;
  const padX = 12;
  const chartW = w - padX * 2;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Časová osa dnešních dávek"
    >
      <line x1={padX} y1={38} x2={w - padX} y2={38} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {[6, 12, 18, 24].map((hr) => {
        const x = padX + ((hr - 6) / 18) * chartW;
        return (
          <g key={hr}>
            <line x1={x} y1={35} x2={x} y2={40} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <text x={x} y={50} textAnchor="middle" fontSize="8.5" fill="var(--muted)">
              {String(hr).padStart(2, '0')}h
            </text>
          </g>
        );
      })}
      {doses.map((d) => {
        const dt = new Date(d.timestamp);
        const hr = dt.getHours() + dt.getMinutes() / 60;
        const clampedHr = Math.min(24, Math.max(6, hr));
        const x = padX + ((clampedHr - 6) / 18) * chartW;
        const barH = Math.max(6, (d.amountG / maxG) * 30);
        return (
          <rect
            key={d.id}
            x={x - 3.5}
            y={38 - barH}
            width={7}
            height={barH}
            rx={3}
            fill={d.strainColor || 'var(--accent)'}
          />
        );
      })}
    </svg>
  );
};
