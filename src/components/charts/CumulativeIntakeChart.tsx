import React from 'react';
import { CumulativePoint } from '../../lib/analytics';
import { fmtDateShort } from '../../lib/date';
import { fmtG } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';

interface CumulativeIntakeChartProps {
  points: CumulativePoint[];
  totalActualG: number;
  totalBudgetG: number;
  savedOrExcessG: number;
}

export const CumulativeIntakeChart: React.FC<CumulativeIntakeChartProps> = ({
  points,
  totalActualG,
  totalBudgetG,
  savedOrExcessG,
}) => {
  const lineThickness = useAppStore((s) => s.settings.chartLineThickness || 2.2);
  const showGrid = useAppStore((s) => s.settings.chartShowGridLines !== false);
  const fillOpacity = (useAppStore((s) => s.settings.chartFillOpacityPct ?? 24) / 100);

  if (!points.length) {
    return (
      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '14px 0' }}>
        Žádná data v tomto období.
      </div>
    );
  }

  const w = 480;
  const h = 155;
  const padL = 34;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  const maxVal = Math.max(10, totalActualG, totalBudgetG) * 1.08;
  const n = points.length;

  const getX = (i: number) => (n <= 1 ? padL + cw / 2 : padL + (i / (n - 1)) * cw);
  const getY = (val: number) => padT + ch - (Math.min(maxVal, Math.max(0, val)) / maxVal) * ch;

  const actualPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p.cumActualG).toFixed(1)}`)
    .join(' ');

  const budgetPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p.cumBudgetG).toFixed(1)}`)
    .join(' ');

  const areaPath = `${actualPath} L${getX(n - 1).toFixed(1)},${(padT + ch).toFixed(
    1
  )} L${getX(0).toFixed(1)},${(padT + ch).toFixed(1)} Z`;

  const isUnderBudget = savedOrExcessG >= 0;
  const strokeCol = isUnderBudget ? 'var(--accent)' : 'var(--warning)';

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="cumAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeCol} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={strokeCol} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {showGrid &&
          [0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + ch * (1 - frac);
            const val = Math.round(maxVal * frac);
            return (
              <g key={frac}>
                <line
                  x1={padL}
                  y1={y}
                  x2={w - padR}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="0.7"
                />
                <text x={padL - 5} y={y + 3} textAnchor="end" fill="var(--faint)" fontSize="9.5">
                  {val}g
                </text>
              </g>
            );
          })}

        {/* Area under actual */}
        <path d={areaPath} fill="url(#cumAreaGrad)" />

        {/* Budget trajectory dashed line */}
        <path
          d={budgetPath}
          fill="none"
          stroke="rgba(255,255,255,0.32)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Actual cumulative intake line */}
        <path
          d={actualPath}
          fill="none"
          stroke={strokeCol}
          strokeWidth={lineThickness}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End point marker */}
        <circle
          cx={getX(n - 1)}
          cy={getY(totalActualG)}
          r="4"
          fill={strokeCol}
          stroke="#000"
          strokeWidth="1.2"
        />

        {/* X axis labels */}
        <text x={padL} y={h - 5} fill="var(--muted)" fontSize="10">
          {fmtDateShort(points[0].ts)}
        </text>
        {n > 4 && (
          <text x={padL + cw / 2} y={h - 5} textAnchor="middle" fill="var(--muted)" fontSize="10">
            {fmtDateShort(points[Math.floor(n / 2)].ts)}
          </text>
        )}
        <text x={w - padR} y={h - 5} textAnchor="end" fill="var(--muted)" fontSize="10">
          {fmtDateShort(points[n - 1].ts)}
        </text>
      </svg>

      <div className="chart-header-stats">
        <div>
          <div className="stat-cell-label">Kumulativně</div>
          <div className="stat-cell-val privacy-val">{fmtG(totalActualG)} g</div>
        </div>
        <div>
          <div className="stat-cell-label">Rozpočet limitu</div>
          <div className="stat-cell-val">{fmtG(totalBudgetG)} g</div>
        </div>
        <div>
          <div className="stat-cell-label">{isUnderBudget ? 'Rezerva' : 'Nad limit'}</div>
          <div
            className="stat-cell-val"
            style={{ color: isUnderBudget ? 'var(--accent)' : 'var(--warning)' }}
          >
            {isUnderBudget ? `-${fmtG(savedOrExcessG)} g` : `+${fmtG(Math.abs(savedOrExcessG))} g`}
          </div>
        </div>
        <div>
          <div className="stat-cell-label">Plnění plánu</div>
          <div className="stat-cell-val">
            {totalBudgetG > 0 ? Math.round((totalActualG / totalBudgetG) * 100) : 0} %
          </div>
        </div>
      </div>
    </div>
  );
};
