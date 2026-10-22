import React from 'react';
import { WeekdayProfileEntry } from '../../lib/analytics';
import { fmtG, fmtKc } from '../../lib/format';

interface WeekdayProfileChartProps {
  entries: WeekdayProfileEntry[];
  limitG: number;
  currency: string;
}

export const WeekdayProfileChart: React.FC<WeekdayProfileChartProps> = ({
  entries,
  limitG,
  currency,
}) => {
  const maxVal = Math.max(1.5, ...entries.map((e) => e.avgG)) * 1.15;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 7,
          alignItems: 'end',
          height: 132,
          padding: '10px 4px 4px',
        }}
      >
        {entries.map((e) => {
          const pct = Math.min(100, Math.round((e.avgG / maxVal) * 100));
          const isOver = e.avgG > limitG;
          const isWeekend = e.dayIndex >= 5;
          const barCol = isOver
            ? 'var(--warning)'
            : isWeekend
            ? 'var(--cyan)'
            : 'var(--accent)';

          return (
            <div
              key={e.dayIndex}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                gap: 4,
              }}
            >
              <div
                className="num"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: isOver ? 'var(--warning)' : 'var(--text)',
                }}
              >
                {fmtG(e.avgG)}g
              </div>

              <div
                style={{
                  width: '100%',
                  maxWidth: 28,
                  height: 76,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  overflow: 'hidden',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(4, pct)}%`,
                    background: barCol,
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.25s ease',
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isWeekend ? 'var(--cyan)' : 'var(--muted)',
                }}
              >
                {e.label}
              </div>
              <div className="num privacy-val" style={{ fontSize: 9.5, color: 'var(--faint)' }}>
                {fmtKc(e.avgCost, currency)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
