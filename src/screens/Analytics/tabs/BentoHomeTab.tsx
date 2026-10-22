import React from 'react';
import { ACH_DEFS } from '../../../constants/achievements';
import { RadarProfileChart } from '../../../components/charts/RadarProfileChart';
import { Icon } from '../../../components/icons/Icon';
import { DeltaTag } from '../../../components/ui/DeltaTag';
import {
  calcAdvancedAnalyticsMetrics,
  calcCumulativeTrajectory,
  calcIntervalHistory,
  calcRadarDisciplineProfile,
  calcStrainDiversityIndex,
  calcWeekdayProfile,
} from '../../../lib/analytics';
import { predictNextCraving } from '../../../lib/cravingPrediction';
import { startOfToday } from '../../../lib/date';
import { fmtG, fmtKc, fmtMg, r1 } from '../../../lib/format';
import { calcActiveMitAtTime } from '../../../lib/pharmacokinetics';
import { calcSmartStockForecast } from '../../../lib/stock';
import { calcSmartReceptorAnalysis } from '../../../lib/tolerance';
import { useAppStore } from '../../../store/useAppStore';
import { AnalyticsContext, AnalyticsSubTab } from '../../../types';

interface BentoHomeTabProps {
  ctx: AnalyticsContext;
  onSelectSubTab: (tab: AnalyticsSubTab) => void;
}

