import React from 'react';
import { AlkaloidRatioChart } from '../../../components/charts/AlkaloidRatioChart';
import { CircadianDayNight } from '../../../components/charts/CircadianDayNight';
import { CumulativeIntakeChart } from '../../../components/charts/CumulativeIntakeChart';
import { DoseHistogram } from '../../../components/charts/DoseHistogram';
import { MitragynineCurve } from '../../../components/charts/MitragynineCurve';
import { RadarProfileChart } from '../../../components/charts/RadarProfileChart';
import { SmoothBezierChart } from '../../../components/charts/SmoothBezierChart';
import { SpendingBarChart } from '../../../components/charts/SpendingBarChart';
import { StrainDonut } from '../../../components/charts/StrainDonut';
import { ToleranceTrend } from '../../../components/charts/ToleranceTrend';
import { WeekdayProfileChart } from '../../../components/charts/WeekdayProfileChart';
import { DeltaTag } from '../../../components/ui/DeltaTag';
import {
  calcAdvancedAnalyticsMetrics,
  calcCumulativeTrajectory,
  calcRadarDisciplineProfile,
  calcWeekdayProfile,
} from '../../../lib/analytics';
import { fmtG, fmtKc, fmtMg, r1 } from '../../../lib/format';
import { getCravingInsights, getSmartInsights } from '../../../lib/insights';
import { calcSmartReceptorAnalysis } from '../../../lib/tolerance';
import { useAppStore } from '../../../store/useAppStore';
import { AnalyticsContext } from '../../../types';

