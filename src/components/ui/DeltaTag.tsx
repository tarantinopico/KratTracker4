import React from 'react';

export interface DeltaTagProps {
  cur: number;
  prior: number;
  invert?: boolean;
  suffix?: string;
}

export const DeltaTag: React.FC<DeltaTagProps> = ({
  cur,
  prior,
  invert = true,
  suffix = '%',
}) => {
  if (!prior || prior <= 0) {
    return <span className="delta-tag">—</span>;
  }
  const diffPct = Math.round(((cur - prior) / prior) * 100);
  if (diffPct === 0) {
    return <span className="delta-tag">0{suffix}</span>;
  }
  const up = diffPct > 0;
  const cls = invert ? (up ? 'warn' : 'good') : up ? 'good' : 'warn';
  return (
    <span className={`delta-tag ${cls} num`}>
      {up ? '↑' : '↓'} {Math.abs(diffPct)}
      {suffix}
    </span>
  );
};
