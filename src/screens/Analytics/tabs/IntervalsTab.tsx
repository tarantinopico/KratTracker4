import React from 'react';
import { ComplianceRate } from '../../../components/charts/ComplianceRate';
import { IntervalTrend } from '../../../components/charts/IntervalTrend';
import { PlasmaKineticsContinuous } from '../../../components/charts/PlasmaKineticsContinuous';
import { WeeklyMatrix } from '../../../components/charts/WeeklyMatrix';
import {
  calcAdvancedAnalyticsMetrics,
  calcContinuousPlasmaCurve,
  calcIntervalHistory,
  calcWeeklyTimeMatrix,
} from '../../../lib/analytics';
import { useAppStore } from '../../../store/useAppStore';
import { AnalyticsContext, Dose } from '../../../types';

interface IntervalsTabProps {
  ctx: AnalyticsContext;
  allDoses: Dose[];
}

export const IntervalsTab: React.FC<IntervalsTabProps> = ({ ctx, allDoses }) => {
  const { st } = ctx;
  const state = useAppStore();
  const intHist = calcIntervalHistory(allDoses, ctx.days, st);
  const plasma = calcContinuousPlasmaCurve(allDoses, ctx.days, st);
  const matrix = calcWeeklyTimeMatrix(ctx.curDoses);
  const adv = calcAdvancedAnalyticsMetrics(ctx, state);

  return (
    <div>
      {/* KPI grid */}
      <div className="bento-grid">
        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Průměrný rozestup</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {intHist.stats.avgGapH !== null ? `${intHist.stats.avgGapH} h` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            medián {intHist.stats.medianGapH !== null ? `${intHist.stats.medianGapH} h` : '—'}
          </div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            Disciplína (≥ {intHist.stats.threshH}h)
          </div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {intHist.stats.compliancePct} %
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            z {intHist.stats.totalIntervals} rozestupů
          </div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Noční okno</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {intHist.stats.avgNightGapH !== null ? `${intHist.stats.avgNightGapH} h` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>regenerace ve spánku</div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Extrémy (min / max)</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            {intHist.stats.minGapH !== null
              ? `${intHist.stats.minGapH}h / ${intHist.stats.maxGapH}h`
              : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>uvnitř dne</div>
        </div>
      </div>

      {/* Smart Dosing Window & Fasting Rhythm */}
      {st.anaShowAdvancedStats !== false && (
        <div className="card">
          <div className="card-title">
            <span>⏳ Denní okno užívání & Regenerační půst</span>
            <span className="delta-tag good">{adv.avgFastingWindowH}h klidu / den</span>
          </div>
          <div className="bento-subgrid-4">
            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>První dávka ø</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                {adv.avgFirstDoseTime}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>start dne</div>
            </div>
            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Poslední dávka ø</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                {adv.avgLastDoseTime}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>konec okna</div>
            </div>
            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Aktivní okno</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                {adv.avgActiveWindowH} h
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                ø {adv.avgDosesPerActiveDay}× denně
              </div>
            </div>
            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Okno bez kratomu</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: 'var(--accent)' }}>
                {adv.avgFastingWindowH} h
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>washout receptorů</div>
            </div>
          </div>
        </div>
      )}

      {/* Historie rozestupů */}
      <div className="card">
        <div className="card-title">
          <span>⏱️ Historie rozestupů</span>
          <span className="delta-tag">Práh {intHist.stats.threshH} h</span>
        </div>
        <IntervalTrend
          dailyHistory={intHist.dailyHistory}
          thresholdH={intHist.stats.threshH}
        />
      </div>

      {/* Denní disciplína */}
      <div className="card">
        <div className="card-title">
          <span>🎯 Denní disciplína</span>
          <span className="delta-tag">Cíl ≥ 80%</span>
        </div>
        <ComplianceRate dailyHistory={intHist.dailyHistory} />
      </div>

      {/* Kontinuální hladina MIT */}
      <div className="card">
        <div className="card-title">
          <span>🧬 Kontinuální hladina MIT</span>
          <span className="delta-tag">β {st.mitHalfLifeBetaH}h</span>
        </div>
        <PlasmaKineticsContinuous
          points={plasma.points}
          maxMg={plasma.maxMg}
          avgMg={plasma.avgMg}
          currentMg={plasma.currentMg}
        />
        <div className="chart-header-stats">
          <div>
            <div className="stat-cell-label">Aktuálně</div>
            <div className="stat-cell-val">{plasma.currentMg} mg</div>
          </div>
          <div>
            <div className="stat-cell-label">Průměr</div>
            <div className="stat-cell-val">{plasma.avgMg} mg</div>
          </div>
          <div>
            <div className="stat-cell-label">Špička</div>
            <div className="stat-cell-val">{plasma.maxMg} mg</div>
          </div>
          <div>
            <div className="stat-cell-label">Poločas α/β</div>
            <div className="stat-cell-val">
              {st.mitHalfLifeAlphaH}/{st.mitHalfLifeBetaH}h
            </div>
          </div>
        </div>
      </div>

      {/* Týdenní matice 7×24 */}
      <div className="card">
        <div className="card-title">
          <span>🗓️ Týdenní matice 7×24</span>
          <span className="delta-tag">{matrix.totalCount} dávek</span>
        </div>
        <WeeklyMatrix matrix={matrix.matrix} maxCount={matrix.maxCount} />
      </div>
    </div>
  );
};
