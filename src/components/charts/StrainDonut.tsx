import React from 'react';
import { fmtG } from '../../lib/format';
import { StrainPartSummary } from '../../types';

interface StrainDonutProps {
  parts: StrainPartSummary[];
  totalG: number;
}

export const StrainDonut: React.FC<StrainDonutProps> = ({ parts, totalG }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  let accum = 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Podíl odrůd">
        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
          {totalG > 0 &&
            parts.map((p) => {
              const frac = p.g / totalG;
              const segLen = frac * c;
              const offset = -accum * c;
              accum += frac;
              return (
                <circle
                  key={p.id}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={p.color}
                  strokeWidth="14"
                  strokeDasharray={`${segLen} ${c}`}
                  strokeDashoffset={offset}
                />
              );
            })}
        </g>
        <text x="60" y="59" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="800" className="num">
          {fmtG(totalG)}g
        </text>
        <text x="60" y="72" textAnchor="middle" fill="var(--muted)" fontSize="8.5" fontWeight="600">
          GRAMŮ
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {parts.map((p) => {
          const pct = totalG > 0 ? Math.round((p.g / totalG) * 100) : 0;
          return (
            <div
              key={p.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span className="dot" style={{ background: p.color }} />
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
              </div>
              <div className="num" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                {fmtG(p.g)}g · {pct}% {p.avgRating ? `★${p.avgRating}` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
