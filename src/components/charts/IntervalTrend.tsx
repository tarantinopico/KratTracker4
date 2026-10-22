import React from 'react';
import { DailyIntervalEntry } from '../../lib/analytics';
import { fmtDateShort } from '../../lib/date';

interface IntervalTrendProps {
  dailyHistory: DailyIntervalEntry[];
  thresholdH: number;
}

export const IntervalTrend: React.FC<IntervalTrendProps> = ({ dailyHistory, thresholdH }) => {
  const W = 340;
  const H = 140;
  const padL = 26;
  const padR = 14;
  const padT = 14;
  const padB = 22;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const maxH = Math.max(
    thresholdH * 1.6,
    ...dailyHistory.map((d) => d.avgH || 0),
    8
  );

  const toX = (i: number) =>
    dailyHistory.length <= 1 ? padL + cw / 2 : padL + (i / (dailyHistory.length - 1)) * cw;
  const toY = (v: number) => padT + ch - (Math.min(v, maxH) / maxH) * ch;

  const activePts = dailyHistory
    .map((d, i) => (d.avgH !== null ? { x: toX(i), y: toY(d.avgH), minH: d.minH, xIdx: i } : null))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const pathD = activePts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Historie rozestupů mezi dávkami"
    >
      <line
        x1={padL}
        y1={toY(thresholdH)}
        x2={W - padR}
        y2={toY(thresholdH)}
        stroke="var(--warning)"
        strokeDasharray="3 3"
        strokeWidth="1"
      />
      <text x={padL - 4} y={toY(thresholdH) + 3} textAnchor="end" fontSize="8" fill="var(--warning)">
        {thresholdH}h
      </text>

      {pathD && (
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      )}

      {activePts.map((p, idx) => (
        <g key={idx}>
          <circle cx={p.x} cy={p.y} r="2.8" fill="var(--accent)" />
          {p.minH !== null && p.minH < thresholdH && (
            <circle cx={p.x} cy={toY(p.minH)} r="2.5" fill="var(--danger)" />
          )}
        </g>
      ))}

      {dailyHistory.length > 1 && (
        <>
          <text x={padL} y={H - 5} textAnchor="start" fontSize="8.5" fill="var(--muted)">
            {fmtDateShort(dailyHistory[0].ts)}
          </text>
          <text x={W - padR} y={H - 5} textAnchor="end" fontSize="8.5" fill="var(--muted)">
            Dnes
          </text>
        </>
      )}
    </svg>
  );
};
