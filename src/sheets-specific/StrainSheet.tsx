import React, { useEffect, useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { Sheet } from '../components/sheets/Sheet';
import { PALETTE } from '../constants/palette';
import { useHaptics } from '../hooks/useHaptics';
import { useSounds } from '../hooks/useSounds';
import { r2, uid } from '../lib/format';
import { useAppStore } from '../store/useAppStore';

export const StrainSheet: React.FC = () => {
  const strainSheetOpen = useAppStore((s) => s.strainSheetOpen);
  const editingStrainId = useAppStore((s) => s.editingStrainId);
  const closeStrainSheet = useAppStore((s) => s.closeStrainSheet);
  const strains = useAppStore((s) => s.strains);
  const settings = useAppStore((s) => s.settings);
  const addStrain = useAppStore((s) => s.addStrain);
  const updateStrain = useAppStore((s) => s.updateStrain);
  const deleteStrain = useAppStore((s) => s.deleteStrain);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const addToast = useAppStore((s) => s.addToast);

  const vibrate = useHaptics();
  const playSound = useSounds();

  const existingStrain = editingStrainId
    ? strains.find((st) => st.id === editingStrainId) || null
    : null;

  const [name, setName] = useState<string>('');
  const [pricePerG, setPricePerG] = useState<string>('2.8');
  const [packageSizeG, setPackageSizeG] = useState<string>('100');
  const [mitPct, setMitPct] = useState<string>('1.45');
  const [sevenOhPct, setSevenOhPct] = useState<string>('0.025');
  const [color, setColor] = useState<string>(PALETTE[0]);

  useEffect(() => {
    if (!strainSheetOpen) return;
    if (existingStrain) {
      setName(existingStrain.name);
      setPricePerG(String(existingStrain.pricePerG));
      setPackageSizeG(String(existingStrain.packageSizeG || 100));
      setMitPct(String(existingStrain.mitPct || settings.defaultMitPct || 1.45));
      setSevenOhPct(String(existingStrain.sevenOhPct || settings.defaultSevenOhPct || 0.025));
      setColor(existingStrain.color || PALETTE[0]);
    } else {
      setName('');
      setPricePerG(String(settings.defaultPricePerG || 2.8));
      setPackageSizeG('100');
      setMitPct(String(settings.defaultMitPct || 1.45));
      setSevenOhPct(String(settings.defaultSevenOhPct || 0.025));
      setColor(PALETTE[0]);
    }
  }, [strainSheetOpen, existingStrain, settings]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      addToast('Zadejte prosím název odrůdy', { type: 'warn' });
      return;
    }

    const ppg = Math.max(0, parseFloat(pricePerG) || settings.defaultPricePerG || 2.8);
    const pkgW = Math.max(5, parseFloat(packageSizeG) || 100);
    const mit = Math.max(0.1, parseFloat(mitPct) || 1.45);
    const seven = Math.max(0, parseFloat(sevenOhPct) || 0.025);

    if (existingStrain) {
      updateStrain(existingStrain.id, {
        name: trimmedName,
        pricePerG: r2(ppg),
        packageSizeG: Math.round(pkgW),
        mitPct: r2(mit),
        sevenOhPct: Number(seven.toFixed(3)),
        color,
      });
      addToast('Odrůda upravena', { type: 'good' });
    } else {
      addStrain({
        id: uid('st'),
        name: trimmedName,
        color,
        pricePerG: r2(ppg),
        packageSizeG: Math.round(pkgW),
        mitPct: r2(mit),
        sevenOhPct: Number(seven.toFixed(3)),
        note: '',
        createdAt: Date.now(),
      });
      addToast('Nová odrůda přidána', { type: 'good' });
    }

    vibrate([12, 30, 18]);
    playSound(740, 80);
    closeStrainSheet();
  };

  const handleDelete = () => {
    if (!existingStrain || strains.length <= 1) return;
    askConfirm({
      title: 'Smazat odrůdu?',
      message: `Smazat "${existingStrain.name}"? Historické záznamy zůstanou zachovány.`,
      okText: 'Smazat',
      danger: true,
      onConfirm: () => {
        deleteStrain(existingStrain.id);
        closeStrainSheet();
        addToast('Odrůda smazána', { type: 'warn' });
      },
    });
  };

  return (
    <Sheet
      open={strainSheetOpen}
      onClose={closeStrainSheet}
      title={existingStrain ? 'Upravit odrůdu' : 'Nová odrůda'}
    >
      <div className="field">
        <label className="field-label">Název odrůdy</label>
        <input
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="např. Green Malay"
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="field-label">Výchozí cena / g ({settings.currency})</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="input"
            value={pricePerG}
            onChange={(e) => setPricePerG(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Výchozí balení (g)</label>
          <input
            type="number"
            step="5"
            min="5"
            className="input"
            value={packageSizeG}
            onChange={(e) => setPackageSizeG(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="field-label">Mitragynin (%)</label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="5"
            className="input"
            value={mitPct}
            onChange={(e) => setMitPct(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">7-OH (%)</label>
          <input
            type="number"
            step="0.005"
            min="0"
            max="1"
            className="input"
            value={sevenOhPct}
            onChange={(e) => setSevenOhPct(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Barva odrůdy</label>
        <div className="color-picker">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => {
                vibrate(10);
                setColor(c);
              }}
              aria-label={`Barva ${c}`}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        {existingStrain && strains.length > 1 && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            <Icon name="trash" /> Smazat
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={closeStrainSheet}>
          Zrušit
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleSave}
        >
          <Icon name="check" /> Uložit
        </button>
      </div>
    </Sheet>
  );
};
