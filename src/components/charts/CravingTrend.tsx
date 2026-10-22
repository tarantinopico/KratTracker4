import React from 'react';
import { computeCravingTrend, filterModelCravingLogs } from '../../lib/cravingPrediction';
import { fmtDateShort } from '../../lib/date';
import { clamp, fmtG, r1 } from '../../lib/format';
import { CravingLog } from '../../types';

interface CravingTrendProps {
  logs: CravingLog[];
}

export const CravingTrend: React.FC<CravingTrendProps> = ({ logs }) => {
  const validLogs = filterModelCravingLogs(logs);

  if (validLogs.length < 2) {
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
        Zaznamenej alespoň 2 chuti pro zobrazení časového trendu.
      </div>
    );
  }

  const { trend } = computeCravingTrend(validLogs);

  const W = 340;
  const H = 175;
  const padL = 32;
  const padR = 14;
  const padT = 22;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const ys = validLogs.map((l) => Math.max(0.2, l.hoursSinceSessionEnd || 4));
  const minY = 0;
  const maxY = Math.ceil(Math.max(...ys, 8) + 1);

  const scaleX = (idx: number) =>
    padL +
    (validLogs.length <= 1 ? innerW / 2 : (idx / (validLogs.length - 1)) * innerW);
  const scaleY = (y: number) =>
    padT + innerH - ((clamp(y, minY, maxY) - minY) / Math.max(1, maxY - minY)) * innerH;

  // 7-day moving average for each point
  const maPoints = validLogs.map((log, idx) => {
    const windowStart = log.timestamp - 7 * 86400000;
    const inWin = validLogs.filter(
      (c, j) => j <= idx && c.timestamp >= windowStart
    );
    const avg =
      inWin.reduce((s, c) => s + (c.hoursSinceSessionEnd || 0), 0) /
      Math.max(1, inWin.length);
    return { x: scaleX(idx), y: scaleY(avg), avg: r1(avg) };
  });

  const linePath = maPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');

  const isRisingTolerance = trend === 'rising'; // hours shrinking -> tolerance rising
  const isGoodState = trend === 'falling'; // hours growing -> good state

  const strokeColor = isRisingTolerance
    ? 'var(--danger)'
    : isGoodState
    ? 'var(--accent)'
    : 'var(--cyan)';

  const bgTint = isRisingTolerance
    ? 'rgba(255, 69, 58, 0.08)'
    : isGoodState
    ? 'rgba(48, 209, 88, 0.08)'
    : 'rgba(100, 210, 255, 0.05)';

  const statusText = isRisingTolerance
    ? 'Tolerance roste (interval do chuti se zkracuje)'
    : isGoodState
    ? 'Dobrý stav (interval do chuti se prodlužuje)'
    : 'Stabilní vývoj intervalu do chuti';

  return (
    <div
      style={{
        background: bgTint,
        borderRadius: 12,
        padding: '8px 8px 6px',
        border: `0.5px solid ${
          isRisingTolerance
            ? 'rgba(255,69,58,0.28)'
            : isGoodState
            ? 'rgba(48,209,88,0.28)'
            : 'var(--border-subtle)'
        }`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 4px 4px',
          fontSize: 11.5,
          fontWeight: 600,
          color: strokeColor,
        }}
      >
        <span>{statusText}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Trend doby do chuti v čase"
      >
        {[0, Math.round(maxY / 2), maxY].map((yt) => {
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
                x={padL - 5}
                y={yPos + 3}
                textAnchor="end"
                fill="var(--muted)"
                fontSize="9"
              >
                {yt}h
              </text>
            </g>
          );
        })}

        {/* 7-day moving average line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Individual log points */}
        {validLogs.map((l, idx) => {
          const cx = scaleX(idx);
          const cy = scaleY(l.hoursSinceSessionEnd || 0);
          return (
            <circle
              key={l.id}
              cx={cx}
              cy={cy}
              r="3.2"
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          );
        })}

        {/* First and last date labels */}
        <text x={padL} y={H - 6} textAnchor="start" fill="var(--muted)" fontSize="9">
          {fmtDateShort(validLogs[0].timestamp)}
        </text>
        <text
          x={W - padR}
          y={H - 6}
          textAnchor="end"
          fill="var(--muted)"
          fontSize="9"
        >
          {fmtDateShort(validLogs[validLogs.length - 1].timestamp)} (
          {fmtG(maPoints[maPoints.length - 1].avg)}h)
        </text>
      </svg>
    </div>
  );
};
