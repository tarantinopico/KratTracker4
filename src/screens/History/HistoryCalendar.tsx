import React from 'react';
import { WD_SHORT } from '../../constants/defaults';
import { dayKey } from '../../lib/date';
import { fmtG, r2 } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';

interface HistoryCalendarProps {
  dailyGramsMap: Record<string, number>;
}

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({ dailyGramsMap }) => {
  const histFilter = useAppStore((s) => s.histFilter);
  const setHistFilter = useAppStore((s) => s.setHistFilter);
  const settings = useAppStore((s) => s.settings);

  const now = new Date();
  const [year, month] = histFilter.calMonth
    ? histFilter.calMonth.split('-').map(Number)
    : [now.getFullYear(), now.getMonth()];

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = settings.weekStartsMonday
    ? (firstOfMonth.getDay() + 6) % 7
    : firstOfMonth.getDay();

  const headers = settings.weekStartsMonday
    ? WD_SHORT
    : ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setHistFilter({ calMonth: `${d.getFullYear()}-${d.getMonth()}` });
  };

  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setHistFilter({ calMonth: `${d.getFullYear()}-${d.getMonth()}` });
  };

  const monthTitle = firstOfMonth.toLocaleDateString('cs-CZ', {
    month: 'long',
    year: 'numeric',
  });

  const todayKey = dayKey(Date.now(), settings.dayStartHour);
  const L = settings.dailyLimitG || 10;

  const cells: Array<{ dk: string; day: number; inMonth: boolean; g: number }> = [];
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, -startDow + i + 1);
    const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    cells.push({ dk, day: d.getDate(), inMonth: false, g: dailyGramsMap[dk] || 0 });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ dk, day, inMonth: true, g: dailyGramsMap[dk] || 0 });
  }

  const monthCells = cells.filter((c) => c.inMonth && c.g > 0);
  const monthTotalG = r2(monthCells.reduce((a, c) => a + c.g, 0));

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" className="btn btn-sm btn-ghost" onClick={prevMonth}>
          ‹
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>
          {monthTitle}
        </span>
        <button type="button" className="btn btn-sm btn-ghost" onClick={nextMonth}>
          ›
        </button>
      </div>

      <div className="cal-grid-7" style={{ marginBottom: 4 }}>
        {headers.map((h) => (
          <div
            key={h}
            style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}
          >
            {h}
          </div>
        ))}
      </div>

      <div className="cal-grid-7">
        {cells.map((c) => {
          const isToday = c.dk === todayKey;
          const isSelected = histFilter.filterDayKey === c.dk;
          const barColor =
            c.g > L
              ? 'var(--danger)'
              : c.g > L * 0.8
              ? 'var(--warning)'
              : 'var(--accent)';

          return (
            <div
              key={c.dk}
              className={`cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              style={!c.inMonth ? { opacity: 0.28 } : undefined}
              onClick={() =>
                setHistFilter({
                  filterDayKey: histFilter.filterDayKey === c.dk ? null : c.dk,
                })
              }
            >
              <div style={{ fontSize: 10.5, fontWeight: 600 }}>{c.day}</div>
              {c.g > 0 && (
                <div>
                  <div className="num" style={{ fontSize: 10, fontWeight: 700 }}>
                    {fmtG(c.g)}g
                  </div>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 99,
                      background: barColor,
                      marginTop: 2,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
          paddingTop: 8,
          borderTop: '0.5px solid var(--border-subtle)',
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        <span>
          {monthCells.length} aktivních dní · {fmtG(monthTotalG)} g celkem
        </span>
        {histFilter.filterDayKey && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setHistFilter({ filterDayKey: null })}
          >
            Zrušit filtr dne
          </button>
        )}
      </div>
    </div>
  );
};
