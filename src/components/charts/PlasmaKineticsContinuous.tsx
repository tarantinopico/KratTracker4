import React from 'react';
import { fmtDateShort } from '../../lib/date';
import { r1 } from '../../lib/format';

interface PlasmaKineticsContinuousProps {
  points: Array<{ ts: number; mg: number }>;
  maxMg: number;
  avgMg: number;
  currentMg: number;
}

export const PlasmaKineticsContinuous: React.FC<PlasmaKineticsContinuousProps> = ({
  points,
  maxMg,
  avgMg,
  currentMg,
}) => {
  const W = 340;
  const H = 140;
  const padL = 26;
  const padR = 14;
  const padT = 14;
  const padB = 20;
  const cw = W - padL - padR;
  const ch = H - padT - padB;
  const topVal = Math.max(20, maxMg * 1.15);

  const toX = (i: number) =>
    points.length <= 1 ? padL + cw / 2 : padL + (i / (points.length - 1)) * cw;
  const toY = (v: number) => padT + ch - (Math.min(v, topVal) / topVal) * ch;

  const pts = points.map((p, i) => ({ x: toX(i), y: toY(p.mg), ts: p.ts, mg: p.mg }));
  const pathD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD =
    pts.length > 1
      ? `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + ch} L ${pts[0].x.toFixed(1)} ${padT + ch} Z`
      : '';
  const lastPt = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Kontinuální plazmatická hladina MIT"
    >
      <defs>
        <linearGradient id="plasmaContGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {avgMg > 0 && (
        <line
          x1={padL}
          y1={toY(avgMg)}
          x2={W - padR}
          y2={toY(avgMg)}
          stroke="rgba(255,255,255,0.3)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
      )}

      {areaD && <path d={areaD} fill="url(#plasmaContGrad)" />}
      {pathD && <path d={pathD} fill="none" stroke="var(--cyan)" strokeWidth="1.9" />}

      {lastPt && (
        <g>
          <circle cx={lastPt.x} cy={lastPt.y} r="3.5" fill="#ffd60a" />
          <text
            x={lastPt.x - 6}
            y={Math.max(12, lastPt.y - 6)}
            textAnchor="end"
            fontSize="8.5"
            fontWeight="700"
            fill="#ffd60a"
          >
            {r1(currentMg)} mg teď
          </text>
        </g>
      )}

      {pts.length > 1 && (
        <>
          <text x={pts[0].x} y={H - 4} textAnchor="start" fontSize="8.5" fill="var(--muted)">
            {fmtDateShort(pts[0].ts)}
          </text>
          <text x={pts[pts.length - 1].x} y={H - 4} textAnchor="end" fontSize="8.5" fill="var(--muted)">
            Teď
          </text>
        </>
      )}
    </svg>
  );
};
