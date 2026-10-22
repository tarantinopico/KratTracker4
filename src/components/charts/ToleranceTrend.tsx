import React from 'react';
import { fmtDateShort } from '../../lib/date';

interface ToleranceTrendProps {
  history: Array<{ ts: number; score: number }>;
}

export const ToleranceTrend: React.FC<ToleranceTrendProps> = ({ history }) => {
  const W = 340;
  const H = 140;
  const padL = 24;
  const padR = 14;
  const padT = 12;
  const padB = 22;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const toX = (i: number) =>
    history.length <= 1 ? padL + cw / 2 : padL + (i / (history.length - 1)) * cw;
  const toY = (score: number) => padT + ch - (score / 100) * ch;

  const pts = history.map((h, i) => ({ x: toX(i), y: toY(h.score), score: h.score, ts: h.ts }));
  const pathD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const lastPt = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Vývoj citlivosti receptorů"
    >
      {/* Background zones */}
      <rect x={padL} y={toY(100)} width={cw} height={toY(80) - toY(100)} fill="rgba(48,209,88,0.08)" />
      <rect x={padL} y={toY(80)} width={cw} height={toY(50) - toY(80)} fill="rgba(255,159,10,0.06)" />
      <rect x={padL} y={toY(50)} width={cw} height={toY(0) - toY(50)} fill="rgba(255,69,58,0.07)" />

      <line
        x1={padL}
        y1={toY(80)}
        x2={W - padR}
        y2={toY(80)}
        stroke="var(--accent)"
        strokeDasharray="3 3"
        strokeWidth="0.9"
        opacity="0.6"
      />
      <line
        x1={padL}
        y1={toY(50)}
        x2={W - padR}
        y2={toY(50)}
        stroke="var(--danger)"
        strokeDasharray="3 3"
        strokeWidth="0.9"
        opacity="0.6"
      />
      <text x={padL - 4} y={toY(80) + 3} textAnchor="end" fontSize="8" fill="var(--accent)">
        80%
      </text>
      <text x={padL - 4} y={toY(50) + 3} textAnchor="end" fontSize="8" fill="var(--danger)">
        50%
      </text>

      {pathD && (
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      )}

      {lastPt && (
        <g>
          <circle cx={lastPt.x} cy={lastPt.y} r="6" fill="var(--accent)" opacity="0.25" />
          <circle cx={lastPt.x} cy={lastPt.y} r="3.5" fill="var(--accent)" />
        </g>
      )}

      {pts.length > 1 && (
        <>
          <text x={pts[0].x} y={H - 5} textAnchor="start" fontSize="8.5" fill="var(--muted)">
            {fmtDateShort(pts[0].ts)}
          </text>
          <text x={pts[pts.length - 1].x} y={H - 5} textAnchor="end" fontSize="8.5" fill="var(--muted)">
            Dnes
          </text>
        </>
      )}
    </svg>
  );
};
