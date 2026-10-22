import React from 'react';
import { fmtDateShort } from '../../lib/date';
import { fmtG } from '../../lib/format';
import { DailyAnalyticsEntry } from '../../types';

interface SmoothBezierChartProps {
  daily: DailyAnalyticsEntry[];
  limitG: number;
  hardLimitG: number;
  avgG: number;
}

export const SmoothBezierChart: React.FC<SmoothBezierChartProps> = ({
  daily,
  limitG,
  hardLimitG,
  avgG,
}) => {
  const W = 340;
  const H = 165;
  const padL = 26;
  const padR = 14;
  const padT = 18;
  const padB = 22;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const maxVal = Math.max(hardLimitG * 1.1, limitG * 1.2, ...daily.map((d) => d.g), 5);
  const toX = (i: number) =>
    daily.length <= 1 ? padL + cw / 2 : padL + (i / (daily.length - 1)) * cw;
  const toY = (v: number) => padT + ch - (Math.min(v, maxVal) / maxVal) * ch;

  const pts = daily.map((d, i) => ({ x: toX(i), y: toY(d.g), g: d.g, ts: d.ts }));

  const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cpx2 = p1.x - (p1.x - p0.x) * 0.45;
      d += ` C ${cpx1.toFixed(1)} ${p0.y.toFixed(1)}, ${cpx2.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  };

  // 7d moving average
  const maPts = daily.map((_, idx) => {
    const slice = daily.slice(Math.max(0, idx - 6), idx + 1);
    const avg = slice.reduce((a, x) => a + x.g, 0) / slice.length;
    return { x: toX(idx), y: toY(avg) };
  });

  const mainPath = buildSmoothPath(pts);
  const maPath = buildSmoothPath(maPts);
  const areaPath =
    pts.length > 1
      ? `${mainPath} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + ch} L ${pts[0].x.toFixed(1)} ${padT + ch} Z`
      : '';

  let peakIdx = 0;
  pts.forEach((p, idx) => {
    if (p.g > pts[peakIdx].g) peakIdx = idx;
  });
  const peakPt = pts[peakIdx];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Vyhlazená křivka denní spotřeby"
    >
      <defs>
        <linearGradient id="smoothGGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Reference lines */}
      {hardLimitG > 0 && hardLimitG <= maxVal && (
        <g>
          <line
            x1={padL}
            y1={toY(hardLimitG)}
            x2={W - padR}
            y2={toY(hardLimitG)}
            stroke="var(--danger)"
            strokeDasharray="3 3"
            strokeWidth="1"
            opacity="0.7"
          />
          <text x={padL - 4} y={toY(hardLimitG) + 3} textAnchor="end" fontSize="8" fill="var(--danger)">
            STOP
          </text>
        </g>
      )}
      {limitG > 0 && limitG <= maxVal && (
        <g>
          <line
            x1={padL}
            y1={toY(limitG)}
            x2={W - padR}
            y2={toY(limitG)}
            stroke="var(--warning)"
            strokeDasharray="4 3"
            strokeWidth="1"
            opacity="0.75"
          />
          <text x={padL - 4} y={toY(limitG) + 3} textAnchor="end" fontSize="8" fill="var(--warning)">
            LIM
          </text>
        </g>
      )}
      {avgG > 0 && (
        <line
          x1={padL}
          y1={toY(avgG)}
          x2={W - padR}
          y2={toY(avgG)}
          stroke="var(--accent)"
          strokeDasharray="2 3"
          strokeWidth="1"
          opacity="0.5"
        />
      )}

      {areaPath && <path d={areaPath} fill="url(#smoothGGrad)" />}
      {maPath && (
        <path
          d={maPath}
          fill="none"
          stroke="#ffd60a"
          strokeWidth="1.4"
          strokeDasharray="4 3"
          opacity="0.85"
        />
      )}
      {mainPath && (
        <path d={mainPath} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      )}

      {peakPt && peakPt.g > 0 && (
        <g>
          <circle cx={peakPt.x} cy={peakPt.y} r="3.5" fill="#fff" stroke="var(--accent)" strokeWidth="2" />
          <text
            x={Math.min(W - 24, Math.max(24, peakPt.x))}
            y={Math.max(11, peakPt.y - 6)}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="700"
            fill="#fff"
          >
            {fmtG(peakPt.g)}g
          </text>
        </g>
      )}

      {/* X axis date labels */}
      {pts.length > 1 && (
        <>
          <text x={pts[0].x} y={H - 5} textAnchor="start" fontSize="8.5" fill="var(--muted)">
            {fmtDateShort(pts[0].ts)}
          </text>
          <text
            x={pts[Math.floor(pts.length / 2)].x}
            y={H - 5}
            textAnchor="middle"
            fontSize="8.5"
            fill="var(--muted)"
          >
            {fmtDateShort(pts[Math.floor(pts.length / 2)].ts)}
          </text>
          <text x={pts[pts.length - 1].x} y={H - 5} textAnchor="end" fontSize="8.5" fill="var(--muted)">
            Dnes
          </text>
        </>
      )}
    </svg>
  );
};
