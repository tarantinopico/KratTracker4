import React from 'react';
import { clamp, fmtG, r1 } from '../../lib/format';

interface PrecisionDialProps {
  todayG: number;
  limitG: number;
  hardLimitG: number;
  todaySpend: number;
  budgetKc: number;
}

export const PrecisionDial: React.FC<PrecisionDialProps> = ({
  todayG,
  limitG,
  hardLimitG,
  todaySpend,
  budgetKc,
}) => {
  const maxArcVal = Math.max(hardLimitG * 1.15, limitG * 1.3, 1);
  const gFrac = clamp(todayG / maxArcVal, 0, 1);
  const gPct = limitG > 0 ? Math.round((todayG / limitG) * 100) : 0;
  const bFrac = budgetKc > 0 ? clamp(todaySpend / budgetKc, 0, 1) : 0;

  let arcColor = 'var(--accent)';
  let badgeText = `${gPct}% limitu · zbývá ${fmtG(Math.max(0, limitG - todayG))} g`;
  let badgeCls = 'good';

  if (hardLimitG > 0 && todayG >= hardLimitG) {
    arcColor = 'var(--danger)';
    badgeText = `STOP +${fmtG(todayG - hardLimitG)} g`;
    badgeCls = 'danger';
  } else if (limitG > 0 && todayG > limitG) {
    arcColor = 'var(--warning)';
    badgeText = `+${fmtG(todayG - limitG)} g PŘES`;
    badgeCls = 'warn';
  } else if (gPct >= 75) {
    arcColor = '#ffcc00';
    badgeText = `${gPct}% · zbývá ${fmtG(Math.max(0, limitG - todayG))} g`;
    badgeCls = 'warn';
  }

  const cx = 100;
  const cy = 100;
  const rOuter = 74;
  const rInner = 60;
  const startAngle = -215;
  const endAngle = 35;
  const totalSweep = endAngle - startAngle; // 250 deg

  const polar = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (r: number, startDeg: number, sweepDeg: number) => {
    if (sweepDeg <= 0.1) return '';
    const s = polar(r, startDeg);
    const e = polar(r, startDeg + sweepDeg);
    const largeArc = sweepDeg > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };

  const ticks = Array.from({ length: 28 }, (_, i) => {
    const deg = startAngle + (i / 27) * totalSweep;
    const p1 = polar(84, deg);
    const p2 = polar(88, deg);
    const active = i / 27 <= gFrac;
    return { p1, p2, active };
  });

  const limitAngle = startAngle + clamp(limitG / maxArcVal, 0, 1) * totalSweep;
  const limitMarker1 = polar(rOuter - 6, limitAngle);
  const limitMarker2 = polar(rOuter + 6, limitAngle);

  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        viewBox="0 0 200 175"
        style={{ width: '100%', maxWidth: 185, height: 'auto', display: 'block', margin: '0 auto' }}
        role="img"
        aria-label={`Dnešní spotřeba ${r1(todayG)} g z limitu ${limitG} g`}
      >
        {ticks.map((t, idx) => (
          <line
            key={idx}
            x1={t.p1.x}
            y1={t.p1.y}
            x2={t.p2.x}
            y2={t.p2.y}
            stroke={t.active ? arcColor : 'rgba(255,255,255,0.12)'}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        ))}
        {/* Outer track */}
        <path
          d={describeArc(rOuter, startAngle, totalSweep)}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Outer active */}
        {gFrac > 0 && (
          <path
            d={describeArc(rOuter, startAngle, Math.max(2, gFrac * totalSweep))}
            fill="none"
            stroke={arcColor}
            strokeWidth={10}
            strokeLinecap="round"
          />
        )}
        {/* Soft limit tick */}
        <line
          x1={limitMarker1.x}
          y1={limitMarker1.y}
          x2={limitMarker2.x}
          y2={limitMarker2.y}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Inner budget track */}
        <path
          d={describeArc(rInner, startAngle, totalSweep)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={5}
          strokeLinecap="round"
        />
        {bFrac > 0 && (
          <path
            d={describeArc(rInner, startAngle, Math.max(2, bFrac * totalSweep))}
            fill="none"
            stroke="var(--cyan)"
            strokeWidth={5}
            strokeLinecap="round"
          />
        )}
        {/* Center text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="28"
          fontWeight="800"
          className="num"
        >
          {fmtG(todayG)}
          <tspan fontSize="14" fontWeight="600" fill="var(--muted)">
            {' '}
            g
          </tspan>
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--muted)" fontSize="10.5">
          dnes z {fmtG(limitG)} g
        </text>
      </svg>
      <div style={{ marginTop: -6 }}>
        <span className={`delta-tag ${badgeCls}`} style={{ fontSize: 10.5 }}>
          {badgeText}
        </span>
      </div>
    </div>
  );
};
