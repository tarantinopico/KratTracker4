import React from 'react';
import { RadarAxisPoint } from '../../lib/analytics';

interface RadarProfileChartProps {
  axes: RadarAxisPoint[];
  overallScore: number;
  compact?: boolean;
}

export const RadarProfileChart: React.FC<RadarProfileChartProps> = ({
  axes,
  overallScore,
  compact = false,
}) => {
  const w = compact ? 184 : 300;
  const h = compact ? 146 : 216;
  const cx = w / 2;
  const cy = h / 2;
  const rMax = compact ? 43 : 68;
  const n = axes.length || 6;

  const getPoint = (idx: number, pct: number, radius = rMax) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const dist = (Math.max(0, Math.min(100, pct)) / 100) * radius;
    return {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
    };
  };

  const rings = [25, 50, 75, 100];
  const dataPoints = axes.map((a, i) => getPoint(i, a.score));
  const polygonPoints = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: 'center',
        gap: compact ? 8 : 12,
      }}
    >
      <div style={{ position: 'relative', width: w, height: h, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.48" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.14" />
            </radialGradient>
          </defs>

          {/* Concentric rings */}
          {rings.map((rPct) => {
            const pts = axes
              .map((_, i) => {
                const p = getPoint(i, rPct);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <polygon
                key={rPct}
                points={pts}
                fill="none"
                stroke="rgba(255,255,255,0.09)"
                strokeWidth={rPct === 100 ? 1 : 0.6}
                strokeDasharray={rPct === 50 ? '2 2' : undefined}
              />
            );
          })}

          {/* Axis spokes */}
          {axes.map((_, i) => {
            const pEnd = getPoint(i, 100);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={pEnd.x}
                y2={pEnd.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.75"
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={polygonPoints}
            fill="url(#radarFillGrad)"
            stroke="var(--accent)"
            strokeWidth={compact ? 1.8 : 2.2}
          />

          {/* Data vertices */}
          {dataPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={compact ? 2.5 : 3.5}
              fill="var(--accent-light)"
              stroke="#000"
              strokeWidth="1"
            />
          ))}

          {/* Labels around perimeter */}
          {axes.map((a, i) => {
            const lblPt = getPoint(i, 100, rMax + (compact ? 14 : 20));
            return (
              <text
                key={a.key}
                x={lblPt.x}
                y={lblPt.y + 3}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize={compact ? 8.5 : 9.5}
                fontWeight="600"
              >
                {compact ? a.shortLabel : `${a.shortLabel} ${a.score}%`}
              </text>
            );
          })}

          {/* Center score */}
          <text
            x={cx}
            y={cy + (compact ? 4 : 5)}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={compact ? 11.5 : 14}
            fontWeight="800"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {overallScore}%
          </text>
        </svg>
      </div>

      {!compact && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
            width: '100%',
          }}
        >
          {axes.map((a) => (
            <div key={a.key} className="bento-subcell" style={{ padding: '7px 9px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                }}
              >
                <span style={{ color: 'var(--muted)' }}>{a.shortLabel}</span>
                <strong
                  className="num"
                  style={{
                    color:
                      a.score >= 75
                        ? 'var(--accent)'
                        : a.score >= 50
                        ? 'var(--warning)'
                        : 'var(--danger)',
                  }}
                >
                  {a.score}%
                </strong>
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  color: 'var(--muted)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {a.detail}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
