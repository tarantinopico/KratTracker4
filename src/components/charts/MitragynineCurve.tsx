import React from 'react';
import { fmtDateShort } from '../../lib/date';
import { r1 } from '../../lib/format';
import { DailyAnalyticsEntry } from '../../types';

interface MitragynineCurveProps {
  daily: DailyAnalyticsEntry[];
  bodyWeightKg: number;
}

export const MitragynineCurve: React.FC<MitragynineCurveProps> = ({ daily, bodyWeightKg }) => {
  const W = 340;
  const H = 150;
  const padL = 26;
  const padR = 14;
  const padT = 16;
  const padB = 22;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const benchmarkMg = 1.5 * Math.max(40, bodyWeightKg || 75);
  const maxVal = Math.max(benchmarkMg * 1.2, ...daily.map((d) => d.mitMg), 50);

  const toX = (i: number) =>
    daily.length <= 1 ? padL + cw / 2 : padL + (i / (daily.length - 1)) * cw;
  const toY = (v: number) => padT + ch - (Math.min(v, maxVal) / maxVal) * ch;

  const pts = daily.map((d, i) => ({ x: toX(i), y: toY(d.mitMg), mit: d.mitMg, ts: d.ts }));

  let pathD = '';
  if (pts.length > 0) {
    pathD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cx2 = p1.x - (p1.x - p0.x) * 0.45;
      pathD += ` C ${cx1.toFixed(1)} ${p0.y.toFixed(1)}, ${cx2.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
  }

  const areaD =
    pts.length > 1
      ? `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + ch} L ${pts[0].x.toFixed(1)} ${padT + ch} Z`
      : '';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Expozice mitragyninu v mg"
    >
      <defs>
        <linearGradient id="mitCurveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <line
        x1={padL}
        y1={toY(benchmarkMg)}
        x2={W - padR}
        y2={toY(benchmarkMg)}
        stroke="var(--cyan)"
        strokeDasharray="3 3"
        strokeWidth="1"
        opacity="0.7"
      />
      <text x={W - padR} y={toY(benchmarkMg) - 4} textAnchor="end" fontSize="8" fill="var(--cyan)">
        1.5 mg/kg ({r1(benchmarkMg)} mg)
      </text>

      {areaD && <path d={areaD} fill="url(#mitCurveGrad)" />}
      {pathD && <path d={pathD} fill="none" stroke="var(--cyan)" strokeWidth="2" />}

      {pts.length > 1 && (
        <>
          <text x={pts[0].x} y={H - 5} textAnchor="start" fontSize="8.5" fill="var(--muted)">
            {fmtDateShort(pts[0].ts)}
          </text>
          <text x={pts[pts.length - 1].x} y={H - 5} textAnchor="end" fontSize="8.5" fill="var(--muted)">
            Dnes
          </text>
        </>
      )}
    </svg>
  );
};
