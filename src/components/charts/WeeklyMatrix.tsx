import React from 'react';
import { WD_SHORT } from '../../constants/defaults';

interface WeeklyMatrixProps {
  matrix: number[][];
  maxCount: number;
}

export const WeeklyMatrix: React.FC<WeeklyMatrixProps> = ({ matrix, maxCount }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '24px repeat(24, minmax(11px, 1fr))',
          gap: 2,
          fontSize: 9,
          color: 'var(--muted)',
          marginBottom: 3,
        }}
      >
        <span />
        {Array.from({ length: 24 }, (_, hr) => (
          <span key={hr} style={{ textAlign: 'center' }}>
            {hr % 4 === 0 ? hr : ''}
          </span>
        ))}
      </div>
      {matrix.map((row, wd) => (
        <div
          key={wd}
          style={{
            display: 'grid',
            gridTemplateColumns: '24px repeat(24, minmax(11px, 1fr))',
            gap: 2,
            marginBottom: 2,
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
            {WD_SHORT[wd]}
          </span>
          {row.map((cnt, hr) => {
            const alpha = maxCount > 0 && cnt > 0 ? 0.22 + (cnt / maxCount) * 0.75 : 0;
            return (
              <div
                key={hr}
                title={`${WD_SHORT[wd]} ${hr}:00 — ${cnt}×`}
                style={{
                  height: 14,
                  borderRadius: 3,
                  background:
                    cnt > 0 ? `rgba(48, 209, 88, ${alpha.toFixed(2)})` : 'rgba(255,255,255,0.04)',
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
