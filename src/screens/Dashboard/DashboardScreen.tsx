import React from 'react';
import { ACH_DEFS } from '../../constants/achievements';
import { ConcentricLimitsRing } from '../../components/charts/ConcentricLimitsRing';
import { MiniActiveMitSparkline } from '../../components/charts/MiniActiveMitSparkline';
import { MiniTodayTimeline } from '../../components/charts/MiniTodayTimeline';
import { PrecisionDial } from '../../components/charts/PrecisionDial';
import { TBreakRing } from '../../components/charts/TBreakRing';
import { Icon } from '../../components/icons/Icon';
import { TopHeader } from '../../components/layout/TopHeader';
import { DeltaTag } from '../../components/ui/DeltaTag';
import { useHaptics } from '../../hooks/useHaptics';
import { useSounds } from '../../hooks/useSounds';
import { achUnlockedCount } from '../../lib/achievements';
import { predictNextCraving } from '../../lib/cravingPrediction';
import { getLastSession } from '../../lib/cravingSessions';
import { fmtDateLong, fmtDur, fmtTime, timeAgo } from '../../lib/date';
import { cap, clamp, fmtG, fmtKc, fmtMg, r1 } from '../../lib/format';
import { tbreakInfo } from '../../lib/tbreak';
import { getDashboardSnapshot } from '../../store/selectors';
import { useAppStore } from '../../store/useAppStore';

