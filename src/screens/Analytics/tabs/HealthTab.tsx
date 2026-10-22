import React from 'react';
import { HydrationBalance } from '../../../components/charts/HydrationBalance';
import { TaperingPlan } from '../../../components/charts/TaperingPlan';
import { TBreakRing } from '../../../components/charts/TBreakRing';
import { TBreakSimulator } from '../../../components/charts/TBreakSimulator';
import { useSounds } from '../../../hooks/useSounds';
import { calcTaperingTrajectory } from '../../../lib/analytics';
import { fmtDateShort, fmtDur } from '../../../lib/date';
import { fmtG, fmtKc } from '../../../lib/format';
import { tbreakInfo } from '../../../lib/tbreak';
import { calcSmartReceptorAnalysis } from '../../../lib/tolerance';
import { useAppStore } from '../../../store/useAppStore';
import { AnalyticsContext } from '../../../types';

interface HealthTabProps {
  ctx: AnalyticsContext;
}

export const HealthTab: React.FC<HealthTabProps> = ({ ctx }) => {
  const state = useAppStore();
  const playSound = useSounds();
  const { st } = ctx;
  const tb = tbreakInfo(st);
  const rec = calcSmartReceptorAnalysis(state);

  const tap = calcTaperingTrajectory(
    ctx.days,
    st.taperingStartG || 12,
    st.taperingTargetG || 4,
    st.taperingWeeklyReductionPct || 10,
    ctx.daily,
    st.defaultPricePerG || 8
  );

  return (
    <div>
      {/* KPI grid */}
      <div className="bento-grid">
        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Citlivost receptorů</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {ctx.curTolScore} %
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            zátěž {rec.receptorLoadPct} % · tol. {rec.toleranceIndex} %
          </div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Denní cíl tekutin</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {st.dailyWaterGoalMl} ml
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            +{st.waterPerGramKratomMl} ml / 1 g
          </div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Cíl Taperingu</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {fmtG(st.taperingTargetG)} g/d
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            ze startu {fmtG(st.taperingStartG)} g/d
          </div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Potenciální úspora</div>
          <div className="num privacy-val" style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>
            {fmtKc(tap.annualSavingsKc, st.currency)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            ~{fmtG(tap.annualSavingsG / 1000)} kg / rok
          </div>
        </div>
      </div>

      {/* Smart Receptor Load & Multi-Factor Tolerance Breakdown */}
      {st.anaShowReceptorBreakdown !== false && (
        <div className="card">
          <div className="card-title">
            <span>🧬 Detailní analýza zátěže receptorů & Tolerance</span>
            <span className={`delta-tag ${rec.statusCls}`}>
              {rec.mode === 'smart' ? `Chytrý model (${st.toleranceWindowDays || 14}d)` : 'Klasický model'}
            </span>
          </div>

          <div className="bento-subgrid-4" style={{ marginBottom: 10 }}>
            <div className="bento-subcell">
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Celková zátěž</div>
              <div
                className="num"
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  marginTop: 2,
                  color:
                    rec.receptorLoadPct >= 60
                      ? 'var(--danger)'
                      : rec.receptorLoadPct >= 35
                      ? 'var(--warning)'
                      : 'var(--accent)',
                }}
              >
                {rec.receptorLoadPct} %
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                akutní {rec.acuteOccupancyPct}% / chron. {rec.chronicFatiguePct}%
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Index tolerance</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {rec.toleranceIndex} %
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                síla dávky ~{rec.effectivePotencyPct} %
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Ekvivalent 2.0 g</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {fmtG(rec.equivalentDoseFor2g)} g
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                vážený ø {fmtG(rec.weightedDailyEqG)} g/d
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Akutní washout</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {rec.hoursToAcuteWashout > 0 ? `~${rec.hoursToAcuteWashout} h` : 'Čisté (<5mg)'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                aktivní MIT {rec.activeMitMg} mg
              </div>
            </div>
          </div>

          {/* Factor breakdown list */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              fontSize: 11.5,
              paddingTop: 8,
              borderTop: '0.5px solid var(--border-subtle)',
            }}
          >
            <div className="bento-subcell" style={{ padding: '6px 9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--muted)' }}>Objemová zátěž</span>
              <strong className="num" style={{ whiteSpace: 'nowrap', flexShrink: 0, color: rec.components.volumePenalty > 0 ? 'var(--warning)' : 'var(--text)' }}>
                -{rec.components.volumePenalty}%
              </strong>
            </div>
            <div className="bento-subcell" style={{ padding: '6px 9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--muted)' }}>Potence 7-OH / MIT</span>
              <strong className="num" style={{ whiteSpace: 'nowrap', flexShrink: 0, color: rec.components.alkaloidPotencyPenalty > 0 ? 'var(--warning)' : 'var(--text)' }}>
                -{rec.components.alkaloidPotencyPenalty}%
              </strong>
            </div>
            <div className="bento-subcell" style={{ padding: '6px 9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--muted)' }}>Krátké rozestupy</span>
              <strong className="num" style={{ whiteSpace: 'nowrap', flexShrink: 0, color: rec.components.spacingPenalty > 0 ? 'var(--danger)' : 'var(--text)' }}>
                -{rec.components.spacingPenalty}%
              </strong>
            </div>
            <div className="bento-subcell" style={{ padding: '6px 9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--muted)' }}>Série dnů ({rec.consecutiveActiveDays}d)</span>
              <strong className="num" style={{ whiteSpace: 'nowrap', flexShrink: 0, color: rec.components.streakPenalty > 0 ? 'var(--warning)' : 'var(--text)' }}>
                -{rec.components.streakPenalty}%
              </strong>
            </div>
            <div className="bento-subcell" style={{ padding: '6px 9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--muted)' }}>Noční okno & odstupy</span>
              <strong className="num" style={{ whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--accent)' }}>
                +{rec.components.overnightBonus}%
              </strong>
            </div>
            <div className="bento-subcell" style={{ padding: '6px 9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--muted)' }}>Rotace & čisté dny</span>
              <strong className="num" style={{ whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--accent)' }}>
                +{rec.components.rotationBonus + rec.components.cleanDaysRecovery}%
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* T-Break Hub Card */}
      <div className="card">
        <div className="card-title">
          <span>🧘 T-Break Hub (Regenerace receptorů)</span>
          <span className={`delta-tag ${tb.active ? 'good' : ''}`}>
            {tb.active ? 'Probíhá' : `Cíl ${st.tbreakGoalHours} h`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <TBreakRing pct={tb.pct} size={74} />
          <div style={{ flex: 1 }}>
            {tb.active ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Uplynulo {fmtDur(tb.elapsedMs)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Do cíle ({st.tbreakGoalHours} h) zbývá {fmtDur(tb.remainMs)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      state.askConfirm({
                        title: 'Ukončit T-Break?',
                        message: 'Uložit tuto pauzu do historie T-Breaků?',
                        okText: 'Uložit a ukončit',
                        danger: false,
                        onConfirm: () => {
                          state.endTbreak(tb.done);
                          playSound(880, 110);
                          state.addToast(
                            tb.done ? '🏆 T-Break splněn!' : 'T-Break uložen do historie',
                            { type: 'good' }
                          );
                        },
                      })
                    }
                  >
                    {tb.done ? 'Dokončit T-Break 🏆' : 'Ukončit pauzu'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Pauza není aktivní</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Spusť odpočet T-Breaku pro obnovu plné citlivosti receptorů.
                </div>
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      state.askConfirm({
                        title: 'Spustit T-Break?',
                        message: `Zahájí se ${st.tbreakGoalHours}h regenerační pauza.`,
                        okText: 'Spustit T-Break',
                        danger: false,
                        onConfirm: () => {
                          state.startTbreak();
                          playSound(880, 90);
                          state.addToast('T-Break spuštěn 💪', { type: 'good' });
                        },
                      })
                    }
                  >
                    Spustit T-Break ({st.tbreakGoalHours} h)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {state.tbreakHistory.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>
              Historie pauz ({state.tbreakHistory.length})
            </div>
            {state.tbreakHistory.slice(0, 4).map((recItem) => (
              <div
                key={recItem.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  padding: '4px 0',
                }}
              >
                <span>
                  {fmtDateShort(recItem.startedAt)} → {fmtDateShort(recItem.endedAt)} ({recItem.hoursDone} h)
                </span>
                <span className={`delta-tag ${recItem.completed ? 'good' : 'warn'}`}>
                  {recItem.completed ? 'Splněno 🏆' : `Cíl ${recItem.goalHours}h`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hydratační bilance */}
      <div className="card">
        <div className="card-title">
          <span>💧 Hydratační bilance</span>
        </div>
        <HydrationBalance
          daily={ctx.daily}
          waterLogs={state.waterLogs}
          baseGoalMl={st.dailyWaterGoalMl}
          perGramMl={st.waterPerGramKratomMl}
          dayStartHour={st.dayStartHour}
        />
      </div>

      {/* Simulátor T-Breaku */}
      <div className="card">
        <div className="card-title">
          <span>📈 Simulátor T-Breaku (14d projekce)</span>
        </div>
        <TBreakSimulator
          currentScore={ctx.curTolScore}
          recoveryPerDay={st.toleranceRecoveryPerDay}
        />
      </div>

      {/* Plán taperingu */}
      {st.taperingEnabled ? (
        <div className="card">
          <div className="card-title">
            <span>📉 Plán taperingu</span>
            <span className="delta-tag good">-{st.taperingWeeklyReductionPct}% / týden</span>
          </div>
          <TaperingPlan trajectory={tap.trajectory} />
          <div className="chart-header-stats">
            <div>
              <div className="stat-cell-label">Start</div>
              <div className="stat-cell-val">{fmtG(st.taperingStartG)} g</div>
            </div>
            <div>
              <div className="stat-cell-label">Cíl</div>
              <div className="stat-cell-val">{fmtG(st.taperingTargetG)} g</div>
            </div>
            <div>
              <div className="stat-cell-label">Ušetřeno</div>
              <div className="stat-cell-val">{fmtG(tap.savedG)} g</div>
            </div>
            <div>
              <div className="stat-cell-label">Úspora Kč</div>
              <div className="stat-cell-val privacy-val">{fmtKc(tap.savedKc, st.currency)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>📉 Plán postupného snižování (Tapering)</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Aktivuj tapering v nastavení pro sledování křivky postupné redukce a úspor.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => state.setActiveTab('settings')}
          >
            Nastavení →
          </button>
        </div>
      )}
    </div>
  );
};
