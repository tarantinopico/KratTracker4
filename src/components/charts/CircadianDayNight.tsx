import React from 'react';
import { fmtG, r1 } from '../../lib/format';
import { Dose } from '../../types';

interface CircadianDayNightProps {
  doses: Dose[];
}

export const CircadianDayNight: React.FC<CircadianDayNightProps> = ({ doses }) => {
  const hourly = Array(24).fill(0);
  const quad = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  doses.forEach((d) => {
    const hr = new Date(d.timestamp).getHours();
    hourly[hr] += d.amountG;
    if (hr >= 6 && hr < 12) quad.morning += d.amountG;
    else if (hr >= 12 && hr < 18) quad.afternoon += d.amountG;
    else if (hr >= 18 && hr < 22) quad.evening += d.amountG;
    else quad.night += d.amountG;
  });

  const maxH = Math.max(1, ...hourly);
  const W = 340;
  const H = 115;
  const padX = 12;
  const padT = 10;
  const padB = 20;
  const cw = W - padX * 2;
  const ch = H - padT - padB;
  const step = cw / 24;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="24h cirkadiánní rozložení dávek"
      >
        {/* Night zones 0-6 and 22-24 */}
        <rect x={padX} y={padT} width={step * 6} height={ch} fill="rgba(191,90,242,0.12)" rx={4} />
        <rect x={padX + step * 22} y={padT} width={step * 2} height={ch} fill="rgba(191,90,242,0.12)" rx={4} />

        {hourly.map((g, hr) => {
          const bh = (g / maxH) * (ch - 4);
          const isNight = hr < 6 || hr >= 22;
          return (
            <g key={hr}>
              {bh > 0 && (
                <rect
                  x={padX + hr * step + 2}
                  y={padT + ch - bh}
                  width={Math.max(4, step - 4)}
                  height={bh}
                  rx={2}
                  fill={isNight ? 'var(--purple)' : 'var(--accent)'}
                />
              )}
              {hr % 6 === 0 && (
                <text
                  x={padX + hr * step + step / 2}
                  y={H - 5}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="var(--muted)"
                >
                  {String(hr).padStart(2, '0')}h
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="stats-4" style={{ marginTop: 8 }}>
        <div className="bento-subcell" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>🌅 Ráno</div>
          <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>
            {fmtG(r1(quad.morning))} g
          </div>
        </div>
        <div className="bento-subcell" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>☀️ Odpoledne</div>
          <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>
            {fmtG(r1(quad.afternoon))} g
          </div>
        </div>
        <div className="bento-subcell" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>🌆 Večer</div>
          <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>
            {fmtG(r1(quad.evening))} g
          </div>
        </div>
        <div className="bento-subcell" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>🌙 Noc</div>
          <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>
            {fmtG(r1(quad.night))} g
          </div>
        </div>
      </div>
    </div>
  );
};
