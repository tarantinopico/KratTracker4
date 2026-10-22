import React from 'react';
import { Icon } from '../components/icons/Icon';
import { Sheet } from '../components/sheets/Sheet';
import { EFFECT_MAP } from '../constants/effects';
import { fmtDateShort, fmtTime } from '../lib/date';
import { fmtG, fmtKc, fmtMg } from '../lib/format';
import { calcPackageDetailedStats, calcSmartStockForecast } from '../lib/stock';
import { useAppStore } from '../store/useAppStore';

export const PackageDetailSheet: React.FC = () => {
  const state = useAppStore();
  const pkgId = state.detailPackageId;
  const close = state.closePackageDetailSheet;
  const st = state.settings;

  const pkg = pkgId ? state.packages.find((p) => p.id === pkgId) || null : null;
  if (!pkg) {
    return (
      <Sheet open={false} onClose={close} title="Detail balení">
        <div />
      </Sheet>
    );
  }

  const strain = state.strains.find((s) => s.id === pkg.strainId) || null;
  const overallForecast = calcSmartStockForecast(
    state.packages,
    state.strains,
    state.doses,
    st
  );
  const stats = calcPackageDetailedStats(
    pkg,
    strain,
    state.doses,
    st,
    overallForecast.effectiveDailyBurnG
  );

  const maxDailyG = Math.max(1, ...stats.dailySeries.map((d) => d.g));
  const color = strain?.color || '#30D158';

  return (
    <Sheet
      open={Boolean(pkgId)}
      onClose={close}
      title={pkg.name || strain?.name || 'Detail balení'}
      sub={`${strain?.name || 'Neznámá odrůda'} · podrobné statistiky a analytika balení`}
    >
      {/* Top Status & Strain Header */}
      <div
        className="bento-subcell"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dot" style={{ background: color, width: 11, height: 11 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {strain?.name || 'Neznámý druh'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              MIT {strain?.mitPct ?? st.defaultMitPct}% · 7-OH{' '}
              {strain?.sevenOhPct ?? st.defaultSevenOhPct}% ·{' '}
              {fmtKc(pkg.pricePerG, st.currency)}/g
            </div>
          </div>
        </div>
        <span
          className={`delta-tag ${
            pkg.status === 'active'
              ? 'good'
              : pkg.status === 'unopened'
              ? ''
              : 'warn'
          }`}
        >
          {pkg.status === 'active'
            ? 'Otevřené'
            : pkg.status === 'unopened'
            ? 'V zásobě'
            : pkg.calibrated
            ? 'Spotřebováno · Kalibrováno'
            : 'Spotřebováno'}
        </span>
      </div>

      {/* Progress & Weight Balance */}
      <div className="bento-subcell" style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
          }}
        >
          <div>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Zbývá v balení: </span>
            <strong className="num" style={{ fontSize: 16 }}>
              {fmtG(pkg.remainingWeightG)} g
            </strong>{' '}
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              ({stats.remainingPct} %)
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Původně {fmtG(pkg.initialWeightG)} g
          </div>
        </div>

        <div className="bento-meter-track" style={{ height: 9 }}>
          <div
            className="bento-meter-fill"
            style={{
              width: `${stats.remainingPct}%`,
              background:
                pkg.remainingWeightG <= (st.lowStockWarningG || 20)
                  ? 'var(--warning)'
                  : color,
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginTop: 10,
            paddingTop: 8,
            borderTop: '0.5px solid var(--border-subtle)',
            fontSize: 11.5,
          }}
        >
          <div>
            <div style={{ color: 'var(--muted)' }}>Zapsáno dávkami</div>
            <div className="num" style={{ fontWeight: 700, marginTop: 2 }}>
              {fmtG(stats.loggedG)} g ({stats.dosesCount}×)
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)' }}>Skutečný úbytek</div>
            <div className="num" style={{ fontWeight: 700, marginTop: 2 }}>
              {fmtG(stats.consumedG)} g ({stats.consumedPct} %)
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)' }}>Odchylka váhy</div>
            <div
              className="num"
              style={{
                fontWeight: 700,
                marginTop: 2,
                color:
                  Math.abs(stats.unaccountedG) > 2
                    ? 'var(--warning)'
                    : 'var(--accent)',
              }}
            >
              {stats.unaccountedG > 0 ? '+' : ''}
              {fmtG(stats.unaccountedG)} g
            </div>
          </div>
        </div>
      </div>

      {/* Smart Depletion Forecast for this Package */}
      {pkg.status !== 'finished' && (
        <div className="bento-subcell" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 12.5 }}>
              🔮 Chytrý odhad výdrže balení
            </span>
            <span className="delta-tag">
              {st.stockForecastMode === 'classic' ? 'Klasický průměr' : 'Chytrý model'}
            </span>
          </div>
          <div className="bento-subgrid-4">
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Tempo odběru</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {fmtG(stats.pkgDailyBurnG)} g/d
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Vydrží (v mixu)</div>
              <div
                className="num"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginTop: 2,
                  color:
                    stats.etaDays !== null && stats.etaDays <= (st.stockLowDaysWarning || 7)
                      ? 'var(--warning)'
                      : 'var(--text)',
                }}
              >
                {stats.etaDays !== null ? `≈ ${stats.etaDays} dní` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Datum dobrání</div>
              <div className="num" style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>
                {stats.etaDateTs ? fmtDateShort(stats.etaDateTs) : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Samostatně (100%)</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {stats.soloEtaDays !== null ? `≈ ${stats.soloEtaDays} dní` : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8 KPI Cells: Dosing, Finances & Alkaloids */}
      <div className="bento-subgrid-4" style={{ marginBottom: 12 }}>
        <div className="bento-subcell">
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Průměrná dávka</div>
          <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
            {stats.dosesCount > 0 ? `${fmtG(stats.avgDoseG)} g` : '—'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            medián {stats.dosesCount > 0 ? `${fmtG(stats.medianDoseG)} g` : '—'}
          </div>
        </div>

        <div className="bento-subcell">
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Rozptyl dávek</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {stats.dosesCount > 0
              ? `${fmtG(stats.minDoseG)}–${fmtG(stats.maxDoseG)} g`
              : '—'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>min – max</div>
        </div>

        <div className="bento-subcell">
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Doba používání</div>
          <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
            {stats.daysOpen} d
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            aktivních {stats.activeDaysWithPkg} d
          </div>
        </div>

        <div className="bento-subcell">
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Hodnocení & Efekt</div>
          <div
            className="num"
            style={{
              fontSize: 14,
              fontWeight: 700,
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {stats.avgRating !== null ? (
              <>
                <span style={{ color: 'var(--warning)', display: 'inline-flex' }}>
                  <Icon name="star" size={13} fill="currentColor" />
                </span>
                <span>{stats.avgRating}</span>
              </>
            ) : (
              '—'
            )}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            {stats.topEffect ? `${EFFECT_MAP[stats.topEffect].icon} ${EFFECT_MAP[stats.topEffect].label}` : 'Bez efektu'}
          </div>
        </div>

        {st.showFinances && (
          <>
            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Zbývající hodnota</div>
              <div className="num privacy-val" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {fmtKc(stats.costRemainingKc, st.currency)}
              </div>
              <div className="privacy-val" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                z {fmtKc(pkg.costTotal, st.currency)}
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Cena za dávku</div>
              <div className="num privacy-val" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {stats.dosesCount > 0 ? fmtKc(stats.avgCostPerDoseKc, st.currency) : '—'}
              </div>
              <div className="privacy-val" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                {fmtKc(stats.avgCostPerDayKc, st.currency)} / den
              </div>
            </div>
          </>
        )}

        {st.showAlkaloids && (
          <>
            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Vyčerpáno MIT</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {fmtMg(stats.totalMitMg)}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>ze zapsaných dávek</div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Vyčerpáno 7-OH</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {fmtMg(stats.totalSevenOhMg)}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>alkaloidová bilance</div>
            </div>
          </>
        )}
      </div>

      {/* 14-day mini sparkbar chart of consumption from this package */}
      <div className="bento-subcell" style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11.5,
            color: 'var(--muted)',
            marginBottom: 8,
          }}
        >
          <span>Odběr z tohoto balení (posledních 14 dní)</span>
          <span>
            {pkg.openedAt ? `Otevřeno ${fmtDateShort(pkg.openedAt)}` : 'Neotevřeno'}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(14, 1fr)',
            gap: 4,
            alignItems: 'end',
            height: 54,
            paddingTop: 6,
          }}
        >
          {stats.dailySeries.map((d) => {
            const hPct = d.g > 0 ? Math.max(14, Math.round((d.g / maxDailyG) * 100)) : 6;
            return (
              <div
                key={d.dayKey}
                title={`${d.dayKey}: ${fmtG(d.g)} g (${d.count}×)`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${hPct}%`,
                    borderRadius: 3,
                    background: d.g > 0 ? color : 'rgba(255,255,255,0.08)',
                    opacity: d.g > 0 ? 0.9 : 0.4,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Doses from this package */}
      {stats.pkgDoses.length > 0 && (
        <div className="bento-subcell" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>
            Poslední zapsané dávky z balení ({stats.pkgDoses.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {stats.pkgDoses.slice(0, 5).map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  padding: '4px 0',
                  borderBottom: '0.5px solid var(--border-subtle)',
                }}
              >
                <span>
                  {fmtDateShort(d.timestamp)} · {fmtTime(d.timestamp, st.timeFormat24)}
                </span>
                <span
                  className="num"
                  style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <span>{fmtG(d.amountG)} g</span>
                  {d.rating > 0 ? (
                    <span
                      style={{
                        color: 'var(--warning)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Icon name="star" size={11} fill="currentColor" />
                      {d.rating}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {pkg.status !== 'unopened' && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ flex: 1 }}
            onClick={() => {
              close();
              state.openReconcileSheet(pkg.id);
            }}
          >
            <Icon name="calc" size={15} />
            <span>Dopočet / Kalibrace</span>
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-primary"
          style={{ flex: 1 }}
          onClick={() => {
            close();
            state.openPackageSheet(pkg.id);
          }}
        >
          <Icon name="pencil" size={15} />
          <span>Upravit balení</span>
        </button>
      </div>
    </Sheet>
  );
};
