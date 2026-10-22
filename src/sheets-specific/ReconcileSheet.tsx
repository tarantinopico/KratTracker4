import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { Sheet } from '../components/sheets/Sheet';
import { Switch } from '../components/ui/Switch';
import { useHaptics } from '../hooks/useHaptics';
import { useSounds } from '../hooks/useSounds';
import { fmtDateShort, fmtTime } from '../lib/date';
import { fmtG, r1, r2 } from '../lib/format';
import { getReconcileCandidateDoses } from '../lib/reconcile';
import { useAppStore } from '../store/useAppStore';
import { ReconcileMethod } from '../types';

export const ReconcileSheet: React.FC = () => {
  const reconcilePkgId = useAppStore((s) => s.reconcilePkgId);
  const closeReconcileSheet = useAppStore((s) => s.closeReconcileSheet);
  const packages = useAppStore((s) => s.packages);
  const strains = useAppStore((s) => s.strains);
  const doses = useAppStore((s) => s.doses);
  const applyReconciliation = useAppStore((s) => s.applyReconciliation);
  const unlockAchievement = useAppStore((s) => s.unlockAchievement);
  const addToast = useAppStore((s) => s.addToast);

  const vibrate = useHaptics();
  const playSound = useSounds();

  const pkg = useMemo(
    () => (reconcilePkgId ? packages.find((p) => p.id === reconcilePkgId) || null : null),
    [reconcilePkgId, packages]
  );

  const strainName = useMemo(() => {
    if (!pkg) return '';
    return strains.find((s) => s.id === pkg.strainId)?.name || 'Kratom';
  }, [pkg, strains]);

  const [targetWeightStr, setTargetWeightStr] = useState<string>('100');
  const [method, setMethod] = useState<ReconcileMethod>('proportional');
  const [includeUnassigned, setIncludeUnassigned] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const unassignedCount = useMemo(() => {
    if (!pkg) return 0;
    return doses.filter((d) => !d.packageId && d.strainId === pkg.strainId).length;
  }, [doses, pkg]);

  const candidates = useMemo(() => {
    if (!pkg) return [];
    return getReconcileCandidateDoses(doses, pkg, includeUnassigned);
  }, [doses, pkg, includeUnassigned]);

  useEffect(() => {
    if (!pkg) return;
    setTargetWeightStr(String(pkg.initialWeightG));
    setMethod('proportional');
    const assigned = doses.filter((d) => d.packageId === pkg.id);
    const autoUnassigned = assigned.length === 0 && unassignedCount > 0;
    setIncludeUnassigned(autoUnassigned);
    const initialCandidates = getReconcileCandidateDoses(doses, pkg, autoUnassigned);
    setSelectedIds(new Set(initialCandidates.map((d) => d.id)));
  }, [pkg, doses, unassignedCount]);

  if (!pkg) return null;

  const targetG = Math.max(0.5, parseFloat(targetWeightStr) || pkg.initialWeightG);
  const selectedDoses = candidates.filter((d) => selectedIds.has(d.id));
  const sumSelected = r2(selectedDoses.reduce((a, d) => a + d.amountG, 0));
  const diff = r2(targetG - sumSelected);
  const factor = sumSelected > 0 ? targetG / sumSelected : 1;
  const delta = selectedDoses.length > 0 ? diff / selectedDoses.length : 0;

  const toggleIncludeUnassigned = (val: boolean) => {
    vibrate(10);
    setIncludeUnassigned(val);
    const nextCandidates = getReconcileCandidateDoses(doses, pkg, val);
    if (val) {
      const nextSet = new Set(selectedIds);
      nextCandidates.forEach((d) => nextSet.add(d.id));
      setSelectedIds(nextSet);
    } else {
      const nextSet = new Set<string>();
      nextCandidates.forEach((d) => {
        if (selectedIds.has(d.id)) nextSet.add(d.id);
      });
      setSelectedIds(nextSet);
    }
  };

  const toggleDose = (id: string) => {
    vibrate(10);
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    vibrate(10);
    setSelectedIds(new Set(candidates.map((d) => d.id)));
  };

  const selectNone = () => {
    vibrate(10);
    setSelectedIds(new Set());
  };

  const handleCloseOnly = () => {
    applyReconciliation(pkg.id, selectedIds, targetG, method, false);
    vibrate(15);
    playSound(660, 70);
    closeReconcileSheet();
    addToast(`Balení "${pkg.name}" uzavřeno bez přepočtu`, { type: 'default' });
  };

  const handleCalibrate = () => {
    if (selectedDoses.length === 0) return;
    applyReconciliation(pkg.id, selectedIds, targetG, method, true);
    unlockAchievement('calibrator');
    vibrate([15, 30, 20]);
    playSound(880, 90);
    closeReconcileSheet();
    addToast(
      `Zkalibrováno ${selectedDoses.length} dávek (${diff >= 0 ? '+' : ''}${fmtG(diff)} g rozpočítáno)`,
      { type: 'good', duration: 4500 }
    );
  };

  return (
    <Sheet
      open={!!reconcilePkgId}
      onClose={closeReconcileSheet}
      wide
      title="Dokončit & Zkalibrovat balení"
      sub={`${pkg.name} · Počáteční váha ${fmtG(pkg.initialWeightG)} g`}
    >
      <div className="reconcile-hero">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="calc" /> Zpětná kalibrace podle skutečné spotřeby
          </span>
          <span className="pill pill-primary">{selectedDoses.length} dávek vybráno</span>
        </div>

        <div className="grid-2" style={{ marginBottom: 10 }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-label">Skutečně spotřebováno z balení (g)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              className="input"
              value={targetWeightStr}
              onChange={(e) => setTargetWeightStr(e.target.value)}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-label">Součet zapsaných dávek</label>
            <div
              className="input"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.03)',
                fontWeight: 800,
              }}
            >
              <span>{fmtG(sumSelected)} g</span>
              <span
                style={{
                  fontSize: 12,
                  color:
                    Math.abs(diff) < 0.05
                      ? 'var(--text-3)'
                      : diff > 0
                      ? 'var(--warning)'
                      : 'var(--info)',
                }}
              >
                {diff >= 0 ? '+' : ''}
                {fmtG(diff)} g rozdíl
              </span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.45 }}>
          {selectedDoses.length === 0 ? (
            <span style={{ color: 'var(--warning)' }}>
              Vyberte alespoň jednu dávku níže pro rozpočítání rozdílu, nebo balení pouze uzavřete.
            </span>
          ) : Math.abs(diff) < 0.05 ? (
            <span style={{ color: 'var(--success)' }}>
              Součet vybraných dávek přesně odpovídá váze balení! Stačí balení uzavřít.
            </span>
          ) : diff > 0 ? (
            <>
              Zapsali jste o <b style={{ color: 'var(--warning)' }}>{fmtG(diff)} g méně</b> než
              bylo v balení. Každá vybraná dávka byla ve skutečnosti o{' '}
              <b>
                {method === 'proportional'
                  ? `+${r1((factor - 1) * 100)} %`
                  : `+${fmtG(delta)} g`}
              </b>{' '}
              větší.
            </>
          ) : (
            <>
              Zapsali jste o{' '}
              <b style={{ color: 'var(--info)' }}>{fmtG(Math.abs(diff))} g více</b> než bylo v
              balení. Každá vybraná dávka se sníží o{' '}
              <b>
                {method === 'proportional'
                  ? `${r1((factor - 1) * 100)} %`
                  : `${fmtG(delta)} g`}
              </b>
              .
            </>
          )}
        </div>
      </div>

      <div className="field">
        <label className="field-label">Metoda přepočtu dávek</label>
        <div className="seg">
          <button
            type="button"
            className={`seg-btn ${method === 'proportional' ? 'active' : ''}`}
            onClick={() => {
              vibrate(10);
              setMethod('proportional');
            }}
          >
            Poměrově (×{factor.toFixed(2)})
          </button>
          <button
            type="button"
            className={`seg-btn ${method === 'uniform' ? 'active' : ''}`}
            onClick={() => {
              vibrate(10);
              setMethod('uniform');
            }}
          >
            Rovnoměrně ({delta >= 0 ? '+' : ''}
            {fmtG(delta)} g/dávku)
          </button>
        </div>
      </div>

      {unassignedCount > 0 && (
        <div
          className="setting-row"
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="setting-info">
            <div className="setting-title" style={{ fontSize: 12.5 }}>
              Zahrnout i nepřiřazené dávky odrůdy {strainName}
            </div>
            <div className="setting-desc">
              Nalezeno {unassignedCount} dávek této odrůdy bez přiřazeného balení
            </div>
          </div>
          <Switch checked={includeUnassigned} onChange={toggleIncludeUnassigned} />
        </div>
      )}

      <div className="field">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <label className="field-label" style={{ margin: 0 }}>
            Dávky zahrnuté do přepočtu ({selectedDoses.length}/{candidates.length})
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-xs btn-ghost" onClick={selectAll}>
              Vše
            </button>
            <button type="button" className="btn btn-xs btn-ghost" onClick={selectNone}>
              Nic
            </button>
          </div>
        </div>

        <div className="reconcile-dose-list">
          {candidates.length === 0 ? (
            <div
              style={{
                padding: 18,
                textAlign: 'center',
                color: 'var(--text-3)',
                fontSize: 12,
              }}
            >
              Žádné dávky z tohoto balení nebyly nalezeny.
            </div>
          ) : (
            candidates.map((d) => {
              const checked = selectedIds.has(d.id);
              const newAmt = checked
                ? method === 'proportional'
                  ? r2(d.amountG * factor)
                  : r2(Math.max(0.1, d.amountG + delta))
                : d.amountG;
              const dDiff = r2(newAmt - d.amountG);

              return (
                <div
                  key={d.id}
                  className="reconcile-dose-row"
                  onClick={() => toggleDose(d.id)}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    style={{
                      accentColor: 'var(--primary)',
                      width: 16,
                      height: 16,
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                      {fmtDateShort(d.timestamp)} · {fmtTime(d.timestamp)}
                      {!d.packageId && (
                        <span
                          className="pill"
                          style={{ marginLeft: 4, fontSize: 9, padding: '1px 5px' }}
                        >
                          nepřiřazeno
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                      {d.beverageIcon || '💧'} {d.beverageName || 'Voda'}
                      {d.note ? ` · "${d.note}"` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {checked && Math.abs(dDiff) >= 0.01 ? (
                      <>
                        <span
                          style={{
                            color: 'var(--text-3)',
                            textDecoration: 'line-through',
                            fontSize: 11,
                          }}
                        >
                          {fmtG(d.amountG)}g
                        </span>{' '}
                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                          → {fmtG(newAmt)}g
                        </span>
                        <div
                          style={{
                            fontSize: 9.5,
                            color: dDiff > 0 ? 'var(--warning)' : 'var(--info)',
                          }}
                        >
                          {dDiff > 0 ? '+' : ''}
                          {fmtG(dDiff)}g
                        </div>
                      </>
                    ) : (
                      <span style={{ fontWeight: 700 }}>{fmtG(d.amountG)} g</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={closeReconcileSheet}>
          Zrušit
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleCloseOnly}>
          Pouze uzavřít (0 g)
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          disabled={selectedDoses.length === 0}
          onClick={handleCalibrate}
        >
          <Icon name="calc" /> Přepočítat {selectedDoses.length} dávek & uzavřít
        </button>
      </div>
    </Sheet>
  );
};
