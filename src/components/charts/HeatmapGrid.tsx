import React from 'react';
import { dayKey, startOfToday } from '../../lib/date';
import { fmtG } from '../../lib/format';

interface HeatmapGridProps {
  dailyGramsMap: Record<string, number>;
  limitG: number;
  hardLimitG: number;
  dayStartHour: number;
  selectedDayKey: string | null;
  onSelectDayKey: (dk: string) => void;
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  dailyGramsMap,
  limitG,
  hardLimitG,
  dayStartHour,
  selectedDayKey,
  onSelectDayKey,
}) => {
  const t0 = startOfToday(dayStartHour);
  const cells = Array.from({ length: 28 }, (_, idx) => {
    const i = 27 - idx;
    const ts = t0 - i * 86400000;
    const dk = dayKey(ts, dayStartHour);
    const g = dailyGramsMap[dk] || 0;
    const dayNum = new Date(ts).getDate();

    let lvlCls = 'lvl-0';
    if (g > 0) {
      if (hardLimitG > 0 && g >= hardLimitG) lvlCls = 'hard-over';
      else if (limitG > 0 && g > limitG) lvlCls = 'over-limit';
      else if (limitG > 0) {
        const ratio = g / limitG;
        if (ratio <= 0.25) lvlCls = 'lvl-1';
        else if (ratio <= 0.5) lvlCls = 'lvl-2';
        else if (ratio <= 0.75) lvlCls = 'lvl-3';
        else lvlCls = 'lvl-4';
      } else {
        lvlCls = 'lvl-2';
      }
    }

    return { dk, g, dayNum, lvlCls };
  });

  return (
    <div className="cal-grid-14">
      {cells.map((c) => (
        <button
          key={c.dk}
          type="button"
          className={`heat-cell ${c.lvlCls}`}
          style={
            selectedDayKey === c.dk
              ? { outline: '2px solid #ffffff', transform: 'scale(1.06)' }
              : undefined
          }
          title={`${c.dk}: ${fmtG(c.g)} g`}
          onClick={() => onSelectDayKey(c.dk)}
        >
          {c.dayNum}
        </button>
      ))}
    </div>
  );
};
