import React from 'react';
import { fmtDateShort } from '../../lib/date';
import { fmtG } from '../../lib/format';

interface StrainEvolutionProps {
  daily: Array<{ ts: number; dayKey: string; totalG: number; byStrain: Record<string, number> }>;
  activeStrains: Array<{ id: string; name: string; color: string; totalG: number }>;
}

export const StrainEvolution: React.FC<StrainEvolutionProps> = ({ daily, activeStrains }) => {
  const W = 340;
  const H = 135;
  const padL = 20;
  const padR = 12;
  const padT = 12;
  const padB = 20;
  const cw = W - padL - padR;
  const ch = H - padT - padB;
  const maxDayG = Math.max(5, ...daily.map((d) => d.totalG));
  const step = cw / Math.max(1, daily.length);
  const barW = Math.max(3, Math.min(11, step * 0.68));

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Evoluce podílu druhů"
      >
        {daily.map((d, i) => {
          const x = padL + i * step + (step - barW) / 2;
          let curBottom = padT + ch;
          return (
            <g key={d.dayKey}>
              {activeStrains.map((st) => {
                const g = d.byStrain[st.id] || 0;
                if (g <= 0) return null;
                const bh = (g / maxDayG) * ch;
                curBottom -= bh;
                return (
                  <rect
                    key={st.id}
                    x={x}
                    y={curBottom}
                    width={barW}
                    height={bh}
                    rx={1.5}
                    fill={st.color}
                  />
                );
              })}
            </g>
          );
        })}

        {daily.length > 1 && (
          <>
            <text x={padL} y={H - 4} textAnchor="start" fontSize="8.5" fill="var(--muted)">
              {fmtDateShort(daily[0].ts)}
            </text>
            <text x={W - padR} y={H - 4} textAnchor="end" fontSize="8.5" fill="var(--muted)">
              Dnes
            </text>
          </>
        )}
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontSize: 11 }}>
        {activeStrains.map((s) => (
          <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className="dot" style={{ background: s.color }} />
            <span>
              {s.name} ({fmtG(s.totalG)}g)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};
