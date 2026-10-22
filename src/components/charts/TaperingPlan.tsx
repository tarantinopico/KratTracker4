import React from 'react';
import { fmtDateShort } from '../../lib/date';

interface TaperingPlanProps {
  trajectory: Array<{ ts: number; plannedG: number; actualG: number }>;
}

export const TaperingPlan: React.FC<TaperingPlanProps> = ({ trajectory }) => {
  const W = 340;
  const H = 140;
  const padL = 24;
  const padR = 14;
  const padT = 14;
  const padB = 22;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const maxG = Math.max(
    10,
    ...trajectory.map((t) => Math.max(t.plannedG, t.actualG))
  );

  const toX = (i: number) =>
    trajectory.length <= 1 ? padL + cw / 2 : padL + (i / (trajectory.length - 1)) * cw;
  const toY = (v: number) => padT + ch - (Math.min(v, maxG) / maxG) * ch;

  const planPath = trajectory
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(t.plannedG).toFixed(1)}`)
    .join(' ');
  const actualPath = trajectory
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(t.actualG).toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Plán taperingu vs. skutečnost"
      >
        {planPath && (
          <path
            d={planPath}
            fill="none"
            stroke="var(--cyan)"
            strokeDasharray="4 3"
            strokeWidth="1.8"
          />
        )}
        {actualPath && (
          <path
            d={actualPath}
            fill="none"
            stroke="var(--warning)"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        )}
        {trajectory.length > 1 && (
          <>
            <text x={padL} y={H - 5} textAnchor="start" fontSize="8.5" fill="var(--muted)">
              {fmtDateShort(trajectory[0].ts)}
            </text>
            <text x={W - padR} y={H - 5} textAnchor="end" fontSize="8.5" fill="var(--muted)">
              Dnes
            </text>
          </>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        <span>
          <span className="dot" style={{ background: 'var(--cyan)', marginRight: 5 }} />
          Plán snižování
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--warning)', marginRight: 5 }} />
          Skutečná spotřeba
        </span>
      </div>
    </div>
  );
};
