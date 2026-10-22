import React from 'react';
import { Icon } from '../../components/icons/Icon';
import { TopHeader } from '../../components/layout/TopHeader';
import { fmtDateShort } from '../../lib/date';
import { fmtG, fmtKc, r1 } from '../../lib/format';
import {
  calcPackageDetailedStats,
  calcSmartStockForecast,
} from '../../lib/stock';
import { useAppStore } from '../../store/useAppStore';

export const StockScreen: React.FC = () => {
  const state = useAppStore();
  const st = state.settings;
  const now = Date.now();

  const forecast = calcSmartStockForecast(
    state.packages,
    state.strains,
    state.doses,
    st,
    now
  );

  const filtered = state.packages.filter((p) => p.status === state.stockFilter);
  const stockedStrains = forecast.strainForecasts.filter((s) => s.totalG > 0);

  return (
    <div className="screen active">
      <TopHeader
        icon="package"
        title="Sklad"
        subtitle="Zásoby, chytrá výdrž a balení"
        extraAction={
          <button
            type="button"
            className="icon-btn"
            aria-label="Přidat nové balení"
            onClick={() => state.openPackageSheet(null)}
          >
            <Icon name="plus" size={18} />
          </button>
        }
      />

      {/* KPI Strip */}
      <div className="stats-4" style={{ marginBottom: 10 }}>
        <div className="stat-cell">
          <div className="stat-cell-label">Skladem</div>
          <div className="stat-cell-val privacy-val">{fmtG(forecast.totalAllStockG)} g</div>
          <div className="stat-cell-sub">
            {fmtG(forecast.activeStockG)}g otevř.
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Hodnota</div>
          <div className="stat-cell-val privacy-val">
            {fmtKc(forecast.totalValueKc, st.currency)}
          </div>
          <div className="stat-cell-sub">
            ø {fmtG(forecast.avgPricePerG)} {st.currency}/g
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Celková výdrž</div>
          <div
            className="stat-cell-val"
            style={{
              color:
                forecast.totalRunwayDays !== null &&
                forecast.totalRunwayDays <= (st.stockLowDaysWarning || 7)
                  ? 'var(--danger)'
                  : 'var(--accent)',
            }}
          >
            {forecast.totalRunwayDays !== null ? `~${forecast.totalRunwayDays} d` : '∞'}
          </div>
          <div className="stat-cell-sub">
            {forecast.estimatedRunoutTs
              ? `do ${fmtDateShort(forecast.estimatedRunoutTs)}`
              : 'bez odběru'}
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Spotřeba</div>
          <div className="stat-cell-val">{fmtG(forecast.effectiveDailyBurnG)} g</div>
          <div className="stat-cell-sub">
            {forecast.mode === 'smart' ? 'vážená / den' : 'průměr / den'}
          </div>
        </div>
      </div>

      {/* Top Smart Stock Visualization & Forecast Card */}
      {st.stockShowVisualization !== false && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="card-title">
            <span>📊 Vizualizace zásob & Chytrý odhad výdrže</span>
            <span className="delta-tag good">
              {forecast.mode === 'smart'
                ? `Chytrý (${forecast.windowDays}d)`
                : `Klasický (${forecast.windowDays}d)`}
            </span>
          </div>

          {/* Stacked visual bar of strains in stock */}
          {forecast.totalAllStockG > 0 ? (
            <>
              <div
                style={{
                  display: 'flex',
                  height: 12,
                  borderRadius: 999,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.06)',
                  gap: 2,
                  marginBottom: 8,
                }}
              >
                {stockedStrains.map((sf) => {
                  const pct = Math.max(
                    3,
                    Math.round((sf.totalG / forecast.totalAllStockG) * 100)
                  );
                  return (
                    <div
                      key={sf.strainId}
                      title={`${sf.strainName}: ${fmtG(sf.totalG)} g (${sf.shareOfStockPct} %)`}
                      style={{
                        width: `${pct}%`,
                        background: sf.strainColor,
                        height: '100%',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  );
                })}
              </div>

              {/* Legend chips */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  fontSize: 11.5,
                  marginBottom: 10,
                }}
              >
                {stockedStrains.map((sf) => (
                  <div
                    key={sf.strainId}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <span
                      className="dot"
                      style={{ background: sf.strainColor, width: 8, height: 8 }}
                    />
                    <span style={{ fontWeight: 600 }}>{sf.strainName}</span>
                    <span className="num" style={{ color: 'var(--muted)' }}>
                      {fmtG(sf.totalG)}g ({sf.shareOfStockPct}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              Sklad je aktuálně prázdný. Přidej nové balení pro výpočet výdrže.
            </div>
          )}

          {/* Smart Forecast Summary Subgrid */}
          <div className="bento-subgrid-4" style={{ marginBottom: st.stockShowStrainBreakdown !== false && forecast.strainForecasts.length > 0 ? 10 : 0 }}>
            <div className="bento-subcell">
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                {st.stockIncludeUnopenedInEta !== false
                  ? 'Celková výdrž (i zásoba)'
                  : 'Výdrž (jen otevřená)'}
              </div>
              <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {forecast.totalRunwayDays !== null
                  ? `≈ ${forecast.totalRunwayDays} dní`
                  : '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                {forecast.estimatedRunoutTs
                  ? `vyčerpání ~${fmtDateShort(forecast.estimatedRunoutTs)}`
                  : 'žádná spotřeba'}
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Jen otevřená balení</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {forecast.activeOnlyRunwayDays !== null
                  ? `≈ ${forecast.activeOnlyRunwayDays} dní`
                  : '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                {fmtG(forecast.activeStockG)} g v {forecast.activePackagesCount} bal.
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Dynamika odběru</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {fmtG(forecast.effectiveDailyBurnG)} g/d
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color:
                    forecast.burnVelocityDeltaPct > 10
                      ? 'var(--warning)'
                      : forecast.burnVelocityDeltaPct < -10
                      ? 'var(--accent)'
                      : 'var(--muted)',
                }}
              >
                7d ø {fmtG(forecast.recent7dAvgG)} g/d (
                {forecast.burnVelocityDeltaPct > 0 ? '+' : ''}
                {forecast.burnVelocityDeltaPct}%)
              </div>
            </div>

            <div className="bento-subcell">
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Náklad na den</div>
              <div className="num privacy-val" style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {fmtKc(forecast.dailyCostEstimateKc, st.currency)}/d
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                zásoba {fmtG(forecast.unopenedStockG)} g ({forecast.unopenedPackagesCount}×)
              </div>
            </div>
          </div>

          {/* Per-Strain Smart Depletion Breakdown */}
          {st.stockShowStrainBreakdown !== false && forecast.strainForecasts.length > 0 && (
            <div
              style={{
                paddingTop: 10,
                borderTop: '0.5px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11.5,
                  color: 'var(--muted)',
                  marginBottom: 8,
                }}
              >
                <span>Výdrž podle odrůd a tvého poměru užívání</span>
                <span>V mixu / Samostatně</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {forecast.strainForecasts.map((sf) => (
                  <div
                    key={sf.strainId}
                    className="bento-subcell"
                    style={{ padding: '8px 10px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span
                          className="dot"
                          style={{ background: sf.strainColor, flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {sf.strainName}
                        </span>
                        <span className="delta-tag" style={{ fontSize: 10 }}>
                          užívání {sf.usageSharePct}%
                        </span>
                        {sf.isLowStock && (
                          <span className="delta-tag warn" style={{ fontSize: 10 }}>
                            Dochází
                          </span>
                        )}
                      </div>

                      <div className="num" style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                        {sf.totalG > 0 ? (
                          <>
                            <span
                              style={{
                                color: sf.isLowStock ? 'var(--warning)' : 'var(--accent)',
                              }}
                            >
                              {sf.parallelRunwayDays !== null
                                ? `~${sf.parallelRunwayDays} d`
                                : 'neužíváš'}
                            </span>
                            <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                              {' '}
                              / {sf.soloRunwayDays !== null ? `${sf.soloRunwayDays}d sólo` : '—'}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--danger)' }}>0 g skladem</span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11,
                        color: 'var(--muted)',
                        marginTop: 4,
                      }}
                    >
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <strong style={{ color: 'var(--text)' }}>{fmtG(sf.totalG)} g</strong> ({fmtG(sf.activeG)}g otevř. · {fmtG(sf.unopenedG)}g zásoba)
                      </span>
                      <span className="num" style={{ flexShrink: 0 }}>
                        {fmtG(r1(sf.dailyStrainBurnG))} g/d
                        {sf.estimatedRunoutTs ? ` · do ${fmtDateShort(sf.estimatedRunoutTs)}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: 10 }}
        onClick={() => state.openPackageSheet(null)}
      >
        <Icon name="plus" size={17} />
        <span>Přidat nové balení</span>
      </button>

      {/* Filter Seg */}
      <div className="seg" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className={`seg-btn ${state.stockFilter === 'active' ? 'on' : ''}`}
          onClick={() => state.setStockFilter('active')}
        >
          Otevřená ({forecast.activePackagesCount})
        </button>
        <button
          type="button"
          className={`seg-btn ${state.stockFilter === 'unopened' ? 'on' : ''}`}
          onClick={() => state.setStockFilter('unopened')}
        >
          Zásoba ({forecast.unopenedPackagesCount})
        </button>
        <button
          type="button"
          className={`seg-btn ${state.stockFilter === 'finished' ? 'on' : ''}`}
          onClick={() => state.setStockFilter('finished')}
        >
          Spotřebovaná ({forecast.finishedPackagesCount})
        </button>
      </div>

      {/* Package Cards */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 16px' }}>
          Žádná balení v této kategorii.
        </div>
      ) : (
        filtered.map((pkg) => {
          const strain = state.strains.find((s) => s.id === pkg.strainId) || null;
          const pkgStats = calcPackageDetailedStats(
            pkg,
            strain,
            state.doses,
            st,
            forecast.effectiveDailyBurnG,
            now
          );
          const etaDays = pkgStats.etaDays;
          const etaColor =
            etaDays !== null
              ? etaDays <= (st.stockLowDaysWarning || 7)
                ? 'var(--danger)'
                : etaDays <= 14
                ? 'var(--warning)'
                : 'var(--accent)'
              : 'var(--muted)';

          return (
            <div key={pkg.id} className="card">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div
                  style={{ cursor: st.stockEnablePackageDetails !== false ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (st.stockEnablePackageDetails !== false) {
                      state.openPackageDetailSheet(pkg.id);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span className="dot" style={{ background: strain?.color || '#30d158' }} />
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {strain?.name || 'Neznámý druh'}
                    </span>
                    {strain && (
                      <span className="delta-tag" style={{ fontSize: 10 }}>
                        {strain.mitPct}% MIT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {pkg.name}
                    {pkg.note ? ` · ${pkg.note}` : ''}
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
                    ? 'Zásoba'
                    : pkg.calibrated
                    ? 'Hotovo · Přepočteno'
                    : 'Hotovo'}
                </span>
              </div>

              {/* Progress or Finished Summary */}
              {pkg.status !== 'finished' ? (
                <div style={{ marginTop: 12 }}>
                  <div className="bento-meter-track" style={{ height: 8 }}>
                    <div
                      className="bento-meter-fill"
                      style={{
                        width: `${pkgStats.remainingPct}%`,
                        background:
                          pkg.remainingWeightG <= (st.lowStockWarningG || 20)
                            ? 'var(--warning)'
                            : strain?.color || 'var(--accent)',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    <span className="num" style={{ fontWeight: 700 }}>
                      {fmtG(pkg.remainingWeightG)} g zbývá ({pkgStats.remainingPct} %)
                    </span>
                    <span style={{ color: 'var(--muted)' }}>
                      Původně {fmtG(pkg.initialWeightG)} g
                    </span>
                  </div>
                  {pkgStats.pkgDailyBurnG > 0 && etaDays !== null && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11.5,
                        color: etaColor,
                        marginTop: 4,
                      }}
                    >
                      <span>
                        Odběr {fmtG(r1(pkgStats.pkgDailyBurnG))} g/den · vystačí ≈ {etaDays} dní
                      </span>
                      {pkgStats.etaDateTs && (
                        <span>do {fmtDateShort(pkgStats.etaDateTs)}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="bento-subcell"
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Stav balení</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      Spotřebováno celkem {fmtG(pkg.reconciliation?.targetWeightG || pkg.initialWeightG)} g
                    </div>
                  </div>
                  {pkg.reconciliation && (
                    <span className={`delta-tag ${pkg.reconciliation.diff >= 0 ? 'good' : 'warn'}`}>
                      {pkg.reconciliation.diff >= 0 ? '+' : ''}
                      {fmtG(pkg.reconciliation.diff)} g dopočet
                    </span>
                  )}
                </div>
              )}

              {/* Footer stats */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11.5,
                  color: 'var(--muted)',
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '0.5px solid var(--border-subtle)',
                }}
              >
                <span>
                  {pkgStats.dosesCount} dávek ({fmtG(pkgStats.loggedG)} g · ø{' '}
                  {fmtG(pkgStats.avgDoseG)} g)
                </span>
                <span className="privacy-val num">
                  {fmtKc(pkg.costTotal, st.currency)} ({fmtG(pkg.pricePerG)} {st.currency}/g)
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
                {st.stockEnablePackageDetails !== false && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => state.openPackageDetailSheet(pkg.id)}
                  >
                    <Icon name="chart" size={15} />
                    <span>Detail & statistiky</span>
                  </button>
                )}

                {pkg.status === 'active' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => state.openReconcileSheet(pkg.id)}
                  >
                    <Icon name="calc" size={15} />
                    <span>Dopočet</span>
                  </button>
                )}

                {pkg.status === 'unopened' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      state.updatePackage(pkg.id, { status: 'active', openedAt: Date.now() });
                      state.addToast(`Balení "${pkg.name}" otevřeno k odběru`, { type: 'good' });
                    }}
                  >
                    Otevřít k odběru
                  </button>
                )}

                {pkg.status === 'finished' && pkg.calibrated && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => {
                      state.undoReconciliation(pkg.id);
                      state.addToast('Přepočet balení byl vrácen zpět');
                    }}
                  >
                    Vrátit přepočet
                  </button>
                )}

                {pkg.status === 'finished' && !pkg.calibrated && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => state.openReconcileSheet(pkg.id)}
                  >
                    Přepočítat dávky
                  </button>
                )}

                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Upravit balení ${pkg.name}`}
                  onClick={() => state.openPackageSheet(pkg.id)}
                >
                  <Icon name="pencil" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Smazat balení ${pkg.name}`}
                  onClick={() =>
                    state.askConfirm({
                      title: 'Smazat balení?',
                      message: `Opravdu chceš odstranit balení "${pkg.name}"? Zapsané dávky zůstanou v historii jako volné.`,
                      okText: 'Smazat',
                      onConfirm: () => {
                        state.deletePackage(pkg.id);
                        state.addToast('Balení smazáno');
                      },
                    })
                  }
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
