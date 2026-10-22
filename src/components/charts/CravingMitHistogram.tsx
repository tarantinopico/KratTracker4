import React from 'react';
import { filterModelCravingLogs } from '../../lib/cravingPrediction';
import { clamp, fmtG, r1 } from '../../lib/format';
import { CravingLog } from '../../types';

interface CravingMitHistogramProps {
  logs: CravingLog[];
  mitThresholdMg: number | null;
}

export const CravingMitHistogram: React.FC<CravingMitHistogramProps> = ({
  logs,
  mitThresholdMg,
}) => {
  const validLogs = filterModelCravingLogs(logs);

  if (validLogs.length < 3 || mitThresholdMg === null) {
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
        Zaznamenej alespoň 3 chuti pro histogram prahu MIT.
      </div>
    );
  }

  const values = validLogs.map((l) => Math.max(0, l.activeMitAtCraving || 0));
  const minVal = Math.max(0, Math.floor(Math.min(...values, mitThresholdMg) - 2));
  const maxVal = Math.ceil(Math.max(...values, mitThresholdMg + 2) + 2);
  const binCount = 7;
  const span = Math.max(3.5, maxVal - minVal);
  const binWidth = span / binCount;

  const bins = Array.from({ length: binCount }, (_, i) => ({
    start: minVal + i * binWidth,
    end: minVal + (i + 1) * binWidth,
    count: 0,
  }));

  values.forEach((v) => {
    const idx = clamp(Math.floor((v - minVal) / binWidth), 0, binCount - 1);
    bins[idx].count += 1;
  });

  const maxCount = Math.max(1, ...bins.map((b) => b.count));

  const W = 340;
  const H = 165;
  const padL = 24;
  const padR = 16;
  const padT = 18;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const thresholdX =
    padL +
    clamp((mitThresholdMg - minVal) / Math.max(0.1, span), 0, 1) * innerW;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Histogram hladiny aktivního mitragyninu při chuti"
      >
        {/* Baseline */}
        <line
          x1={padL}
          y1={padT + innerH}
          x2={W - padR}
          y2={padT + innerH}
          stroke="rgba(255,255,255,0.12)"
        />

        {/* Histogram bars */}
        {bins.map((bin, idx) => {
          const slotW = innerW / binCount;
          const barW = Math.max(8, slotW - 6);
          const x = padL + idx * slotW + 3;
          const barH = (bin.count / maxCount) * (innerH - 8);
          const y = padT + innerH - barH;
          const isNearThreshold =
            mitThresholdMg >= bin.start && mitThresholdMg <= bin.end;

          return (
            <g key={idx}>
              {bin.count > 0 && (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(4, barH)}
                    rx={4}
                    fill={isNearThreshold ? 'var(--warning)' : 'var(--cyan)'}
                    fillOpacity={isNearThreshold ? 0.85 : 0.45}
                  />
                  <text
                    x={x + barW / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    {bin.count}
                  </text>
                </>
              )}
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="8.5"
              >
                {r1((bin.start + bin.end) / 2)}
              </text>
            </g>
          );
        })}

        {/* Learned threshold vertical line */}
        <line
          x1={thresholdX}
          y1={padT - 4}
          x2={thresholdX}
          y2={padT + innerH}
          stroke="var(--warning)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <text
          x={clamp(thresholdX, padL + 26, W - padR - 26)}
          y={11}
          textAnchor="middle"
          fill="var(--warning)"
          fontSize="9.5"
          fontWeight="700"
        >
          Práh {fmtG(mitThresholdMg)} mg
        </text>
      </svg>

      <div
        style={{
          fontSize: 11.5,
          color: 'var(--muted)',
          marginTop: 8,
          paddingTop: 8,
          borderTop: '0.5px solid var(--border-subtle)',
        }}
      >
        Tvůj práh:{' '}
        <strong className="privacy-val" style={{ color: 'var(--warning)' }}>
          {fmtG(mitThresholdMg)} mg
        </strong>
        . Chuť přichází nejčastěji, když MIT klesne sem.
      </div>
    </div>
  );
};
