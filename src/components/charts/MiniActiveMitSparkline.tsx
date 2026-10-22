import React from 'react';
import { calcActiveMitAtTime } from '../../lib/pharmacokinetics';
import { Dose, Settings } from '../../types';

interface MiniActiveMitSparklineProps {
  doses: Dose[];
  settings: Pick<Settings, 'mitHalfLifeAlphaH' | 'mitHalfLifeBetaH' | 'mitTMaxH'>;
  now?: number;
}

export const MiniActiveMitSparkline: React.FC<MiniActiveMitSparklineProps> = ({
  doses,
  settings,
  now = Date.now(),
}) => {
  const w = 180;
  const h = 44;
  const steps = 24;
  const pts: Array<{ x: number; y: number; val: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const offsetH = -6 + (i / steps) * 12; // -6h to +6h
    const ts = now + offsetH * 3600000;
    const val = calcActiveMitAtTime(doses, settings, ts);
    pts.push({ x: (i / steps) * (w - 16) + 8, y: 0, val });
  }

  const maxVal = Math.max(15, ...pts.map((p) => p.val));
  pts.forEach((p) => {
    p.y = h - 8 - (p.val / maxVal) * (h - 16);
  });

  const pathD = pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const midPt = pts[Math.floor(steps / 2)];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', height: 'auto', display: 'block', marginTop: 4 }}
      role="img"
      aria-label="Křivka aktivního mitragyninu -6h až +6h"
    >
      <defs>
        <linearGradient id="miniMitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${h - 6} L ${pts[0].x.toFixed(1)} ${h - 6} Z`}
        fill="url(#miniMitGrad)"
      />
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={midPt.x} cy={midPt.y} r="3.2" fill="#ffd60a" />
      <text x={midPt.x + 5} y={Math.max(10, midPt.y - 3)} fontSize="8" fill="#ffd60a" fontWeight="700">
        Teď
      </text>
    </svg>
  );
};
