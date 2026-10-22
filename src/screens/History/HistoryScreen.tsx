import React, { useState } from 'react';
import { HeatmapGrid } from '../../components/charts/HeatmapGrid';
import { Icon } from '../../components/icons/Icon';
import { TopHeader } from '../../components/layout/TopHeader';
import { dayKey, fmtDateMid, fmtTime, startOfToday } from '../../lib/date';
import { cap, fmtG, fmtKc, fmtMg, r2 } from '../../lib/format';
import { dailyMap } from '../../lib/stock';
import { useAppStore } from '../../store/useAppStore';
import { Dose } from '../../types';
import { HistoryCalendar } from './HistoryCalendar';

export const HistoryScreen: React.FC = () => {
  const state = useAppStore();
  const st = state.settings;
  const hf = state.histFilter;
  const [searchInput, setSearchInput] = useState(hf.q);

  const dayStartHour = st.dayStartHour || 0;
  const dm = dailyMap(state.doses, dayStartHour);
  const t0 = startOfToday(dayStartHour);
  const todayKey = dayKey(t0, dayStartHour);
  const yesterdayKey = dayKey(t0 - 86400000, dayStartHour);

  const cutoffTs =
    hf.days === 'all' ? 0 : t0 - (Number(hf.days) - 1) * 86400000;

  const qNorm = searchInput.trim().toLowerCase();

  const filteredDoses = state.doses
    .filter((d) => {
      if (hf.filterDayKey) {
        return dayKey(d.timestamp, dayStartHour) === hf.filterDayKey;
      }
      if (hf.strain !== 'all' && d.strainId !== hf.strain) return false;
      if (hf.days !== 'all' && d.timestamp < cutoffTs) return false;
      if (qNorm) {
        const hay = `${d.strainName} ${d.beverageName} ${d.note}`.toLowerCase();
        if (!hay.includes(qNorm)) return false;
      }
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const totalG = r2(filteredDoses.reduce((a, d) => a + d.amountG, 0));
  const totalMit = r2(filteredDoses.reduce((a, d) => a + (d.mitMg || 0), 0));
  const totalCost = r2(
    filteredDoses.reduce((a, d) => a + (d.cost || 0) + (d.beverageCost || 0), 0)
  );

  // Group by dayKey
  const groups: Array<{ dk: string; ts: number; doses: Dose[]; dayG: number; dayCost: number }> = [];
  const groupMap: Record<string, (typeof groups)[number]> = {};

  filteredDoses.forEach((d) => {
    const dk = dayKey(d.timestamp, dayStartHour);
    if (!groupMap[dk]) {
      const grp = { dk, ts: d.timestamp, doses: [], dayG: 0, dayCost: 0 };
      groupMap[dk] = grp;
      groups.push(grp);
    }
    groupMap[dk].doses.push(d);
    groupMap[dk].dayG = r2(groupMap[dk].dayG + d.amountG);
    groupMap[dk].dayCost = r2(
      groupMap[dk].dayCost + (d.cost || 0) + (d.beverageCost || 0)
    );
  });

  return (
    <div className="screen active">
      <TopHeader icon="history" title="Historie" subtitle="Deník a kalendář dávek" />

      {/* 2. Heatmap card */}
      {st.enableHeatmap && (
        <div className="card" id="hist-heatmap-card">
          <div className="card-title">
            <span>Posledních 28 dní</span>
            {hf.filterDayKey && (
              <button
                type="button"
                style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 600 }}
                onClick={() => state.setHistFilter({ filterDayKey: null })}
              >
                Zrušit filtr ({hf.filterDayKey})
              </button>
            )}
          </div>
          <HeatmapGrid
            dailyGramsMap={dm}
            limitG={st.dailyLimitG || 10}
            hardLimitG={st.dailyHardLimitG || 14}
            dayStartHour={dayStartHour}
            selectedDayKey={hf.filterDayKey}
            onSelectDayKey={(dk) =>
              state.setHistFilter({
                filterDayKey: hf.filterDayKey === dk ? null : dk,
                view: 'list',
              })
            }
          />
        </div>
      )}

      {/* 3. Filter card */}
      {st.histShowFilters && (
        <div className="card" id="hist-filter-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Strain filter chips */}
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${hf.strain === 'all' ? 'on' : ''}`}
              onClick={() => state.setHistFilter({ strain: 'all' })}
            >
              Vše
            </button>
            {state.strains.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip ${hf.strain === s.id ? 'on' : ''}`}
                onClick={() => state.setHistFilter({ strain: s.id })}
              >
                <span className="dot" style={{ background: s.color }} />
                <span>{s.name}</span>
              </button>
            ))}
          </div>

          {/* Days filter chips */}
          <div className="chip-row">
            {([7, 30, 90, 'all'] as const).map((d) => (
              <button
                key={String(d)}
                type="button"
                className={`chip ${hf.days === d ? 'on' : ''}`}
                onClick={() => state.setHistFilter({ days: d, filterDayKey: null })}
              >
                {d === 'all' ? 'Vše' : `${d} dní`}
              </button>
            ))}
          </div>

          {/* View mode seg */}
          {st.enableCalendarView && (
            <div className="seg">
              <button
                type="button"
                className={`seg-btn ${hf.view === 'list' ? 'on' : ''}`}
                onClick={() => state.setHistFilter({ view: 'list' })}
              >
                <Icon name="list" size={13} style={{ marginRight: 4 }} /> Seznam
              </button>
              <button
                type="button"
                className={`seg-btn ${hf.view === 'cal' ? 'on' : ''}`}
                onClick={() => state.setHistFilter({ view: 'cal' })}
              >
                📅 Kalendář
              </button>
            </div>
          )}

          {/* Search input */}
          <div className="inp-wrap">
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Hledat druh, nápoj nebo poznámku…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                state.setHistFilter({ q: e.target.value });
              }}
            />
            <span style={{ position: 'absolute', left: 10, color: 'var(--muted)', pointerEvents: 'none' }}>
              <Icon name="search" size={15} />
            </span>
          </div>
        </div>
      )}

      {/* 4. Summary line */}
      <div
        id="hist-summary"
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          padding: '10px 4px 2px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span className="num">
          {filteredDoses.length} dávek · {fmtG(totalG)} g
          {st.showAlkaloids ? ` (${fmtMg(totalMit)} MIT)` : ''}
          {st.showFinances ? ` · ${fmtKc(totalCost, st.currency)}` : ''}
        </span>
      </div>

      {/* 5. Calendar wrap */}
      {hf.view === 'cal' && st.enableCalendarView && <HistoryCalendar dailyGramsMap={dm} />}

      {/* 6. List */}
      <div id="hist-list" style={{ marginTop: 6 }}>
        {groups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 16px' }}>
            Žádné záznamy neodpovídají zvolenému filtru.
          </div>
        ) : (
          groups.map((grp) => {
            const label =
              grp.dk === todayKey
                ? 'Dnes'
                : grp.dk === yesterdayKey
                ? 'Včera'
                : cap(fmtDateMid(grp.ts));

            return (
              <div key={grp.dk} className="card" style={{ marginTop: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{label}</span>
                  <span
                    className="num"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {fmtG(grp.dayG)} g
                    {st.showFinances ? ` · ${fmtKc(grp.dayCost, st.currency)}` : ''}
                  </span>
                </div>

                {grp.doses.map((d) => (
                  <div
                    key={d.id}
                    className="dose-row"
                    onClick={() => state.openDoseModal(d.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span className="dot" style={{ background: d.strainColor }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{d.strainName}</span>
                          {st.enableBeverages && (
                            <span className="delta-tag" style={{ fontSize: 10.5 }}>
                              {d.beverageIcon} {d.beverageName}
                            </span>
                          )}
                          {st.enableMoodRating && d.rating > 0 && (
                            <span className="delta-tag warn" style={{ fontSize: 10 }}>
                              <Icon name="star" size={10} fill="currentColor" />
                              {d.rating}
                            </span>
                          )}
                          {d.calibrated && d.calibrationDiff !== undefined && (
                            <span className="delta-tag good" style={{ fontSize: 10 }}>
                              ⚖️ {d.calibrationDiff >= 0 ? '+' : ''}
                              {fmtG(d.calibrationDiff)}g
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                          {fmtTime(d.timestamp, st.timeFormat24)}
                          {d.calibrated && d.originalAmountG !== undefined
                            ? ` · původně ${fmtG(d.originalAmountG)}g`
                            : ''}
                          {d.note ? ` · ${d.note}` : ''}
                          {st.showAlkaloids ? ` · ${fmtMg(d.mitMg)} MIT` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }} className="num">
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtG(d.amountG)} g</div>
                      {st.showFinances && (
                        <div className="privacy-val" style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {fmtKc((d.cost || 0) + (d.beverageCost || 0), st.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
