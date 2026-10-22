import React from 'react';
import { fmtG } from '../../lib/format';
import { DoseDistributionResult } from '../../types';

interface DoseHistogramProps {
  dist: DoseDistributionResult;
}

export const DoseHistogram: React.FC<DoseHistogramProps> = ({ dist }) => {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {dist.bins.map((b) => (
          <div
            key={b.label}
            style={{ display: 'grid', gridTemplateColumns: '74px 1fr 48px', alignItems: 'center', gap: 8 }}
          >
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{b.label}</span>
            <div className="bento-meter-track" style={{ height: 8 }}>
              <div
                className="bento-meter-fill"
                style={{ width: `${b.pct}%`, background: b.color }}
              />
            </div>
            <span className="num" style={{ fontSize: 11.5, textAlign: 'right', fontWeight: 600 }}>
              {b.pct}% ({b.count})
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
        <div className="bento-subcell" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Medián</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>
            {fmtG(dist.median)} g
          </div>
        </div>
        <div className="bento-subcell" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Mód</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>
            {fmtG(dist.mode)} g
          </div>
        </div>
        <div className="bento-subcell" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Odchylka σ</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>
            ±{fmtG(dist.stdDev)} g
          </div>
        </div>
      </div>
    </div>
  );
};
