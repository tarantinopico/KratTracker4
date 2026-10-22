import React from 'react';
import { CravingMitHistogram } from '../../../components/charts/CravingMitHistogram';
import { CravingScatter } from '../../../components/charts/CravingScatter';
import { CravingTrend } from '../../../components/charts/CravingTrend';
import { Icon } from '../../../components/icons/Icon';
import { filterModelCravingLogs, predictNextCraving } from '../../../lib/cravingPrediction';
import { dayKey, fmtDateMid, fmtTime, startOfToday } from '../../../lib/date';
import { cap, fmtG, fmtMg, r1 } from '../../../lib/format';
import { SEVERITY_META } from '../../../sheets-specific/CravingSheet';
import { useAppStore } from '../../../store/useAppStore';
import { CravingLog } from '../../../types';

export const CravingTab: React.FC = () => {
  const state = useAppStore();
  const st = state.settings;
  const now = Date.now();
  const dayStartHour = st.dayStartHour || 0;

  const cutoffTs =
    state.anaPeriod === 'all'
      ? 0
      : startOfToday(dayStartHour, now) - (Number(state.anaPeriod) - 1) * 86400000;

  const periodLogs = (state.cravingLogs || [])
    .filter((l) => state.anaPeriod === 'all' || l.timestamp >= cutoffTs)
    .sort((a, b) => b.timestamp - a.timestamp);

  const validModelLogs = filterModelCravingLogs(state.cravingLogs || []);
  const pred = predictNextCraving(state.cravingLogs || [], state.doses, st, now);

  const avgHours =
    pred.avgHoursAfterSession !== null
      ? pred.avgHoursAfterSession
      : validModelLogs.length > 0
      ? r1(
          validModelLogs.reduce((a, l) => a + (l.hoursSinceSessionEnd || 0), 0) /
            validModelLogs.length
        )
      : null;

  // Trend label & badge
  let trendLabel = '—';
  let trendCls: '' | 'good' | 'warn' | 'danger' = '';
  if (pred.trend === 'rising') {
    trendLabel = '↗ zkracuje';
    trendCls = 'danger';
  } else if (pred.trend === 'falling') {
    trendLabel = '↘ prodlužuje';
    trendCls = 'good';
  } else if (pred.trend === 'stable') {
    trendLabel = '→ stabilní';
    trendCls = '';
  }

  // Per-strain breakdown
  const strainMap = new Map<
    string,
    {
      id: string;
      name: string;
      color: string;
      count: number;
      sumHours: number;
      sumMit: number;
      sumSev: number;
    }
  >();

  periodLogs.forEach((l) => {
    const sid = l.strainId || 'unassigned';
    const strainObj = state.strains.find((s) => s.id === sid);
    const name = strainObj ? strainObj.name : 'Nepřiřazeno';
    const color = strainObj ? strainObj.color : '#8e8e93';

    const cur = strainMap.get(sid);
    if (cur) {
      cur.count += 1;
      cur.sumHours += l.hoursSinceSessionEnd || 0;
      cur.sumMit += l.activeMitAtCraving || 0;
      cur.sumSev += l.severity || 3;
    } else {
      strainMap.set(sid, {
        id: sid,
        name,
        color,
        count: 1,
        sumHours: l.hoursSinceSessionEnd || 0,
        sumMit: l.activeMitAtCraving || 0,
        sumSev: l.severity || 3,
      });
    }
  });

  const strainRows = Array.from(strainMap.values())
    .map((r) => ({
      ...r,
      avgH: r1(r.sumHours / r.count),
      avgMit: r1(r.sumMit / r.count),
      avgSev: r1(r.sumSev / r.count),
    }))
    .sort((a, b) => b.avgH - a.avgH);

  // Group logs by day for History section
  const t0 = startOfToday(dayStartHour, now);
  const todayKey = dayKey(t0, dayStartHour);
  const yesterdayKey = dayKey(t0 - 86400000, dayStartHour);

  const dayGroups: Array<{ dk: string; ts: number; items: CravingLog[] }> = [];
  const dayGroupMap: Record<string, { dk: string; ts: number; items: CravingLog[] }> = {};

  periodLogs.forEach((l) => {
    const dk = dayKey(l.timestamp, dayStartHour);
    if (!dayGroupMap[dk]) {
      const g = { dk, ts: l.timestamp, items: [] };
      dayGroupMap[dk] = g;
      dayGroups.push(g);
    }
    dayGroupMap[dk].items.push(l);
  });

  const handleDeleteLog = (e: React.MouseEvent, log: CravingLog) => {
    e.stopPropagation();
    const doDel = () => {
      state.deleteCravingLog(log.id);
      state.addToast('Záznam chuti smazán', { type: 'warn' });
    };
    if (st.confirmBeforeDelete) {
      state.askConfirm({
        title: 'Smazat záznam chuti?',
        message: `Smazat záznam z ${fmtTime(log.timestamp, st.timeFormat24)}?`,
        okText: 'Smazat',
        danger: true,
        onConfirm: doDel,
      });
    } else {
      doDel();
    }
  };

  return (
    <div>
      {/* A) KPI strip (4 cells, .stats-4) */}
      <div className="stats-4" style={{ marginTop: 8 }}>
        <div className="stat-cell">
          <div className="stat-cell-label">Ø čas do chuti</div>
          <div className="stat-cell-val num">
            {avgHours !== null ? `${fmtG(avgHours)} h` : '—'}
          </div>
          <div className="stat-cell-sub">od konce session</div>
        </div>

        <div className="stat-cell">
          <div className="stat-cell-label">Práh MIT</div>
          <div className="stat-cell-val num privacy-val">
            {pred.mitThresholdMg !== null ? `${fmtG(pred.mitThresholdMg)} mg` : '—'}
          </div>
          <div className="stat-cell-sub">naučená hladina</div>
        </div>

        <div className="stat-cell">
          <div className="stat-cell-label">Záznamů</div>
          <div className="stat-cell-val num">{(state.cravingLogs || []).length}</div>
          <div className="stat-cell-sub">v období: {periodLogs.length}</div>
        </div>

        <div className="stat-cell">
          <div className="stat-cell-label">Trend</div>
          <div className="stat-cell-val" style={{ fontSize: 13 }}>
            {trendLabel}
          </div>
          <div className="stat-cell-sub">
            {pred.trendDeltaH !== null ? (
              <span className={`delta-tag ${trendCls}`} style={{ fontSize: 9.5, padding: '1px 5px' }}>
                {pred.trendDeltaH > 0 ? '+' : ''}
                {fmtG(pred.trendDeltaH)} h
              </span>
            ) : (
              'min. 6 logů'
            )}
          </div>
        </div>
      </div>

      {/* B) Scatter plot + regression line */}
      <div className="card">
        <div className="card-title">
          <span>🎯 Velikost session vs. Doba do chuti</span>
          <span className="delta-tag">Regrese</span>
        </div>
        <CravingScatter logs={periodLogs} strains={state.strains} />
      </div>

      {/* C) MIT threshold histogram */}
      <div className="card">
        <div className="card-title">
          <span>🧬 Rozložení prahu MIT při chuti</span>
          {pred.mitThresholdMg !== null && (
            <span className="delta-tag warn privacy-val">
              {fmtG(pred.mitThresholdMg)} mg
            </span>
          )}
        </div>
        <CravingMitHistogram logs={periodLogs} mitThresholdMg={pred.mitThresholdMg} />
      </div>

      {/* D) Timeline trend */}
      <div className="card">
        <div className="card-title">
          <span>📈 Vývoj intervalu do chuti</span>
          <span className="delta-tag">7d klouzavý ø</span>
        </div>
        <CravingTrend logs={periodLogs} />
      </div>

      {/* E) Per-strain table */}
      <div className="card">
        <div className="card-title">
          <span>🌿 Výdrž bez chuti podle odrůd</span>
          <span className="delta-tag">{strainRows.length}</span>
        </div>
        {strainRows.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '10px 0' }}>
            Zatím žádné záznamy chuti v tomto období.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {strainRows.map((row, idx) => (
              <div
                key={row.id}
                className="bento-subcell"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span className="dot" style={{ background: row.color }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {idx === 0 && strainRows.length > 1 ? '👑 ' : ''}
                      {row.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {row.count}× zaznamenáno · ø intenzita {fmtG(row.avgSev)}/5
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }} className="num">
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent-light)' }}>
                    ø {fmtG(row.avgH)} h
                  </div>
                  <div className="privacy-val" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    při {fmtG(row.avgMit)} mg MIT
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* F) Historie logů */}
      <div className="card">
        <div className="card-title">
          <span>🕒 Historie zaznamenaných chutí</span>
          <button
            type="button"
            className="btn btn-xs btn-primary"
            onClick={() => state.openCravingSheet(null)}
          >
            <Icon name="plus" size={12} /> Přidat
          </button>
        </div>

        {dayGroups.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '12px 0', textAlign: 'center' }}>
            Zatím žádné záznamy chuti.
          </div>
        ) : (
          dayGroups.map((grp) => {
            const dayLabel =
              grp.dk === todayKey
                ? 'Dnes'
                : grp.dk === yesterdayKey
                ? 'Včera'
                : cap(fmtDateMid(grp.ts));

            return (
              <div key={grp.dk} style={{ marginTop: 10 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--muted)',
                    marginBottom: 4,
                  }}
                >
                  {dayLabel}
                </div>

                {grp.items.map((log) => {
                  const sevMeta =
                    SEVERITY_META.find((m) => m.level === log.severity) || SEVERITY_META[2];
                  const strainObj = state.strains.find((s) => s.id === log.strainId);

                  return (
                    <div
                      key={log.id}
                      className="dose-row"
                      onClick={() => state.openCravingSheet(log.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <span
                          className="dot"
                          style={{ background: strainObj?.color || sevMeta.color }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span className="num" style={{ fontWeight: 700, fontSize: 13 }}>
                              {fmtTime(log.timestamp, st.timeFormat24)}
                            </span>
                            <span
                              className="delta-tag"
                              style={{
                                background: `${sevMeta.color}22`,
                                color: sevMeta.color,
                                border: `0.5px solid ${sevMeta.color}55`,
                                fontSize: 10.5,
                              }}
                            >
                              {log.severity}/5 · {sevMeta.label}
                            </span>
                            {strainObj && (
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                {strainObj.name}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                            po <strong>{fmtG(log.hoursSinceSessionEnd)} h</strong> od session (
                            {fmtG(log.lastSessionTotalG)} g) ·{' '}
                            <span className="privacy-val">{fmtMg(log.activeMitAtCraving)} MIT</span>
                            {log.note ? ` · ${log.note}` : ''}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Smazat záznam chuti"
                        style={{ width: 30, height: 30 }}
                        onClick={(e) => handleDeleteLog(e, log)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