export const DashboardScreen: React.FC = () => {
  const state = useAppStore();
  const st = state.settings;
  const buzz = useHaptics();
  const playSound = useSounds();
  const now = Date.now();
  const snap = getDashboardSnapshot(state, now);
  const tb = tbreakInfo(st, now);
  const unlockedCount = achUnlockedCount(state);

  const handleQuickLog = (amt: number) => {
    const doLog = () => {
      buzz(15);
      playSound(660, 75);
      const d = state.quickLogDose(amt);
      if (d) {
        state.addToast(`Zapsáno: +${fmtG(d.amountG)} g (${d.strainName})`, { type: 'good' });
      }
    };
    if (st.quickLogConfirm) {
      state.askConfirm({
        title: `Zapsat dávku +${fmtG(amt)} g?`,
        message: 'Okamžitě přidá dávku posledního zvoleného druhu s vodou.',
        okText: 'Zapsat',
        danger: false,
        onConfirm: doLog,
      });
    } else {
      doLog();
    }
  };

  const handleAddWater = (ml: number) => {
    buzz(10);
    playSound(520, 60);
    state.addWater(ml);
    state.addToast(`💧 +${ml} ml vody zapsáno`);
  };

  const cravingPred = predictNextCraving(state.cravingLogs || [], state.doses, st, now);
  const lastSession = getLastSession(state.doses, st.cravingSessionWindowMin || 60);

  const handleOpenCraving = () => {
    buzz(12);
    if (!lastSession) {
      state.addToast('Nejdřív zaznamenej dávku', { type: 'danger' });
      return;
    }
    const sortedCravings = [...(state.cravingLogs || [])].sort((a, b) => b.timestamp - a.timestamp);
    const lastLog = sortedCravings[0];
    if (lastLog && now - lastLog.timestamp < 30 * 60_000) {
      const minsAgo = Math.max(1, Math.round((now - lastLog.timestamp) / 60_000));
      state.askConfirm({
        title: 'Aktualizovat nedávný záznam?',
        message: `Před ${minsAgo} min jsi už chuť zaznamenal. Aktualizovat intenzitu?`,
        okText: 'Upravit záznam',
        danger: false,
        onConfirm: () => {
          state.openCravingSheet(lastLog.id);
        },
      });
      return;
    }
    state.openCravingSheet(null);
  };

  // Smart insight priority logic
  const L = st.dailyLimitG || 10;
  const hardL = st.dailyHardLimitG || 14;
  let insightCls: 'good' | 'warn' | 'danger' = 'good';
  let insightTitle = 'Optimální tempo';
  let insightText = `Dnes zbývá ${fmtG(Math.max(0, L - snap.todayG))} g do cílového limitu.`;
  let insightIcon = '✨';

  if (hardL > 0 && snap.todayG >= hardL) {
    insightCls = 'danger';
    insightTitle = 'STOP limit překročen!';
    insightText = `Dnešní součet (${fmtG(snap.todayG)} g) přesáhl tvrdý STOP limit ${fmtG(hardL)} g.`;
    insightIcon = '🛑';
  } else if (L > 0 && snap.todayG >= L * 0.8) {
    insightCls = 'warn';
    insightTitle = 'Pozor na limit';
    insightText =
      snap.todayG > L
        ? `Měkký limit překročen o +${fmtG(snap.todayG - L)} g.`
        : `Blížíš se k dennímu limitu (${Math.round((snap.todayG / L) * 100)} %).`;
    insightIcon = '⚠️';
  } else if (!snap.cooldownReady) {
    insightCls = 'warn';
    insightTitle = 'Aktivní cooldown';
    insightText = `Do doporučeného rozestupu zbývá ještě ${fmtDur(snap.cooldownRemainMs)}.`;
    insightIcon = '⏱️';
  } else if (
    st.enableStrainRotationAdvice &&
    snap.strainStreak >= (st.diversityWarningThreshold || 3)
  ) {
    insightCls = 'warn';
    insightTitle = 'Rotace odrůd';
    insightText = `Stejný druh užit ${snap.strainStreak}× po sobě — zvaž obměnu odrůdy.`;
    insightIcon = '🔄';
  } else if (snap.todays.length === 0) {
    insightCls = 'good';
    insightTitle = 'Čistý start dne';
    insightText = 'Dnes zatím žádná dávka · receptory se regenerují.';
    insightIcon = '🌿';
  }

  const waterPct = Math.min(100, Math.round((snap.todayWaterMl / Math.max(1, snap.dynamicWaterGoalMl)) * 100));

  return (
    <div className="screen active">
      <TopHeader
        icon="leaf"
        title="Kratom Tracker"
        subtitle={cap(fmtDateLong(now))}
        showPrivacyToggle
      />

      <div className="dash-bento-container">
        {/* 2. Quick row + HUD row */}
        {(st.dashShowQuickRow || st.dashShowHud) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {st.dashShowQuickRow && st.enableQuickLog && (
              <div className="chip-row" aria-label="Rychlý zápis">
                {st.quickDosePresets.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="chip"
                    onClick={() => handleQuickLog(amt)}
                  >
                    +{fmtG(amt)}g
                  </button>
                ))}
                {snap.lastDose && (
                  <button
                    type="button"
                    className="chip"
                    title="Zopakovat poslední dávku"
                    onClick={() => handleQuickLog(snap.lastDose!.amountG)}
                  >
                    <Icon name="repeat" size={12} /> {fmtG(snap.lastDose.amountG)}g
                  </button>
                )}
                {st.enableCravingTracker && st.cravingShowOnDashboard && (
                  <button
                    type="button"
                    className="chip"
                    disabled={state.doses.length === 0}
                    title={
                      state.doses.length === 0
                        ? 'Nejdřív zaznamenej dávku'
                        : 'Zaznamenat subjektivní chuť'
                    }
                    onClick={handleOpenCraving}
                    style={
                      cravingPred.available && cravingPred.hoursFromNow !== null
                        ? cravingPred.hoursFromNow <= 0
                          ? {
                              borderColor: 'var(--danger)',
                              background: 'var(--danger-dim)',
                              color: 'var(--danger)',
                              fontWeight: 600,
                            }
                          : cravingPred.hoursFromNow < 1
                          ? {
                              borderColor: 'var(--warning)',
                              background: 'var(--warning-dim)',
                              color: 'var(--warning)',
                              fontWeight: 600,
                            }
                          : undefined
                        : undefined
                    }
                  >
                    <Icon name="flame" size={13} />
                    <span>😣 Cítím chuť</span>
                    {cravingPred.available && cravingPred.predictedAt !== null && (
                      <span className="num" style={{ opacity: 0.9 }}>
                        ·{' '}
                        {cravingPred.hoursFromNow !== null && cravingPred.hoursFromNow > 24
                          ? '> 24 h'
                          : cravingPred.hoursFromNow !== null && cravingPred.hoursFromNow <= 0
                          ? 'teď'
                          : `~${fmtTime(cravingPred.predictedAt, st.timeFormat24)}`}
                      </span>
                    )}
                  </button>
                )}
                {st.enableHydration && (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => handleAddWater(st.waterQuickMl1 || 250)}
                  >
                    💧+{st.waterQuickMl1 || 250}ml
                  </button>
                )}
              </div>
            )}

            {st.dashShowHud && (
              <div className="chip-row" aria-label="Přehled stavu">
                <span className="chip" style={{ pointerEvents: 'none' }}>
                  🔥 {snap.limitStreak}d v limitu
                </span>
                {st.enableReceptorScore && (
                  <span className="chip" style={{ pointerEvents: 'none' }}>
                    ⚡ {snap.receptorScore}% citlivost
                  </span>
                )}
                {st.enableAchievements && (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      state.setAnaSubTab('achievements');
                      state.setActiveTab('analytics');
                    }}
                  >
                    🏆 {unlockedCount}/{ACH_DEFS.length}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Smart insight banner */}
        {st.dashShowInsight && st.enableSmartInsights && (
          <div className={`dash-smart-insight ${insightCls}`}>
            <span style={{ fontSize: 18 }}>{insightIcon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>{insightTitle}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{insightText}</div>
            </div>
          </div>
        )}

        {/* 4. Active T-Break card OR suggestion */}
        {tb.active ? (
          <div className="card" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <TBreakRing pct={tb.pct} size={64} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>🧘 Aktivní T-Break pauza</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Uplynulo {fmtDur(tb.elapsedMs)} · zbývá {fmtDur(tb.remainMs)}
              </div>
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() =>
                    state.askConfirm({
                      title: 'Ukončit T-Break?',
                      message: tb.done
                        ? 'Gratulujeme! Pauza splnila stanovený cíl.'
                        : 'Chceš ukončit T-Break před dosažením cílového času?',
                      okText: 'Ukončit',
                      danger: !tb.done,
                      onConfirm: () => {
                        state.endTbreak(tb.done);
                        if (tb.done) {
                          playSound(880, 120);
                          state.addToast('🏆 T-Break splněn!', { type: 'good' });
                        } else {
                          state.addToast('T-Break ukončen');
                        }
                      },
                    })
                  }
                >
                  {tb.done ? 'Dokončit T-Break 🏆' : 'Ukončit pauzu'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          st.enableReceptorScore &&
          snap.receptorScore < 60 &&
          snap.todays.length === 0 && (
            <div
              className="card"
              style={{
                marginTop: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>🧘 Doporučený T-Break</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  Citlivost receptorů je {snap.receptorScore} % — zahaj pauzu pro rychlý reset.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() =>
                  state.askConfirm({
                    title: 'Spustit T-Break?',
                    message: `Zahájí odpočet regenerační pauzy (${st.tbreakGoalHours || 72} h).`,
                    okText: 'Spustit',
                    danger: false,
                    onConfirm: () => {
                      state.startTbreak();
                      playSound(880, 90);
                      state.addToast('T-Break spuštěn 💪', { type: 'good' });
                    },
                  })
                }
              >
                Spustit
              </button>
            </div>
          )
        )}

        {/* 5. Hero grid (Dial + Telemetry) */}
        {(st.dashShowHero || st.dashShowTelem) && (
          <div className="dash-hero-grid">
            {st.dashShowHero && (
              <div className="dash-dial-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
                    Denní limit
                  </span>
                  <span className="delta-tag num">{fmtG(L)} g</span>
                </div>

                {st.dashboardDialStyle === 'concentric' ? (
                  <ConcentricLimitsRing
                    todayG={snap.todayG}
                    limitG={L}
                    hardLimitG={hardL}
                    todaySpend={snap.totalSpend}
                    budgetKc={st.dailyBudgetKc}
                  />
                ) : (
                  <PrecisionDial
                    todayG={snap.todayG}
                    limitG={L}
                    hardLimitG={hardL}
                    todaySpend={snap.totalSpend}
                    budgetKc={st.dailyBudgetKc}
                  />
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: 'var(--muted)',
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '0.5px solid var(--border-subtle)',
                  }}
                >
                  <span>STOP: {fmtG(hardL)}g</span>
                  {st.showFinances && (
                    <span className="privacy-val num">
                      Útrata: {fmtKc(snap.totalSpend, st.currency)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {st.dashShowTelem && (
              <div className="dash-telemetry-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
                      Rozestup
                    </span>
                    <span className={`delta-tag ${snap.cooldownReady ? 'good' : 'warn'}`}>
                      {snap.cooldownReady ? 'Připraveno' : `Zbývá ${fmtDur(snap.cooldownRemainMs)}`}
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {snap.lastDose ? (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700 }} className="num">
                          {timeAgo(snap.lastDose.timestamp, now)}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {fmtG(snap.lastDose.amountG)}g {snap.lastDose.strainName} ({fmtTime(snap.lastDose.timestamp, st.timeFormat24)})
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Zatím žádná dávka</div>
                    )}
                  </div>
                </div>

                {st.enablePharmacokinetics && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: '0.5px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Aktivní MIT</span>
                      <span className="privacy-val num" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent-light)' }}>
                        {fmtMg(snap.activeMitMg)}
                      </span>
                    </div>
                    {st.dashboardShowSparklines && (
                      <MiniActiveMitSparkline doses={state.doses} settings={st} now={now} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5b. Karta Predikce chuti */}
        {st.enableCravingTracker &&
          (cravingPred.available || cravingPred.reason !== 'Zaznamenej dávku.') && (
            <div
              className="card clickable"
              style={{ marginTop: 0 }}
              onClick={() => {
                state.setAnaSubTab('craving');
                state.setActiveTab('analytics');
              }}
              role="button"
              tabIndex={0}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ color: 'var(--warning)', display: 'inline-flex' }}>
                    <Icon name="flame" size={15} />
                  </span>
                  <span>Predikce chuti</span>
                </span>

                {cravingPred.available && (
                  <span
                    className={`delta-tag ${
                      cravingPred.trend === 'rising'
                        ? 'danger'
                        : cravingPred.trend === 'falling'
                        ? 'good'
                        : ''
                    }`}
                  >
                    {cravingPred.trend === 'rising'
                      ? '↗ zkracuje se'
                      : cravingPred.trend === 'falling'
                      ? '↘ prodlužuje se'
                      : '→ stabilní'}
                  </span>
                )}
              </div>

              {cravingPred.available && cravingPred.predictedAt !== null ? (
                (() => {
                  const isNow =
                    cravingPred.hoursFromNow !== null && cravingPred.hoursFromNow <= 0;
                  const isOver24h =
                    cravingPred.hoursFromNow !== null && cravingPred.hoursFromNow > 24;
                  const isSoon =
                    cravingPred.hoursFromNow !== null &&
                    cravingPred.hoursFromNow > 0 &&
                    cravingPred.hoursFromNow < 1;

                  const sessEnd = lastSession ? lastSession.endTime : now - 3600_000;
                  const totalSpan = Math.max(1, cravingPred.predictedAt - sessEnd);
                  const elapsed = Math.max(0, now - sessEnd);
                  const progPct = isNow
                    ? 100
                    : clamp(Math.round((elapsed / totalSpan) * 100), 2, 100);

                  const barColor = isNow
                    ? 'var(--danger)'
                    : isSoon
                    ? 'var(--warning)'
                    : 'var(--accent)';

                  return (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div
                          className="num"
                          style={{
                            fontSize: isNow ? 17 : 22,
                            fontWeight: 800,
                            color: isNow
                              ? 'var(--danger)'
                              : isSoon
                              ? 'var(--warning)'
                              : '#ffffff',
                          }}
                        >
                          {isNow
                            ? 'Chuť je pravděpodobně tady'
                            : isOver24h
                            ? '> 24 h'
                            : fmtTime(cravingPred.predictedAt, st.timeFormat24)}
                        </div>
                        {!isNow && !isOver24h && (
                          <div
                            className="num"
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: isSoon ? 'var(--warning)' : 'var(--accent-light)',
                            }}
                          >
                            za {fmtDur(Math.max(0, cravingPred.predictedAt - now))}
                          </div>
                        )}
                      </div>

                      <div className="bento-meter-track" style={{ margin: '8px 0 6px' }}>
                        <div
                          className="bento-meter-fill"
                          style={{ width: `${progPct}%`, background: barColor }}
                        />
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Váš typický práh:{' '}
                        <strong className="privacy-val" style={{ color: '#ffffff' }}>
                          {fmtG(cravingPred.mitThresholdMg || 0)} mg MIT
                        </strong>{' '}
                        · ø {fmtG(cravingPred.avgHoursAfterSession || 0)} h po session · ±{' '}
                        {fmtG(cravingPred.confidenceHours || 1)} h
                      </div>
                    </>
                  );
                })()
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {cravingPred.reason}
                  </div>
                  <span className="delta-tag num">
                    {cravingPred.logCount}/{st.cravingPredictionThresholdMin || 3}
                  </span>
                </div>
              )}
            </div>
          )}

        {/* 6. Vitals grid (Timeline + Hydration/Receptor) */}
        {(st.dashShowTimeline || st.dashShowWater) && (
          <div className="dash-hero-grid">
            {st.dashShowTimeline && (
              <div className="dash-mini-card">
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                  Dnešní rytmus
                </div>
                <MiniTodayTimeline doses={snap.todays} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Průměr{' '}
                  <strong style={{ color: '#fff' }} className="num">
                    {snap.todays.length > 0 ? fmtG(r1(snap.todayG / snap.todays.length)) : '0'} g
                  </strong>{' '}
                  / dávka
                </div>
              </div>
            )}

            {st.dashShowWater && st.enableHydration ? (
              <div className="dash-mini-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
                    💧 Hydratace
                  </span>
                  <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--cyan)' }}>
                    {snap.todayWaterMl} / {snap.dynamicWaterGoalMl} ml
                  </span>
                </div>
                <div className="bento-meter-track" style={{ margin: '8px 0' }}>
                  <div
                    className="bento-meter-fill"
                    style={{ width: `${waterPct}%`, background: 'var(--cyan)' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleAddWater(st.waterQuickMl1 || 250)}
                  >
                    +{st.waterQuickMl1 || 250}ml
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleAddWater(st.waterQuickMl2 || 500)}
                  >
                    +{st.waterQuickMl2 || 500}ml
                  </button>
                </div>
              </div>
            ) : (
              st.enableReceptorScore && (
                <div className="dash-mini-card">
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
                    Citlivost & Rotace
                  </div>
                  <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                    {snap.receptorScore} %
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Série odrůdy: {snap.strainStreak}× po sobě
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* 7. Today activity card */}
        {st.dashShowActivity && (
          <div className="card" style={{ marginTop: 0 }}>
            <div className="card-title" style={{ marginBottom: 6 }}>
              <span>Dnešní aktivita ({snap.todays.length})</span>
              <button
                type="button"
                style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}
                onClick={() => state.setActiveTab('history')}
              >
                Zobrazit historii →
              </button>
            </div>

            {snap.todays.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '6px 0' }}>
                Dnes zatím žádná dávka · Plná citlivost receptorů
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {snap.todays.slice(0, st.dashRecentDosesCount || 2).map((d) => (
                  <div
                    key={d.id}
                    className="dose-row"
                    style={{ marginTop: 0 }}
                    onClick={() => state.openDoseModal(d.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      <span className="dot" style={{ background: d.strainColor }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {fmtG(d.amountG)}g {d.strainName}{' '}
                          {st.enableBeverages && <span>{d.beverageIcon}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {fmtTime(d.timestamp, st.timeFormat24)}
                          {d.note ? ` · ${d.note}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2, color: 'var(--warning)', flexShrink: 0 }}>
                      {Array.from({ length: d.rating || 0 }).map((_, idx) => (
                        <Icon key={idx} name="star" size={11} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 8. Stats strip (.stats-4) */}
        {st.dashShowStats && (
          <div className="stats-4">
            <div
              className="stat-cell clickable"
              onClick={() => state.setActiveTab('stock')}
              role="button"
              tabIndex={0}
            >
              <div className="stat-cell-label">Skladem</div>
              <div className="stat-cell-val privacy-val">{fmtG(snap.stockTotalG)}g</div>
              <div className="stat-cell-sub">~{snap.runwayDays} dní</div>
            </div>

            <div className="stat-cell">
              <div className="stat-cell-label">Útrata</div>
              <div className="stat-cell-val privacy-val">
                {fmtKc(snap.totalSpend, st.currency)}
              </div>
              <div className="stat-cell-sub">z {fmtKc(st.dailyBudgetKc, st.currency)}</div>
            </div>

            <div className="stat-cell">
              <div className="stat-cell-label">Dnes dávek</div>
              <div className="stat-cell-val">{snap.todays.length}</div>
              <div className="stat-cell-sub">
                ø {snap.todays.length ? fmtG(r1(snap.todayG / snap.todays.length)) : '0'}g
              </div>
            </div>

            <div className="stat-cell">
              <div className="stat-cell-label">7D Posun</div>
              <div style={{ marginTop: 2 }}>
                <DeltaTag cur={snap.todayG} prior={snap.avg7d} invert />
              </div>
              <div className="stat-cell-sub">vs 7d ø</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
