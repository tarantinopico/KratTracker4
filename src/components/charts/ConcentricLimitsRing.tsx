import React from 'react';
import { clamp, fmtG } from '../../lib/format';

interface ConcentricLimitsRingProps {
  todayG: number;
  limitG: number;
  hardLimitG: number;
  todaySpend: number;
  budgetKc: number;
}

export const ConcentricLimitsRing: React.FC<ConcentricLimitsRingProps> = ({
  todayG,
  limitG,
  hardLimitG,
  todaySpend,
  budgetKc,
}) => {
  const gFrac = limitG > 0 ? clamp(todayG / limitG, 0, 1) : 0;
  const bFrac = budgetKc > 0 ? clamp(todaySpend / budgetKc, 0, 1) : 0;
  const overHard = hardLimitG > 0 && todayG >= hardLimitG;
  const overSoft = limitG > 0 && todayG > limitG;

  const r1 = 68;
  const r2 = 52;
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;

  const outerColor = overHard ? 'var(--danger)' : overSoft ? 'var(--warning)' : 'var(--accent)';
  const innerColor = todaySpend > budgetKc ? 'var(--danger)' : 'var(--cyan)';

  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        viewBox="0 0 180 170"
        style={{ width: '100%', maxWidth: 175, height: 'auto', display: 'block', margin: '0 auto' }}
        role="img"
        aria-label={`Dnešní spotřeba ${fmtG(todayG)} g`}
      >
        <g transform="rotate(-90 90 85)">
          <circle
            cx="90"
            cy="85"
            r={r1}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="11"
          />
          <circle
            cx="90"
            cy="85"
            r={r1}
            fill="none"
            stroke={outerColor}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={c1}
            strokeDashoffset={c1 * (1 - gFrac)}
          />
          <circle
            cx="90"
            cy="85"
            r={r2}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          <circle
            cx="90"
            cy="85"
            r={r2}
            fill="none"
            stroke={innerColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c2}
            strokeDashoffset={c2 * (1 - bFrac)}
          />
        </g>
        <text x="90" y="83" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">
          {fmtG(todayG)}g
        </text>
        <text x="90" y="101" textAnchor="middle" fill="var(--muted)" fontSize="10">
          🎯 Cíl {fmtG(limitG)}g
        </text>
      </svg>
    </div>
  );
};
