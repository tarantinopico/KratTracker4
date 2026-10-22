import React from 'react';
import { fmtDateShort } from '../../lib/date';
import { fmtMg, r1 } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';
import { DailyAnalyticsEntry } from '../../types';

interface AlkaloidRatioChartProps {
  daily: DailyAnalyticsEntry[];
  sevenOhMultiplier: number;
}

export const AlkaloidRatioChart: React.FC<AlkaloidRatioChartProps> = ({
  daily,
  sevenOhMultiplier,
}) => {
  const lineThickness = useAppStore((s) => s.settings.chartLineThickness || 2.2);
  const showGrid = useAppStore((s) => s.settings.chartShowGridLines !== false);

  if (!daily.length) return null;

  const w = 480;
  const h = 150;
  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  const points = daily.map((d) => {
    const mit = d.mitMg || 0;
    const sevenOhEq = (d.sevenOhMg || 0) * sevenOhMultiplier;
    return {
      ts: d.ts,
      mit,
      sevenOhRaw: d.sevenOhMg || 0,
      sevenOhEq,
      totalEq: r1(mit + sevenOhEq),
    };
  });

  const maxEq = Math.max(50, ...points.map((p) => p.totalEq)) * 1.1;
  const n = points.length;
  const getX = (i: number) => (n <= 1 ? padL + cw / 2 : padL + (i / (n - 1)) * cw);
  const getY = (val: number) => padT + ch - (Math.min(maxEq, Math.max(0, val)) / maxEq) * ch;

  const totalEqPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p.totalEq).toFixed(1)}`)
    .join(' ');
  const mitPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p.mit).toFixed(1)}`)
    .join(' ');

  const totalMit = r1(points.reduce((a, p) => a + p.mit, 0));
  const total7OhEq = r1(points.reduce((a, p) => a + p.sevenOhEq, 0));
  const sevenOhSharePct =
    totalMit + total7OhEq > 0 ? Math.round((total7OhEq / (totalMit + total7OhEq)) * 100) : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {showGrid &&
          [0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + ch * (1 - frac);
            const val = Math.round(maxEq * frac);
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
                  {val}
                </text>
              </g>
            );
          })}

        {/* Total Alkaloid Equivalent (MIT + 7-OH * mult) */}
        <path
          d={totalEqPath}
          fill="none"
          stroke="var(--purple)"
          strokeWidth={lineThickness}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pure MIT curve */}
        <path
          d={mitPath}
          fill="none"
          stroke="var(--cyan)"
          strokeWidth={Math.max(1.4, lineThickness - 0.4)}
          strokeDasharray="3 2"
          strokeLinecap="round"
        />

        <text x={padL} y={h - 5} fill="var(--muted)" fontSize="10">
          {fmtDateShort(points[0].ts)}
        </text>
        <text x={w - padR} y={h - 5} textAnchor="end" fill="var(--muted)" fontSize="10">
          {fmtDateShort(points[n - 1].ts)}
        </text>
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--muted)',
          marginTop: 6,
          paddingTop: 6,
          borderTop: '0.5px solid var(--border-subtle)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span className="dot" style={{ background: 'var(--cyan)' }} />
          Čistý MIT ({fmtMg(totalMit)})
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span className="dot" style={{ background: 'var(--purple)' }} />
          Ekvivalent vč. 7-OH ×{sevenOhMultiplier} (podíl 7-OH na zátěži: <strong>{sevenOhSharePct}%</strong>)
        </span>
      </div>
    </div>
  );
};
