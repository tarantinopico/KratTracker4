import React from 'react';
import { DailyIntervalEntry } from '../../lib/analytics';

interface ComplianceRateProps {
  dailyHistory: DailyIntervalEntry[];
}

export const ComplianceRate: React.FC<ComplianceRateProps> = ({ dailyHistory }) => {
  const W = 340;
  const H = 120;
  const padL = 24;
  const padR = 12;
  const padT = 12;
  const padB = 18;
  const cw = W - padL - padR;
  const ch = H - padT - padB;
  const step = cw / Math.max(1, dailyHistory.length);
  const barW = Math.max(3, Math.min(10, step * 0.65));
  const y80 = padT + ch - 0.8 * ch;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Denní disciplína rozestupů"
    >
      <line
        x1={padL}
        y1={y80}
        x2={W - padR}
        y2={y80}
        stroke="var(--accent)"
        strokeDasharray="3 3"
        strokeWidth="1"
        opacity="0.65"
      />
      <text x={padL - 4} y={y80 + 3} textAnchor="end" fontSize="8" fill="var(--accent)">
        80%
      </text>

      {dailyHistory.map((d, i) => {
        if (d.compliancePct === null) return null;
        const bh = Math.max(4, (d.compliancePct / 100) * ch);
        const color =
          d.compliancePct >= 80
            ? 'var(--accent)'
            : d.compliancePct >= 50
            ? 'var(--warning)'
            : 'var(--danger)';
        return (
          <rect
            key={d.dayKey}
            x={padL + i * step + (step - barW) / 2}
            y={padT + ch - bh}
            width={barW}
            height={bh}
            rx={2}
            fill={color}
          />
        );
      })}
    </svg>
  );
};
