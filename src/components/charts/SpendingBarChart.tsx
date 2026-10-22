import React from 'react';
import { fmtDateShort } from '../../lib/date';
import { DailyAnalyticsEntry } from '../../types';

interface SpendingBarChartProps {
  daily: DailyAnalyticsEntry[];
  dailyBudgetKc: number;
}

export const SpendingBarChart: React.FC<SpendingBarChartProps> = ({ daily, dailyBudgetKc }) => {
  const W = 340;
  const H = 145;
  const padL = 26;
  const padR = 12;
  const padT = 14;
  const padB = 22;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const maxCost = Math.max(
    dailyBudgetKc * 1.15,
    ...daily.map((d) => d.kratomCost + d.bevCost),
    50
  );
  const barStep = cw / Math.max(1, daily.length);
  const barW = Math.max(3, Math.min(12, barStep * 0.68));
  const toY = (v: number) => padT + ch - (Math.min(v, maxCost) / maxCost) * ch;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Finanční útrata po dnech"
      >
        {dailyBudgetKc > 0 && (
          <g>
            <line
              x1={padL}
              y1={toY(dailyBudgetKc)}
              x2={W - padR}
              y2={toY(dailyBudgetKc)}
              stroke="var(--danger)"
              strokeDasharray="3 3"
              strokeWidth="1"
              opacity="0.75"
            />
            <text x={padL - 4} y={toY(dailyBudgetKc) + 3} textAnchor="end" fontSize="8" fill="var(--danger)">
              MAX
            </text>
          </g>
        )}

        {daily.map((d, i) => {
          const x = padL + i * barStep + (barStep - barW) / 2;
          const kH = (d.kratomCost / maxCost) * ch;
          const bH = (d.bevCost / maxCost) * ch;
          return (
            <g key={d.dayKey}>
              {kH > 0 && (
                <rect
                  x={x}
                  y={padT + ch - kH}
                  width={barW}
                  height={kH}
                  rx={2}
                  fill="var(--warning)"
                />
              )}
              {bH > 0 && (
                <rect
                  x={x}
                  y={padT + ch - kH - bH}
                  width={barW}
                  height={bH}
                  rx={2}
                  fill="var(--cyan)"
                />
              )}
            </g>
          );
        })}

        {daily.length > 1 && (
          <>
            <text x={padL} y={H - 5} textAnchor="start" fontSize="8.5" fill="var(--muted)">
              {fmtDateShort(daily[0].ts)}
            </text>
            <text x={W - padR} y={H - 5} textAnchor="end" fontSize="8.5" fill="var(--muted)">
              Dnes
            </text>
          </>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        <span>
          <span className="dot" style={{ background: 'var(--warning)', marginRight: 5 }} />
          Kratom
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--cyan)', marginRight: 5 }} />
          Nápoje
        </span>
      </div>
    </div>
  );
};
