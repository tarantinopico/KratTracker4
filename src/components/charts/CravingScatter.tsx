import React from 'react';
import { calcWeightedRegression, filterModelCravingLogs } from '../../lib/cravingPrediction';
import { clamp, fmtG, r1 } from '../../lib/format';
import { CravingLog, Strain } from '../../types';

interface CravingScatterProps {
  logs: CravingLog[];
  strains: Strain[];
}

export const CravingScatter: React.FC<CravingScatterProps> = ({ logs, strains }) => {
  const validLogs = filterModelCravingLogs(logs);

  if (validLogs.length < 3) {
    return (
      <div
        style={{
          padding: '22px 14px',
          textAlign: 'center',
          fontSize: 12.5,
          color: 'var(--muted)',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          border: '0.5px solid var(--border-subtle)',
        }}
      >
        Zaznamenej alespoň 3 chuti pro scatter graf.
      </div>
    );
  }

  const strainColorMap = new Map<string, string>();
  strains.forEach((s) => strainColorMap.set(s.id, s.color));

  const W = 340;
  const H = 195;
  const padL = 34;
  const padR = 16;
  const padT = 16;
  const padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xs = validLogs.map((l) => Math.max(0.2, l.lastSessionTotalG || 2));
  const ys = validLogs.map((l) => Math.max(0.2, l.hoursSinceSessionEnd || 4));

  const minX = Math.max(0, Math.floor(Math.min(...xs, 1) - 0.5));
  const maxX = Math.ceil(Math.max(...xs, 4) + 0.5);
  const minY = 0;
  const maxY = Math.ceil(Math.max(...ys, 8) + 1);

  const scaleX = (x: number) =>
    padL + ((clamp(x, minX, maxX) - minX) / Math.max(0.5, maxX - minX)) * innerW;
  const scaleY = (y: number) =>
    padT + innerH - ((clamp(y, minY, maxY) - minY) / Math.max(1, maxY - minY)) * innerH;

  const { a, b } = calcWeightedRegression(validLogs);
  const regYMinX = clamp(a + b * minX, minY, maxY);
  const regYMaxX = clamp(a + b * maxX, minY, maxY);

  const est2g = r1(clamp(a + b * 2, 0.5, 36));
  const est4g = r1(clamp(a + b * 4, 0.5, 36));
  const perGramSlope = r1(Math.max(0, b));

  const yTicks = [0, Math.round(maxY / 2), maxY];
  const xTicks = [minX, r1((minX + maxX) / 2), maxX];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Scatter graf velikosti session vs doby do chuti"
      >
        {/* Horizontal grid lines */}
        {yTicks.map((yt) => {
          const yPos = scaleY(yt);
          return (
            <g key={yt}>
              <line
                x1={padL}
                y1={yPos}
                x2={W - padR}
                y2={yPos}
                stroke="rgba(255,255,255,0.07)"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 6}
                y={yPos + 3}
                textAnchor="end"
                fill="var(--muted)"
                fontSize="9.5"
              >
                {yt}h
              </text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {xTicks.map((xt) => {
          const xPos = scaleX(xt);
          return (
            <text
              key={xt}
              x={xPos}
              y={H - 17}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="9.5"
            >
              {fmtG(xt)}g
            </text>
          );
        })}

        {/* Axis titles */}
        <text
          x={padL + innerW / 2}
          y={H - 4}
          textAnchor="middle"
          fill="var(--faint)"
          fontSize="9.5"
          fontWeight="600"
        >
          Velikost session (g)
        </text>
        <text
          x={10}
          y={padT + innerH / 2}
          textAnchor="middle"
          fill="var(--faint)"
          fontSize="9.5"
          fontWeight="600"
          transform={`rotate(-90, 10, ${padT + innerH / 2})`}
        >
          Doba do chuti (h)
        </text>

        {/* Weighted regression line */}
        <line
          x1={scaleX(minX)}
          y1={scaleY(regYMinX)}
          x2={scaleX(maxX)}
          y2={scaleY(regYMaxX)}
          stroke="var(--warning)"
          strokeWidth="2"
          strokeDasharray="5 4"
          opacity="0.85"
        />

        {/* Scatter bubbles */}
        {validLogs.map((l) => {
          const cx = scaleX(l.lastSessionTotalG || 2);
          const cy = scaleY(l.hoursSinceSessionEnd || 4);
          const r = 3.5 + (l.severity || 3) * 1.4;
          const color =
            (l.strainId && strainColorMap.get(l.strainId)) || 'var(--accent)';
          return (
            <circle
              key={l.id}
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              fillOpacity="0.72"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          );
        })}
      </svg>

      <div
        style={{
          fontSize: 11.5,
          color: 'var(--muted)',
          marginTop: 8,
          paddingTop: 8,
          borderTop: '0.5px solid var(--border-subtle)',
          lineHeight: 1.45,
        }}
      >
        S <strong>2 g</strong> máš chuť po <strong>~{fmtG(est2g)} h</strong>, s{' '}
        <strong>4 g</strong> po <strong>~{fmtG(est4g)} h</strong>. Každý{' '}
        <strong>+1 g</strong> odloží chuť o{' '}
        <strong style={{ color: 'var(--warning)' }}>~{fmtG(perGramSlope)} h</strong>.
      </div>
    </div>
  );
};