export const BentoHomeTab: React.FC<BentoHomeTabProps> = ({ ctx, onSelectSubTab }) => {
  const state = useAppStore();
  const { st } = ctx;
  const now = Date.now();

  const rec = calcSmartReceptorAnalysis(state, now);
  const adv = calcAdvancedAnalyticsMetrics(ctx, state, now);
  const intHist = calcIntervalHistory(state.doses, ctx.days, st, now);
  const div = calcStrainDiversityIndex(ctx.curDoses, st.diversityWarningThreshold || 3);
  const weekday = calcWeekdayProfile(ctx.daily, ctx.curDoses);
  const radar = calcRadarDisciplineProfile(ctx, state, now);
  const cum = calcCumulativeTrajectory(ctx.daily, ctx.L);
  const stock = calcSmartStockForecast(state.packages, state.strains, state.doses, st, now);
  const cravingPred = predictNextCraving(state.cravingLogs || [], state.doses, st, now);

  // Mini 18h plasma curve points (-6h to +12h)
  const plasmaMiniPts: number[] = [];
  for (let h = -6; h <= 12; h += 1.5) {
    plasmaMiniPts.push(calcActiveMitAtTime(state.doses, st, now + h * 3600000));
  }
  const maxPlasmaMini = Math.max(25, ...plasmaMiniPts);
  const plasmaSvgPath = plasmaMiniPts
    .map((v, i) => {
      const x = (i / (plasmaMiniPts.length - 1)) * 160;
      const y = 34 - (Math.min(maxPlasmaMini, v) / maxPlasmaMini) * 28;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Last 14 days bars for sparkline
  const last14 = ctx.daily.slice(-14);
  const max14G = Math.max(ctx.L, ...last14.map((d) => d.g), 4);

  // 24h hourly buckets
  const hourly = Array(24).fill(0);
  ctx.curDoses.forEach((d) => {
    const hr = new Date(d.timestamp).getHours();
    hourly[hr] += d.amountG;
  });
  const maxHourG = Math.max(1, ...hourly);
  const peakHour = hourly.indexOf(Math.max(...hourly));

  // Today's hydration
  const t0 = startOfToday(st.dayStartHour || 0, now);
  const todayG = state.doses
    .filter((d) => d.timestamp >= t0)
    .reduce((a, d) => a + d.amountG, 0);
  const todayWaterMl = state.waterLogs
    .filter((w) => w.timestamp >= t0)
    .reduce((a, w) => a + w.amountMl, 0);
  const todayWaterGoal = (st.dailyWaterGoalMl || 2500) + todayG * (st.waterPerGramKratomMl || 200);
  const waterPct = todayWaterGoal > 0 ? Math.min(100, Math.round((todayWaterMl / todayWaterGoal) * 100)) : 0;

  const unlockedAchCount = Object.keys(state.achievements || {}).length;

  return (
    <div className="bento-hub-grid" id="bento-home-hub">
      {/* 1. Live Plasma & Kinetics (col-3) */}
      {st.bentoShowLivePlasma !== false && (
        <div
          className="bento-micro-tile interactive bento-col-3"
          onClick={() => onSelectSubTab('intervals')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.02em' }}>
              🧬 AKTIVNÍ PLAZMA MIT
            </span>
            <span className="delta-tag" style={{ fontSize: 9.5, padding: '1px 6px' }}>
              obsaz. {rec.acuteOccupancyPct}%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4, marginTop: 4 }}>
            <div className="num" style={{ fontSize: 19, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
              {r1(rec.activeMitMg)} <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>mg</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {rec.hoursToAcuteWashout > 0 ? `washout ~${rec.hoursToAcuteWashout}h` : 'čisté (<5mg)'}
            </div>
          </div>

          <svg viewBox="0 0 160 36" style={{ width: '100%', height: 34, marginTop: 4, overflow: 'visible' }}>
            <defs>
              <linearGradient id="bentoPlasmaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${plasmaSvgPath} L160,36 L0,36 Z`} fill="url(#bentoPlasmaGrad)" />
            <path d={plasmaSvgPath} fill="none" stroke="var(--cyan)" strokeWidth="1.8" strokeLinecap="round" />
            {/* Now marker at index 4 (-6h .. +12h -> 6/18 = 33.3%) */}
            <line x1="53.3" y1="2" x2="53.3" y2="35" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="2 2" />
            <circle
              cx="53.3"
              cy={34 - (Math.min(maxPlasmaMini, plasmaMiniPts[4] || 0) / maxPlasmaMini) * 28}
              r="3"
              fill="var(--cyan)"
              stroke="#000"
              strokeWidth="1"
            />
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            <span>α {st.mitHalfLifeAlphaH}h / β {st.mitHalfLifeBetaH}h</span>
            <span>{ctx.mgPerKg} mg/kg/d</span>
          </div>
        </div>
      )}

      {/* 2. 14-Day Consumption Sparkline & Reserve (col-3) */}
      {st.bentoShow7dSparkline !== false && (
        <div
          className="bento-micro-tile interactive bento-col-3"
          onClick={() => onSelectSubTab('summary')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent-light)', letterSpacing: '0.02em' }}>
              📊 SPOTŘEBA ({ctx.days}D)
            </span>
            <DeltaTag cur={ctx.curAvgG} prior={ctx.priorAvgG} invert />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <div className="num" style={{ fontSize: 21, fontWeight: 800 }}>
              {fmtG(ctx.curAvgG)} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>g/d</span>
            </div>
            <div className="num privacy-val" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
              Σ {fmtG(ctx.curG)} g
            </div>
          </div>

          {/* 14-day mini bar strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(1, last14.length)}, 1fr)`,
              gap: 2.5,
              alignItems: 'end',
              height: 32,
              marginTop: 5,
            }}
          >
            {last14.map((d) => {
              const hPct = Math.max(8, Math.round((d.g / max14G) * 100));
              const col =
                d.g > ctx.hardL
                  ? 'var(--danger)'
                  : d.g > ctx.L
                  ? 'var(--warning)'
                  : d.g > 0
                  ? 'var(--accent)'
                  : 'rgba(255,255,255,0.08)';
              return (
                <div
                  key={d.dayKey}
                  style={{
                    height: `${hPct}%`,
                    background: col,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            <span>v limitu {adv.limitCompliancePct}% dní</span>
            <span style={{ color: cum.savedOrExcessG >= 0 ? 'var(--accent)' : 'var(--warning)', fontWeight: 600 }}>
              {cum.savedOrExcessG >= 0 ? `rezerva -${fmtG(cum.savedOrExcessG)}g` : `nad +${fmtG(Math.abs(cum.savedOrExcessG))}g`}
            </span>
          </div>
        </div>
      )}

      {/* 3. Holistic Radar Profile & Receptor Load (col-6) */}
      {(st.bentoShowRadarProfile !== false || st.bentoShowReceptorGauge !== false) && (
        <div
          className="bento-micro-tile interactive bento-col-6"
          onClick={() => onSelectSubTab('health')}
          style={{ padding: '11px 12px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                ⚡ KOMPLEXNÍ PROFIL RECEPTORŮ, TOLERANCE & DISCIPLÍNY
              </span>
            </div>
            <span className={`delta-tag ${rec.statusCls}`} style={{ fontSize: 10 }}>
              Index {radar.overallScore}/100 · {rec.mode === 'smart' ? 'Chytrý' : 'Klasický'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {st.bentoShowRadarProfile !== false && (
              <RadarProfileChart axes={radar.axes} overallScore={radar.overallScore} compact />
            )}

            <div style={{ flex: 1, minWidth: 165, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                <div className="bento-subcell" style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Citlivost</div>
                  <div className="num" style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>
                    {ctx.curTolScore} %
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>síla ~{rec.effectivePotencyPct}%</div>
                </div>
                <div className="bento-subcell" style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Zátěž receptorů</div>
                  <div
                    className="num"
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color:
                        rec.receptorLoadPct >= 60
                          ? 'var(--danger)'
                          : rec.receptorLoadPct >= 35
                          ? 'var(--warning)'
                          : 'var(--text)',
                    }}
                  >
                    {rec.receptorLoadPct} %
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>ekv. 2g = {fmtG(rec.equivalentDoseFor2g)}g</div>
                </div>
              </div>

              {/* Dual mini progress bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>
                    <span>Chronická adaptace ({st.toleranceWindowDays || 14}d)</span>
                    <span className="num" style={{ color: 'var(--text)', fontWeight: 600 }}>{rec.chronicFatiguePct}%</span>
                  </div>
                  <div className="bento-meter-track" style={{ height: 4.5 }}>
                    <div
                      className="bento-meter-fill"
                      style={{
                        width: `${rec.chronicFatiguePct}%`,
                        background: rec.chronicFatiguePct > 55 ? 'var(--warning)' : 'var(--purple)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>
                    <span>Stabilita dávkování & rozestupů</span>
                    <span className="num" style={{ color: 'var(--text)', fontWeight: 600 }}>{adv.stabilityIndexPct}%</span>
                  </div>
                  <div className="bento-meter-track" style={{ height: 4.5 }}>
                    <div
                      className="bento-meter-fill"
                      style={{
                        width: `${adv.stabilityIndexPct}%`,
                        background: 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Trio Row: Intervals (col-2) + Strain Mix (col-2) + Stock Runway (col-2) */}
      <div
        className="bento-micro-tile interactive bento-col-2"
        onClick={() => onSelectSubTab('intervals')}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>⏱ ROZESTUPY</div>
        <div className="num" style={{ fontSize: 17, fontWeight: 800, marginTop: 3 }}>
          {intHist.stats.avgGapH !== null ? `${intHist.stats.avgGapH} h` : '—'}
        </div>
        <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>
          disciplína <strong style={{ color: 'var(--accent)' }}>{intHist.stats.compliancePct}%</strong>
        </div>
        <div
          style={{
            marginTop: 6,
            paddingTop: 5,
            borderTop: '0.5px solid var(--border-subtle)',
            fontSize: 9.5,
            color: 'var(--muted)',
          }}
        >
          Noční klid: <strong style={{ color: 'var(--text)' }}>{adv.avgFastingWindowH}h</strong>
          <br />
          Okno: {adv.avgFirstDoseTime}–{adv.avgLastDoseTime}
        </div>
      </div>

      {st.bentoShowStrainMix !== false && (
        <div
          className="bento-micro-tile interactive bento-col-2"
          onClick={() => onSelectSubTab('strains')}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>🌿 ROTACE DRUHŮ</div>
          <div className="num" style={{ fontSize: 17, fontWeight: 800, marginTop: 3 }}>
            {div.pct} %
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>
            Shannon H&apos;={div.shannonH} · {div.activeStrainsCount} dr.
          </div>

          {/* Mini stacked strain bar */}
          <div
            style={{
              display: 'flex',
              height: 5,
              borderRadius: 99,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.08)',
              marginTop: 6,
              gap: 1,
            }}
          >
            {ctx.strainParts.slice(0, 5).map((sp) => (
              <div
                key={sp.id}
                style={{
                  width: `${ctx.curG > 0 ? Math.max(6, (sp.g / ctx.curG) * 100) : 25}%`,
                  background: sp.color,
                }}
              />
            ))}
          </div>

          <div
            style={{
              fontSize: 9.5,
              color: 'var(--muted)',
              marginTop: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Top: <strong style={{ color: 'var(--text)' }}>{div.topStrainName}</strong> ({div.topStrainPct}%)
          </div>
        </div>
      )}

      {st.bentoShowStockRunway !== false && (
        <div
          className="bento-micro-tile interactive bento-col-2"
          onClick={() => state.setActiveTab('stock')}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>📦 SKLAD & VÝDRŽ</div>
          <div className="num" style={{ fontSize: 17, fontWeight: 800, marginTop: 3 }}>
            ~{stock.totalRunwayDays ?? '∞'} d
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>
            celkem <strong style={{ color: 'var(--text)' }}>{fmtG(stock.totalAllStockG)} g</strong>
          </div>
          <div
            style={{
              marginTop: 6,
              paddingTop: 5,
              borderTop: '0.5px solid var(--border-subtle)',
              fontSize: 9.5,
              color: 'var(--muted)',
            }}
          >
            Odběr: <strong style={{ color: 'var(--accent)' }}>{fmtG(stock.effectiveDailyBurnG)} g/d</strong>
            <br />
            Zbývá ~{Math.round(stock.totalAllStockG / Math.max(0.5, ctx.curAvgDoseG || st.defaultDoseG || 2))} dávek
          </div>
        </div>
      )}

      {/* 5. Weekday Rhythm Strip (col-4) + Finance & Alkaloid Efficiency (col-2) */}
      {st.bentoShowWeekdayStrip !== false && (
        <div
          className="bento-micro-tile interactive bento-col-4"
          onClick={() => onSelectSubTab('summary')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>
              🗓️ PROFIL TÝDNE (PO–NE)
            </span>
            <span className="delta-tag" style={{ fontSize: 9.5, padding: '1px 6px' }}>
              Víkend {adv.weekendDeltaPct > 0 ? `+${adv.weekendDeltaPct}%` : `${adv.weekendDeltaPct}%`}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 5,
              alignItems: 'end',
              height: 52,
              marginTop: 6,
            }}
          >
            {weekday.entries.map((e) => {
              const hPct = Math.max(10, Math.round((e.avgG / Math.max(1, weekday.maxAvgG)) * 100));
              const isWknd = e.dayIndex >= 5;
              return (
                <div
                  key={e.dayIndex}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    gap: 2,
                  }}
                >
                  <div className="num" style={{ fontSize: 8.5, color: 'var(--muted)' }}>
                    {fmtG(e.avgG)}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: `${hPct * 0.58}%`,
                      minHeight: 4,
                      background: isWknd ? 'var(--cyan)' : 'var(--accent)',
                      borderRadius: 3,
                    }}
                  />
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: isWknd ? 'var(--cyan)' : 'var(--text)' }}>
                    {e.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {st.bentoShowFinancePace !== false && (
        <div
          className="bento-micro-tile interactive bento-col-2"
          onClick={() => onSelectSubTab('summary')}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>💰 EKONOMIKA</div>
          <div className="num privacy-val" style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>
            {fmtKc(ctx.curCost, st.currency)}
          </div>
          <div className="num privacy-val" style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>
            ø {fmtKc(r1(ctx.curCost / ctx.days), st.currency)}/d
          </div>
          <div
            style={{
              marginTop: 6,
              paddingTop: 5,
              borderTop: '0.5px solid var(--border-subtle)',
              fontSize: 9.5,
              color: 'var(--muted)',
            }}
          >
            1g = <strong className="privacy-val" style={{ color: 'var(--text)' }}>{fmtKc(ctx.costPerG, st.currency)}</strong>
            <br />
            1 dávka = <strong className="privacy-val" style={{ color: 'var(--text)' }}>{fmtKc(ctx.costPerDose, st.currency)}</strong>
          </div>
        </div>
      )}

      {/* 6. 24h Circadian Mini-Wave (col-3) + Hydration & Craving Predictor (col-3) */}
      {st.bentoShowCircadianMini !== false && (
        <div
          className="bento-micro-tile interactive bento-col-3"
          onClick={() => onSelectSubTab('intervals')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>
              🕰️ 24H CIRKADIÁNNÍ RYTMUS
            </span>
            <span className="num" style={{ fontSize: 9.5, color: 'var(--accent-light)', fontWeight: 700 }}>
              špička {String(peakHour).padStart(2, '0')}:00
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(24, 1fr)',
              gap: 1.5,
              alignItems: 'end',
              height: 36,
              marginTop: 6,
            }}
          >
            {hourly.map((g, hr) => {
              const pct = g > 0 ? Math.max(14, Math.round((g / maxHourG) * 100)) : 6;
              const isDay = hr >= 7 && hr <= 20;
              return (
                <div
                  key={hr}
                  style={{
                    height: `${pct}%`,
                    borderRadius: 1.5,
                    background:
                      g === 0
                        ? 'rgba(255,255,255,0.06)'
                        : isDay
                        ? 'var(--accent)'
                        : 'var(--purple)',
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--muted)', marginTop: 4 }}>
            <span>00h</span>
            <span>06h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </div>
      )}

      {st.bentoShowHydrationCraving !== false && (
        <div
          className="bento-micro-tile interactive bento-col-3"
          onClick={() => onSelectSubTab(st.enableCravingTracker ? 'craving' : 'health')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>
              🤤 CHUŤ & 💧 HYDRATACE
            </span>
            <span className="num" style={{ fontSize: 9.5, color: 'var(--cyan)', fontWeight: 700 }}>
              🏆 {unlockedAchCount}/{ACH_DEFS.length}
            </span>
          </div>

          <div style={{ marginTop: 5, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: 10 }}>Predikce chuti:</span>
              <strong className="num" style={{ color: 'var(--warning)', fontSize: 11 }}>
                {cravingPred.available && cravingPred.hoursFromNow !== null
                  ? cravingPred.hoursFromNow <= 0
                    ? 'Právě teď'
                    : `za ~${r1(cravingPred.hoursFromNow)} h`
                  : `${(state.cravingLogs || []).length}/${st.cravingPredictionThresholdMin || 3} logů`}
              </strong>
            </div>
            {cravingPred.mitThresholdMg !== null && (
              <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>
                Naučený práh MIT: <strong className="num">{fmtMg(cravingPred.mitThresholdMg)}</strong>
              </div>
            )}
          </div>

          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--muted)', marginBottom: 2 }}>
              <span>Dnešní voda: {todayWaterMl} ml</span>
              <span className="num" style={{ color: 'var(--cyan)', fontWeight: 700 }}>{waterPct}%</span>
            </div>
            <div className="bento-meter-track" style={{ height: 4.5 }}>
              <div
                className="bento-meter-fill"
                style={{ width: `${waterPct}%`, background: 'var(--cyan)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. Quick Sub-Tab Jump Strip (col-6) */}
      {st.bentoShowQuickJumps !== false && (
        <div className="bento-micro-tile bento-col-6" style={{ padding: '10px 11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>
              🧭 DETAILNÍ ANALYTICKÉ PODSTRÁNKY (KLEPNI PRO OTEVŘENÍ)
            </span>
            <Icon name="grid" size={13} style={{ color: 'var(--muted)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <button
              type="button"
              className="bento-subcell clickable"
              style={{ textAlign: 'left', padding: '7px 9px' }}
              onClick={() => onSelectSubTab('summary')}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700 }}>📊 Souhrn</div>
              <div className="num" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                {ctx.curDoses.length} dávek · {fmtG(ctx.curAvgG)}g/d
              </div>
            </button>

            <button
              type="button"
              className="bento-subcell clickable"
              style={{ textAlign: 'left', padding: '7px 9px' }}
              onClick={() => onSelectSubTab('intervals')}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700 }}>⏱ Rozestupy</div>
              <div className="num" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                ø {intHist.stats.avgGapH ?? '—'}h · {intHist.stats.compliancePct}%
              </div>
            </button>

            <button
              type="button"
              className="bento-subcell clickable"
              style={{ textAlign: 'left', padding: '7px 9px' }}
              onClick={() => onSelectSubTab('strains')}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700 }}>🌿 Odrůdy</div>
              <div className="num" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                {div.activeStrainsCount} druhů · rot. {div.pct}%
              </div>
            </button>

            {st.enableCravingTracker && (
              <button
                type="button"
                className="bento-subcell clickable"
                style={{ textAlign: 'left', padding: '7px 9px' }}
                onClick={() => onSelectSubTab('craving')}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>🤤 Chuť</div>
                <div className="num" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                  {(state.cravingLogs || []).length} záznamů
                </div>
              </button>
            )}

            <button
              type="button"
              className="bento-subcell clickable"
              style={{ textAlign: 'left', padding: '7px 9px' }}
              onClick={() => onSelectSubTab('health')}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700 }}>💚 Zdraví & Plán</div>
              <div className="num" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                citlivost {ctx.curTolScore}% · T-Break
              </div>
            </button>

            {st.enableAchievements && (
              <button
                type="button"
                className="bento-subcell clickable"
                style={{ textAlign: 'left', padding: '7px 9px' }}
                onClick={() => onSelectSubTab('achievements')}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>🏆 Úspěchy</div>
                <div className="num" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                  odemčeno {unlockedAchCount}/{ACH_DEFS.length}
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