interface SummaryTabProps {
  ctx: AnalyticsContext;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ ctx }) => {
  const { st } = ctx;
  const state = useAppStore();
  const cravingLogs = state.cravingLogs;
  const allDoses = state.doses;
  const insights = [
    ...getCravingInsights(cravingLogs || [], allDoses, st),
    ...getSmartInsights(ctx),
  ].slice(0, 6);
  const bevSharePct = ctx.curCost > 0 ? Math.round((ctx.curBevCost / ctx.curCost) * 100) : 0;

  const recAnalysis = calcSmartReceptorAnalysis(state);
  const adv = calcAdvancedAnalyticsMetrics(ctx, state);
  const radar = calcRadarDisciplineProfile(ctx, state);
  const cum = calcCumulativeTrajectory(ctx.daily, ctx.L);
  const weekday = calcWeekdayProfile(ctx.daily, ctx.curDoses);

  return (
    <div>
      {/* Smart insights card */}
      {st.enableSmartInsights && insights.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span>💡 Chytré postřehy</span>
            <span className="delta-tag">{insights.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {insights.map((ins, i) => (
              <div key={i} className={`dash-smart-insight ${ins.cls}`} style={{ padding: '8px 11px' }}>
                <span>{ins.icon}</span>
                <span style={{ fontSize: 12 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smooth Bezier consumption curve */}
      <div className="card">
        <div className="card-title">
          <span>📈 Vyhlazená křivka spotřeby</span>
          <span className="delta-tag">{ctx.days}d</span>
        </div>
        <SmoothBezierChart
          daily={ctx.daily}
          limitG={ctx.L}
          hardLimitG={ctx.hardL}
          avgG={ctx.curAvgG}
        />
        <div className="chart-header-stats">
          <div>
            <div className="stat-cell-label">Denní průměr</div>
            <div className="stat-cell-val">{fmtG(ctx.curAvgG)} g</div>
          </div>
          <div>
            <div className="stat-cell-label">Maximum dne</div>
            <div className="stat-cell-val">{fmtG(ctx.peakDayG)} g</div>
          </div>
          <div>
            <div className="stat-cell-label">Aktivní dny</div>
            <div className="stat-cell-val">
              {ctx.activeDaysCount}/{ctx.days}
            </div>
          </div>
          <div>
            <div className="stat-cell-label">Celkem</div>
            <div className="stat-cell-val privacy-val">{fmtG(ctx.curG)} g</div>
          </div>
        </div>
      </div>

      {/* Cumulative Intake vs Limit Trajectory */}
      {st.anaShowCumulativeChart !== false && (
        <div className="card">
          <div className="card-title">
            <span>📐 Kumulativní trajektorie vs. rozpočet limitu</span>
            <span className={`delta-tag ${cum.savedOrExcessG >= 0 ? 'good' : 'warn'}`}>
              {cum.savedOrExcessG >= 0
                ? `Rezerva -${fmtG(cum.savedOrExcessG)} g`
                : `Nad +${fmtG(Math.abs(cum.savedOrExcessG))} g`}
            </span>
          </div>
          <CumulativeIntakeChart
            points={cum.points}
            totalActualG={cum.totalActualG}
            totalBudgetG={cum.totalBudgetG}
            savedOrExcessG={cum.savedOrExcessG}
          />
        </div>
      )}

      {/* 6-Axis Radar Profile */}
      {st.anaShowRadarChart !== false && (
        <div className="card">
          <div className="card-title">
            <span>🕸️ 6osý radar disciplíny, receptorů & zdraví</span>
            <span className="delta-tag good">Celkem {radar.overallScore} %</span>
          </div>
          <RadarProfileChart axes={radar.axes} overallScore={radar.overallScore} />
        </div>
      )}

      {/* Advanced Smart Diagnostics Card */}
      {st.anaShowAdvancedStats !== false && (
        <div className="card">
          <div className="card-title">
            <span>🧠 Chytrá diagnostika & Stabilita dávkování</span>
            <span className="delta-tag good">Stabilita {adv.stabilityIndexPct} %</span>
          </div>
          <div className="bento-subgrid-4">
            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Konzistence (CV)</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                {adv.stabilityIndexPct} %
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                odchylka ±{fmtG(adv.dailyStdDevG)} g/d
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Dny v limitu</div>
              <div
                className="num"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginTop: 2,
                  color: adv.limitCompliancePct >= 80 ? 'var(--accent)' : 'var(--warning)',
                }}
              >
                {adv.limitCompliancePct} %
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                STOP překročení: {adv.hardLimitBreaches}×
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Alkaloidový ekv.</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                {fmtG(adv.effectiveAlkaloidLoadG)} g
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                váha 7-OH ×{st.toleranceSevenOhMultiplier ?? 12}
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Víkend vs. Týden</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                {adv.weekendDeltaPct > 0 ? `+${adv.weekendDeltaPct}%` : `${adv.weekendDeltaPct}%`}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                So–Ne {fmtG(adv.weekendAvgG)}g / Po–Pá {fmtG(adv.weekdayAvgG)}g
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 11.5,
              color: 'var(--muted)',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '0.5px solid var(--border-subtle)',
            }}
          >
            <span>
              Okno užívání: <strong style={{ color: 'var(--text)' }}>{adv.avgFirstDoseTime} – {adv.avgLastDoseTime}</strong> ({adv.avgActiveWindowH} h)
            </span>
            <span>
              Noční regenerace: <strong style={{ color: 'var(--accent)' }}>{adv.avgFastingWindowH} h/den</strong> · ø {adv.avgDosesPerActiveDay} dávek/den
            </span>
          </div>
        </div>
      )}

      {/* Weekday Profile Chart (Po-Ne) */}
      {st.anaShowWeekdayChart !== false && (
        <div className="card">
          <div className="card-title">
            <span>🗓️ Profil dnů v týdnu (Po–Ne)</span>
            <span className="delta-tag">
              Max: {weekday.peakWeekdayLabel} · Min: {weekday.lowestWeekdayLabel}
            </span>
          </div>
          <WeekdayProfileChart
            entries={weekday.entries}
            limitG={ctx.L}
            currency={st.currency}
          />
        </div>
      )}

      {/* Mitragynine Exposure */}
      {st.showAlkaloids && (
        <div className="card">
          <div className="card-title">
            <span>🧬 Expozice Mitragyninu</span>
            <span className="delta-tag">MIT / 7-OH</span>
          </div>
          <MitragynineCurve daily={ctx.daily} bodyWeightKg={st.bodyWeightKg} />
          <div className="chart-header-stats">
            <div>
              <div className="stat-cell-label">Celkem MIT</div>
              <div className="stat-cell-val privacy-val">{fmtMg(ctx.curMit)}</div>
            </div>
            <div>
              <div className="stat-cell-label">Max dne</div>
              <div className="stat-cell-val">{fmtMg(ctx.peakDayMit)}</div>
            </div>
            <div>
              <div className="stat-cell-label">Na kg váhy</div>
              <div className="stat-cell-val">{ctx.mgPerKg} mg/kg</div>
            </div>
            <div>
              <div className="stat-cell-label">7-OH celkem</div>
              <div className="stat-cell-val">{fmtMg(ctx.cur7Oh)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Alkaloid Potency Ratio Chart (MIT vs 7-OH * multiplier) */}
      {st.showAlkaloids && st.anaShowAlkaloidRatioChart !== false && (
        <div className="card">
          <div className="card-title">
            <span>🧪 Poměr čistého MIT vs. 7-OH potenční ekvivalent</span>
            <span className="delta-tag">7-OH ×{st.toleranceSevenOhMultiplier ?? 12}</span>
          </div>
          <AlkaloidRatioChart
            daily={ctx.daily}
            sevenOhMultiplier={st.toleranceSevenOhMultiplier ?? 12}
          />
        </div>
      )}

      {/* Financial Spending */}
      {st.showFinances && (
        <div className="card">
          <div className="card-title">
            <span>💰 Finanční útrata</span>
            <span className="delta-tag privacy-val">{fmtKc(ctx.curCost, st.currency)}</span>
          </div>
          <SpendingBarChart daily={ctx.daily} dailyBudgetKc={ctx.B} />
          <div className="chart-header-stats">
            <div>
              <div className="stat-cell-label">Denní ø</div>
              <div className="stat-cell-val privacy-val">
                {fmtKc(r1(ctx.curCost / ctx.days), st.currency)}
              </div>
            </div>
            <div>
              <div className="stat-cell-label">Cena za gram</div>
              <div className="stat-cell-val">
                {fmtKc(ctx.costPerG, st.currency)}
              </div>
            </div>
            <div>
              <div className="stat-cell-label">Cena 1 dávky</div>
              <div className="stat-cell-val">
                {fmtKc(ctx.costPerDose, st.currency)}
              </div>
            </div>
            <div>
              <div className="stat-cell-label">Nápoje podíl</div>
              <div className="stat-cell-val">{bevSharePct} %</div>
            </div>
          </div>
        </div>
      )}

      {/* Receptor Sensitivity Trend */}
      {st.enableReceptorScore && (
        <div className="card">
          <div className="card-title">
            <span>⚡ Vývoj citlivosti receptorů & Tolerance</span>
            <span className={`delta-tag ${recAnalysis.statusCls}`}>
              {ctx.curTolScore} % · {recAnalysis.mode === 'smart' ? 'Chytrý' : 'Klasický'}
            </span>
          </div>
          <ToleranceTrend history={ctx.toleranceHistory} />
          <div className="chart-header-stats">
            <div>
              <div className="stat-cell-label">Citlivost</div>
              <div className="stat-cell-val">{ctx.curTolScore} %</div>
            </div>
            <div>
              <div className="stat-cell-label">Zátěž receptorů</div>
              <div className="stat-cell-val">{recAnalysis.receptorLoadPct} %</div>
            </div>
            <div>
              <div className="stat-cell-label">Index tolerance</div>
              <div className="stat-cell-val">{recAnalysis.toleranceIndex} %</div>
            </div>
            <div>
              <div className="stat-cell-label">Ekv. 2.0g dávky</div>
              <div className="stat-cell-val">{fmtG(recAnalysis.equivalentDoseFor2g)} g</div>
            </div>
          </div>

          {st.anaShowReceptorBreakdown !== false && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                fontSize: 11.5,
                color: 'var(--muted)',
                marginTop: 10,
                paddingTop: 8,
                borderTop: '0.5px solid var(--border-subtle)',
              }}
            >
              <span>
                Subjektivní síla: <strong style={{ color: 'var(--text)' }}>{recAnalysis.effectivePotencyPct} %</strong> (akutní obsazenost {recAnalysis.acuteOccupancyPct} %)
              </span>
              <span>
                Do 90 % citlivosti: <strong style={{ color: 'var(--accent)' }}>{ctx.daysTo90} dní</strong> (+{ctx.recPerDay}%/d)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Dose Distribution Histogram */}
      <div className="card">
        <div className="card-title">
          <span>⚖️ Rozdělení velikostí dávek</span>
          <span className="delta-tag">{ctx.doseDist.total} dávek</span>
        </div>
        <DoseHistogram dist={ctx.doseDist} />
      </div>

      {/* Bento grid: 4 KPI tiles */}
      <div className="bento-grid">
        <div className="bento-tile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Celková spotřeba</span>
            <DeltaTag cur={ctx.curG} prior={ctx.priorG} invert />
          </div>
          <div className="num privacy-val" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {fmtG(ctx.curG)} g
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>předtím {fmtG(ctx.priorG)} g</div>
        </div>

        <div className="bento-tile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Denní průměr</span>
            <DeltaTag cur={ctx.curAvgG} prior={ctx.priorAvgG} invert />
          </div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {fmtG(ctx.curAvgG)} g
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>předtím {fmtG(ctx.priorAvgG)} g/d</div>
        </div>

        <div className="bento-tile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Průměrná dávka</span>
            <DeltaTag cur={ctx.curAvgDoseG} prior={ctx.priorAvgDoseG} invert />
          </div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {fmtG(ctx.curAvgDoseG)} g
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>z {ctx.curDoses.length} dávek</div>
        </div>

        <div className="bento-tile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Útrata celkem</span>
            <DeltaTag cur={ctx.curCost} prior={ctx.priorCost} invert />
          </div>
          <div className="num privacy-val" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {fmtKc(ctx.curCost, st.currency)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            předtím {fmtKc(ctx.priorCost, st.currency)}
          </div>
        </div>
      </div>

      {/* Predikce spotřeby & KPI */}
      <div className="card">
        <div className="card-title">
          <span>🔮 Predikce spotřeby & KPI</span>
        </div>
        <div className="bento-subgrid-4">
          <div className="bento-subcell">
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Skladová výdrž</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
              ~{ctx.runwayDays} dní
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
              zásoba {fmtG(ctx.stockTotalG)} g
            </div>
          </div>
          <div className="bento-subcell">
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>7d vs období</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
              {ctx.ma7vsAvgDiff > 0 ? `+${ctx.ma7vsAvgDiff}%` : `${ctx.ma7vsAvgDiff}%`}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
              7d ø {fmtG(ctx.last7AvgG)} g/d
            </div>
          </div>
          <div className="bento-subcell">
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Projektovaný rok</div>
            <div className="num privacy-val" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
              {fmtG(ctx.projAnnualKg)} kg
            </div>
            <div className="privacy-val" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
              {fmtKc(ctx.projAnnualKc, st.currency)} / rok
            </div>
          </div>
          <div className="bento-subcell">
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Průměrný odstup</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
              {ctx.avgCooldownH !== null ? `${ctx.avgCooldownH} h` : '—'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>mezi dávkami</div>
          </div>
        </div>
      </div>

      {/* Strain Donut */}
      <div className="card">
        <div className="card-title">
          <span>🌿 Rozložení druhů</span>
        </div>
        <StrainDonut parts={ctx.strainParts} totalG={ctx.curG} />
      </div>

      {/* 24h Circadian Day/Night */}
      {st.enableHourlyDistribution && ctx.curDoses.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span>🕰️ 24h Cirkadiánní křivka</span>
          </div>
          <CircadianDayNight doses={ctx.curDoses} />
        </div>
      )}
    </div>
  );
};
