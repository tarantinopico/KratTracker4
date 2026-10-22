import React from 'react';
import { fmtG, r1, r2 } from '../../lib/format';
import { Dose } from '../../types';

interface DoseEfficiencyScatterProps {
  doses: Dose[];
}

export const DoseEfficiencyScatter: React.FC<DoseEfficiencyScatterProps> = ({ doses }) => {
  const ratedDoses = doses.filter((d) => d.rating > 0 && d.amountG > 0);
  if (ratedDoses.length < 2) {
    return (
      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
        Ohodnoť alespoň 2 dávky hvězdičkami pro zobrazení matice efektivity dávkování.
      </div>
    );
  }

  const w = 480;
  const h = 155;
  const padL = 32;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  const maxG = Math.max(4, ...ratedDoses.map((d) => d.amountG)) * 1.1;

  const getX = (g: number) => padL + (Math.min(maxG, Math.max(0, g)) / maxG) * cw;
  const getY = (rating: number) => padT + ch - ((Math.min(5, Math.max(1, rating)) - 0.8) / 4.4) * ch;

  // Compute sweet-spot (average g of doses with rating >= 4)
  const highRated = ratedDoses.filter((d) => d.rating >= 4);
  const sweetSpotG =
    highRated.length > 0
      ? r2(highRated.reduce((a, d) => a + d.amountG, 0) / highRated.length)
      : r2(ratedDoses.reduce((a, d) => a + d.amountG, 0) / ratedDoses.length);

  // Efficiency index: rating per gram
  const avgRatingPerG = r1(
    ratedDoses.reduce((a, d) => a + d.rating / Math.max(0.5, d.amountG), 0) / ratedDoses.length
  );

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Sweet-spot vertical band */}
        <rect
          x={Math.max(padL, getX(sweetSpotG - 0.45))}
          y={padT}
          width={Math.max(16, getX(sweetSpotG + 0.45) - getX(sweetSpotG - 0.45))}
          height={ch}
          fill="rgba(48, 209, 88, 0.09)"
          rx="6"
        />

        {[1, 2, 3, 4, 5].map((star) => {
          const y = getY(star);
          return (
            <g key={star}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.7"
              />
              <text x={padL - 5} y={y + 3} textAnchor="end" fill="var(--faint)" fontSize="9.5">
                {star}★
              </text>
            </g>
          );
        })}

        {/* Scatter dots */}
        {ratedDoses.slice(-45).map((d, idx) => {
          const x = getX(d.amountG);
          const y = getY(d.rating) + ((idx % 3) - 1) * 2.2;
          return (
            <circle
              key={d.id}
              cx={x}
              cy={y}
              r={4.2}
              fill={d.strainColor || 'var(--accent)'}
              fillOpacity="0.82"
              stroke="#000"
              strokeWidth="0.9"
            />
          );
        })}

        {/* X axis labels */}
        <text x={padL} y={h - 6} fill="var(--muted)" fontSize="10">
          0 g
        </text>
        <text
          x={getX(sweetSpotG)}
          y={h - 6}
          textAnchor="middle"
          fill="var(--accent-light)"
          fontSize="10"
          fontWeight="700"
        >
          Optimum ~{fmtG(sweetSpotG)} g
        </text>
        <text x={w - padR} y={h - 6} textAnchor="end" fill="var(--muted)" fontSize="10">
          {fmtG(maxG)} g
        </text>
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11.5,
          color: 'var(--muted)',
          marginTop: 6,
          paddingTop: 6,
          borderTop: '0.5px solid var(--border-subtle)',
        }}
      >
        <span>
          Optimální dávka (★ ≥ 4): <strong style={{ color: 'var(--accent)' }}>{fmtG(sweetSpotG)} g</strong>
        </span>
        <span>
          Účinnost: <strong style={{ color: 'var(--text)' }}>{avgRatingPerG} ★ / 1 g</strong>
        </span>
      </div>
    </div>
  );
};
