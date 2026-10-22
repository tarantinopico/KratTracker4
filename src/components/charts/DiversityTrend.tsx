import React from 'react';

interface DiversityTrendProps {
  pct: number;
  shannonH: number;
  streak: number;
  lastStrainName: string;
  statusLabel: string;
  statusCls: 'opt' | 'mid' | 'danger';
  threshold: number;
}

export const DiversityTrend: React.FC<DiversityTrendProps> = ({
  pct,
  shannonH,
  streak,
  lastStrainName,
  statusLabel,
  statusCls,
  threshold,
}) => {
  const barColor =
    statusCls === 'opt'
      ? 'var(--accent)'
      : statusCls === 'mid'
      ? 'var(--warning)'
      : 'var(--danger)';

  const badgeCls = statusCls === 'opt' ? 'good' : statusCls === 'mid' ? 'warn' : 'danger';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <span className="num" style={{ fontSize: 22, fontWeight: 800 }}>
            {pct} %
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 8 }}>
            Shannon H&apos; = {shannonH}
          </span>
        </div>
        <span className={`delta-tag ${badgeCls}`}>{statusLabel}</span>
      </div>

      <div className="bento-meter-track" style={{ height: 8, marginBottom: 10 }}>
        <div className="bento-meter-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        Aktuální série jednoho druhu: <strong style={{ color: '#fff' }}>{streak}×</strong> ({lastStrainName}) ·
        doporučený limit rotace: ≤ {threshold}× po sobě.
      </div>
    </div>
  );
};
