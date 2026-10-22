import React from 'react';
import { DiversityTrend } from '../../../components/charts/DiversityTrend';
import { DoseEfficiencyScatter } from '../../../components/charts/DoseEfficiencyScatter';
import { StrainDonut } from '../../../components/charts/StrainDonut';
import { StrainEvolution } from '../../../components/charts/StrainEvolution';
import { Icon } from '../../../components/icons/Icon';
import { EFFECT_KEYS, EFFECT_MAP } from '../../../constants/effects';
import {
  calcAdvancedAnalyticsMetrics,
  calcStrainDiversityIndex,
  calcStrainHistory,
} from '../../../lib/analytics';
import { fmtG, fmtKc } from '../../../lib/format';
import { useAppStore } from '../../../store/useAppStore';
import { AnalyticsContext, Strain } from '../../../types';

interface StrainsTabProps {
  ctx: AnalyticsContext;
  strains: Strain[];
}

export const StrainsTab: React.FC<StrainsTabProps> = ({ ctx, strains }) => {
  const { st } = ctx;
  const state = useAppStore();
  const div = calcStrainDiversityIndex(ctx.curDoses, st.diversityWarningThreshold || 3);
  const hist = calcStrainHistory(ctx.curDoses, strains, ctx.days, st.dayStartHour || 0);
  const adv = calcAdvancedAnalyticsMetrics(ctx, state);

  return (
    <div>
      {/* KPI grid */}
      <div className="bento-grid">
        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Aktivní druhy</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {div.activeStrainsCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>v tomto období</div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Index rotace (Shannon)</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {div.pct} %
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>H&apos; = {div.shannonH}</div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Dominantní druh</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {div.topStrainName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>podíl {div.topStrainPct} %</div>
        </div>

        <div className="bento-tile">
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Stav adaptace</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{div.statusLabel}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>série {div.streak}×</div>
        </div>
      </div>

      {/* Skóre rotace */}
      <div className="card">
        <div className="card-title">
          <span>🔄 Skóre rotace</span>
        </div>
        <DiversityTrend
          pct={div.pct}
          shannonH={div.shannonH}
          streak={div.streak}
          lastStrainName={div.lastStrainName}
          statusLabel={div.statusLabel}
          statusCls={div.statusCls}
          threshold={st.diversityWarningThreshold || 3}
        />
      </div>

      {/* Smart Strain Efficiency & Stock Runway */}
      {st.anaShowStrainEfficiency !== false && adv.strainEfficiencyList.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span>⚡ Efektivita odrůd, poměr cena/výkon & výdrž</span>
            <span className="delta-tag good">Chytré hodnocení</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {adv.strainEfficiencyList.map((item) => (
              <div key={item.strainId} className="bento-subcell" style={{ padding: '9px 11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="dot" style={{ background: item.color }} />
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{item.name}</span>
                    <span className="delta-tag" style={{ fontSize: 10 }}>
                      {item.mitPct}% MIT
                    </span>
                  </div>
                  <span className="delta-tag good">
                    Index {item.efficiencyScore}/100
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                    marginTop: 8,
                    fontSize: 11,
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Prům. dávka</div>
                    <div className="num" style={{ fontWeight: 700, marginTop: 1 }}>
                      {fmtG(item.avgDoseG)} g
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>MIT za 1 {st.currency}</div>
                    <div className="num" style={{ fontWeight: 700, marginTop: 1 }}>
                      {item.mitPerKc} mg
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Cena / g</div>
                    <div className="num privacy-val" style={{ fontWeight: 700, marginTop: 1 }}>
                      {fmtKc(item.costPerG, st.currency)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Sklad / Výdrž</div>
                    <div className="num" style={{ fontWeight: 700, marginTop: 1 }}>
                      {fmtG(item.stockRemainingG)}g{' '}
                      {item.runwayDays !== null ? `(~${item.runwayDays}d)` : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dose Size vs Rating Sweet-Spot Matrix */}
      {st.anaShowDoseEfficiencyScatter !== false && (
        <div className="card">
          <div className="card-title">
            <span>🎯 Matice velikosti dávky vs. spokojenost (Sweet-Spot)</span>
            <span className="delta-tag">Optimum gramáže</span>
          </div>
          <DoseEfficiencyScatter doses={ctx.curDoses} />
        </div>
      )}

      {/* Evoluce podílu druhů */}
      <div className="card">
        <div className="card-title">
          <span>📊 Evoluce podílu druhů</span>
        </div>
        <StrainEvolution daily={hist.daily} activeStrains={hist.activeStrains} />
      </div>

      {/* Celkový podíl */}
      <div className="card">
        <div className="card-title">
          <span>🍩 Celkový podíl</span>
        </div>
        <StrainDonut parts={ctx.strainParts} totalG={ctx.curG} />
      </div>

      {/* Účinky a spokojenost dle odrůd */}
      <div className="card">
        <div className="card-title">
          <span>⭐ Účinky a spokojenost dle odrůd</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ctx.strainParts.map((sp) => {
            const sDoses = ctx.curDoses.filter(
              (d) => (d.strainId || d.strainName) === sp.id
            );
            const effCounts: Record<string, number> = {};
            EFFECT_KEYS.forEach((k) => {
              effCounts[k] = 0;
            });
            sDoses.forEach((d) => {
              if (d.effect) effCounts[d.effect] = (effCounts[d.effect] || 0) + 1;
            });

            return (
              <div key={sp.id} className="bento-subcell">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="dot" style={{ background: sp.color }} />
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{sp.name}</span>
                  </div>
                  <span className="delta-tag warn">
                    {sp.avgRating ? (
                      <>
                        <Icon name="star" size={11} fill="currentColor" /> {sp.avgRating}
                      </>
                    ) : (
                      'Bez hodnocení'
                    )}{' '}
                    · {sp.count}×
                  </span>
                </div>
                <div className="chip-row">
                  {EFFECT_KEYS.map((ek) => {
                    const cnt = effCounts[ek] || 0;
                    if (cnt === 0) return null;
                    return (
                      <span key={ek} className="chip" style={{ padding: '3px 9px', fontSize: 11 }}>
                        {EFFECT_MAP[ek].icon} {EFFECT_MAP[ek].label} ({cnt}×)
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
