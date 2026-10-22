import React from 'react';
import { clamp } from '../../lib/format';

interface TBreakSimulatorProps {
  currentScore: number;
  recoveryPerDay: number;
}

export const TBreakSimulator: React.FC<TBreakSimulatorProps> = ({
  currentScore,
  recoveryPerDay,
}) => {
  const milestones = [0, 1, 2, 3, 5, 7, 14];
  const points = milestones.map((d) => ({
    day: d,
    score: clamp(Math.round(currentScore + d * (recoveryPerDay || 15) * 0.75), 10, 100),
  }));

  const W = 340;
  const H = 135;
  const padL = 24;
  const padR = 16;
  const padT = 18;
  const padB = 22;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const toX = (idx: number) => padL + (idx / (points.length - 1)) * cw;
  const toY = (score: number) => padT + ch - (score / 100) * ch;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.score).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Simulátor regenerace receptorů při T-Breaku"
    >
      <line
        x1={padL}
        y1={toY(90)}
        x2={W - padR}
        y2={toY(90)}
        stroke="var(--accent)"
        strokeDasharray="3 3"
        strokeWidth="1"
        opacity="0.7"
      />
      <text x={padL - 4} y={toY(90) + 3} textAnchor="end" fontSize="8" fill="var(--accent)">
        90%
      </text>

      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />

      {points.map((p, i) => {
        const x = toX(i);
        const y = toY(p.score);
        return (
          <g key={p.day}>
            <circle cx={x} cy={y} r="3.2" fill="#fff" stroke="var(--accent)" strokeWidth="2" />
            <text x={x} y={Math.max(10, y - 6)} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff">
              {p.score}%
            </text>
            <text x={x} y={H - 5} textAnchor="middle" fontSize="8.5" fill="var(--muted)">
              {p.day === 0 ? 'Teď' : `+${p.day}d`}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
