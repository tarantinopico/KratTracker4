import React, { useEffect, useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { Sheet } from '../components/sheets/Sheet';
import { useHaptics } from '../hooks/useHaptics';
import { useSounds } from '../hooks/useSounds';
import { fmtG, r2, uid } from '../lib/format';
import { useAppStore } from '../store/useAppStore';
import { Package, PackageStatus } from '../types';

export const PackageSheet: React.FC = () => {
  const packageSheetOpen = useAppStore((s) => s.packageSheetOpen);
  const editingPackageId = useAppStore((s) => s.editingPackageId);
  const closePackageSheet = useAppStore((s) => s.closePackageSheet);
  const packages = useAppStore((s) => s.packages);
  const strains = useAppStore((s) => s.strains);
  const settings = useAppStore((s) => s.settings);
  const addPackage = useAppStore((s) => s.addPackage);
  const updatePackage = useAppStore((s) => s.updatePackage);
  const deletePackage = useAppStore((s) => s.deletePackage);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const addToast = useAppStore((s) => s.addToast);

  const vibrate = useHaptics();
  const playSound = useSounds();

  const existingPkg = editingPackageId
    ? packages.find((p) => p.id === editingPackageId) || null
    : null;

  const [strainId, setStrainId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [initialWeightG, setInitialWeightG] = useState<string>('100');
  const [remainingWeightG, setRemainingWeightG] = useState<string>('100');
  const [costTotal, setCostTotal] = useState<string>('280');
  const [pricePerG, setPricePerG] = useState<string>('2.8');
  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<PackageStatus>('unopened');

  useEffect(() => {
    if (!packageSheetOpen) return;
    if (existingPkg) {
      setStrainId(existingPkg.strainId);
      setName(existingPkg.name || '');
      setInitialWeightG(String(existingPkg.initialWeightG));
      setRemainingWeightG(String(existingPkg.remainingWeightG));
      setCostTotal(String(existingPkg.costTotal));
      setPricePerG(String(existingPkg.pricePerG));
      setNote(existingPkg.note || '');
      setStatus(existingPkg.status);
    } else {
      const defStrain = strains[0];
      const defWeight = defStrain ? defStrain.packageSizeG || 100 : 100;
      const defPpg = defStrain ? defStrain.pricePerG || settings.defaultPricePerG || 2.8 : 2.8;
      setStrainId(defStrain?.id || '');
      setName('');
      setInitialWeightG(String(defWeight));
      setRemainingWeightG(String(defWeight));
      setPricePerG(String(defPpg));
      setCostTotal(String(r2(defWeight * defPpg)));
      setNote('');
      setStatus('unopened');
    }
  }, [packageSheetOpen, existingPkg, strains, settings.defaultPricePerG]);

  const handleStrainChange = (newStrainId: string) => {
    setStrainId(newStrainId);
    if (!existingPkg) {
      const st = strains.find((s) => s.id === newStrainId);
      if (st) {
        const w = st.packageSizeG || 100;
        const ppg = st.pricePerG || 2.8;
        setInitialWeightG(String(w));
        setRemainingWeightG(String(w));
        setPricePerG(String(ppg));
        setCostTotal(String(r2(w * ppg)));
      }
    }
  };

  const handleInitialWeightChange = (valStr: string) => {
    setInitialWeightG(valStr);
    const w = parseFloat(valStr);
    const ppg = parseFloat(pricePerG);
    if (!existingPkg && !isNaN(w) && w > 0) {
      setRemainingWeightG(String(w));
    }
    if (!isNaN(w) && w > 0 && !isNaN(ppg) && ppg >= 0) {
      setCostTotal(String(r2(w * ppg)));
    }
  };

  const handleQuickWeight = (w: number) => {
    vibrate(10);
    setInitialWeightG(String(w));
    if (!existingPkg) {
      setRemainingWeightG(String(w));
    }
    const ppg = parseFloat(pricePerG) || 0;
    setCostTotal(String(r2(w * ppg)));
  };

  const handleCostTotalChange = (valStr: string) => {
    setCostTotal(valStr);
    const tc = parseFloat(valStr);
    const w = parseFloat(initialWeightG);
    if (!isNaN(tc) && tc >= 0 && !isNaN(w) && w > 0) {
      setPricePerG(String(r2(tc / w)));
    }
  };

  const handlePricePerGChange = (valStr: string) => {
    setPricePerG(valStr);
    const ppg = parseFloat(valStr);
    const w = parseFloat(initialWeightG);
    if (!isNaN(ppg) && ppg >= 0 && !isNaN(w) && w > 0) {
      setCostTotal(String(r2(w * ppg)));
    }
  };

  const handleSave = () => {
    const st = strains.find((s) => s.id === strainId) || strains[0];
    if (!st) return;

    const initW = Math.max(1, parseFloat(initialWeightG) || 100);
    const remW = Math.max(0, parseFloat(remainingWeightG) ?? initW);
    const tc = Math.max(0, parseFloat(costTotal) || 0);
    const ppg = Math.max(0, parseFloat(pricePerG) || r2(tc / initW));
    const finalName = name.trim() || `${st.name} ${fmtG(initW)}g`;

    if (existingPkg) {
      updatePackage(existingPkg.id, {
        strainId: st.id,
        name: finalName,
        initialWeightG: r2(initW),
        remainingWeightG: r2(remW),
        costTotal: r2(tc),
        pricePerG: r2(ppg),
        note: note.trim(),
        status,
        openedAt:
          status === 'active' && !existingPkg.openedAt ? Date.now() : existingPkg.openedAt,
        finishedAt:
          status === 'finished' && !existingPkg.finishedAt ? Date.now() : existingPkg.finishedAt,
      });
      addToast('Balení upraveno', { type: 'good' });
    } else {
      const newPkg: Package = {
        id: uid('pkg'),
        strainId: st.id,
        name: finalName,
        initialWeightG: r2(initW),
        remainingWeightG: r2(remW),
        costTotal: r2(tc),
        pricePerG: r2(ppg),
        note: note.trim(),
        status,
        openedAt: status === 'active' ? Date.now() : null,
        finishedAt: status === 'finished' ? Date.now() : null,
        calibrated: false,
      };
      addPackage(newPkg);
      addToast('Nové balení přidáno do skladu', { type: 'good' });
    }

    vibrate([12, 30, 18]);
    playSound(740, 80);
    closePackageSheet();
  };

  const handleDelete = () => {
    if (!existingPkg) return;
    askConfirm({
      title: 'Smazat balení?',
      message: `Smazat "${existingPkg.name}" ze skladu? Dávky zůstanou zachovány.`,
      okText: 'Smazat',
      danger: true,
      onConfirm: () => {
        deletePackage(existingPkg.id);
        closePackageSheet();
        addToast('Balení smazáno', { type: 'warn' });
      },
    });
  };

  const cur = settings.currency;
  const parsedInitW = parseFloat(initialWeightG) || 0;

  return (
    <Sheet
      open={packageSheetOpen}
      onClose={closePackageSheet}
      title={existingPkg ? 'Upravit balení' : 'Nové balení'}
      sub="Evidence sáčků, zásob a automatické přepočty ceny"
    >
      <div className="field">
        <label className="field-label">Odrůda</label>
        <select
          className="input"
          value={strainId}
          onChange={(e) => handleStrainChange(e.target.value)}
        >
          {strains.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label">Označení / Šarže (volitelné)</label>
        <input
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="např. Šarže #14, KratomWorld..."
        />
      </div>

      <div className="field">
        <label className="field-label">Rychlá volba velikosti balení</label>
        <div className="chip-row">
          {[25, 50, 100, 250, 500].map((w) => (
            <button
              key={w}
              type="button"
              className={`chip ${parsedInitW === w ? 'active' : ''}`}
              onClick={() => handleQuickWeight(w)}
            >
              {w} g
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="field-label">Počáteční váha (g)</label>
          <input
            type="number"
            step="1"
            min="1"
            className="input"
            value={initialWeightG}
            onChange={(e) => handleInitialWeightChange(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Zbývá nyní (g)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="input"
            value={remainingWeightG}
            onChange={(e) => setRemainingWeightG(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="field-label">Celková cena balení ({cur})</label>
          <input
            type="number"
            step="1"
            min="0"
            className="input"
            value={costTotal}
            onChange={(e) => handleCostTotalChange(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Cena za gram ({cur}/g)</label>
          <input
            type="number"
            step="0.05"
            min="0"
            className="input"
            value={pricePerG}
            onChange={(e) => handlePricePerGChange(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Poznámka / Prodejce (volitelné)</label>
        <input
          type="text"
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="např. KratomWorld, akční balení..."
        />
      </div>

      <div className="field">
        <label className="field-label">Stav balení</label>
        <div className="seg">
          <button
            type="button"
            className={`seg-btn ${status === 'active' ? 'active' : ''}`}
            onClick={() => setStatus('active')}
          >
            Aktivní
          </button>
          <button
            type="button"
            className={`seg-btn ${status === 'unopened' ? 'active' : ''}`}
            onClick={() => setStatus('unopened')}
          >
            Neotevřené
          </button>
          <button
            type="button"
            className={`seg-btn ${status === 'finished' ? 'active' : ''}`}
            onClick={() => setStatus('finished')}
          >
            Spotřebované
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        {existingPkg && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            <Icon name="trash" /> Smazat
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={closePackageSheet}>
          Zrušit
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleSave}
        >
          <Icon name="check" /> Uložit balení
        </button>
      </div>
    </Sheet>
  );
};
