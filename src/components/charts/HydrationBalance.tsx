import React from 'react';
import { dayKey, fmtDateShort } from '../../lib/date';
import { DailyAnalyticsEntry, WaterLog } from '../../types';

interface HydrationBalanceProps {
  daily: DailyAnalyticsEntry[];
  waterLogs: WaterLog[];
  baseGoalMl: number;
  perGramMl: number;
  dayStartHour: number;
}

export const HydrationBalance: React.FC<HydrationBalanceProps> = ({
  daily,
  waterLogs,
  baseGoalMl,
  perGramMl,
  dayStartHour,
}) => {
  const wm: Record<string, number> = {};
  waterLogs.forEach((w) => {
    const k = dayKey(w.timestamp, dayStartHour);
    wm[k] = (wm[k] || 0) + (w.amountMl || 0);
  });

  const series = daily.slice(-14).map((d) => {
    const actual = wm[d.dayKey] || 0;
    const target = baseGoalMl + d.g * perGramMl;
    return { ts: d.ts, actual, target };
  });

  const W = 340;
  const H = 135;
  const padL = 30;
  const padR = 14;
  const padT = 14;
  const padB = 22;
  const cw = W - padL - padR;
  const ch = H - padT - padB;
  const maxMl = Math.max(3500, ...series.map((s) => Math.max(s.actual, s.target)));

  const toX = (i: number) =>
    series.length <= 1 ? padL + cw / 2 : padL + (i / (series.length - 1)) * cw;
  const toY = (v: number) => padT + ch - (Math.min(v, maxMl) / maxMl) * ch;

  const actualPath = series
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(s.actual).toFixed(1)}`)
    .join(' ');
  const targetPath = series
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(s.target).toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Hydratační bilance"
      >
        {targetPath && (
          <path
            d={targetPath}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeDasharray="4 3"
            strokeWidth="1.5"
          />
        )}
        {actualPath && (
          <path d={actualPath} fill="none" stroke="var(--cyan)" strokeWidth="2.2" strokeLinecap="round" />
        )}
        {series.length > 1 && (
          <>
            <text x={padL} y={H - 5} textAnchor="start" fontSize="8.5" fill="var(--muted)">
              {fmtDateShort(series[0].ts)}
            </text>
            <text x={W - padR} y={H - 5} textAnchor="end" fontSize="8.5" fill="var(--muted)">
              Dnes
            </text>
          </>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        <span>
          <span className="dot" style={{ background: 'var(--cyan)', marginRight: 5 }} />
          Vypitá voda (ml)
        </span>
        <span>
          <span className="dot" style={{ background: 'rgba(255,255,255,0.6)', marginRight: 5 }} />
          Dynamický cíl (+{perGramMl} ml/g)
        </span>
      </div>
    </div>
  );
};
