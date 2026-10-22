import React, { useEffect, useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { Sheet } from '../components/sheets/Sheet';
import { useHaptics } from '../hooks/useHaptics';
import { useSounds } from '../hooks/useSounds';
import { r2, uid } from '../lib/format';
import { useAppStore } from '../store/useAppStore';

export const BeverageSheet: React.FC = () => {
  const beverageSheetOpen = useAppStore((s) => s.beverageSheetOpen);
  const editingBeverageId = useAppStore((s) => s.editingBeverageId);
  const closeBeverageSheet = useAppStore((s) => s.closeBeverageSheet);
  const beverages = useAppStore((s) => s.beverages);
  const settings = useAppStore((s) => s.settings);
  const addBeverage = useAppStore((s) => s.addBeverage);
  const updateBeverage = useAppStore((s) => s.updateBeverage);
  const deleteBeverage = useAppStore((s) => s.deleteBeverage);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const addToast = useAppStore((s) => s.addToast);

  const vibrate = useHaptics();
  const playSound = useSounds();

  const existingBev = editingBeverageId
    ? beverages.find((b) => b.id === editingBeverageId) || null
    : null;

  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<string>('🍹');
  const [cost, setCost] = useState<string>('15');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (!beverageSheetOpen) return;
    if (existingBev) {
      setName(existingBev.name);
      setIcon(existingBev.icon || '🍹');
      setCost(String(existingBev.cost));
      setNote(existingBev.note || '');
    } else {
      setName('');
      setIcon('🍹');
      setCost('15');
      setNote('');
    }
  }, [beverageSheetOpen, existingBev]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      addToast('Zadejte prosím název nápoje', { type: 'warn' });
      return;
    }

    const parsedCost = r2(Math.max(0, parseFloat(cost) || 0));
    const finalIcon = icon.trim() || '🍹';

    if (existingBev) {
      updateBeverage(existingBev.id, {
        name: trimmedName,
        icon: finalIcon,
        cost: parsedCost,
        note: note.trim(),
      });
      addToast('Nápoj upraven', { type: 'good' });
    } else {
      addBeverage({
        id: uid('bev'),
        name: trimmedName,
        icon: finalIcon,
        cost: parsedCost,
        note: note.trim(),
      });
      addToast('Nový nápoj přidán', { type: 'good' });
    }

    vibrate([12, 30, 18]);
    playSound(740, 80);
    closeBeverageSheet();
  };

  const handleDelete = () => {
    if (!existingBev || existingBev.id === 'bev_water') return;
    askConfirm({
      title: 'Smazat nápoj?',
      message: `Smazat "${existingBev.name}"?`,
      okText: 'Smazat',
      danger: true,
      onConfirm: () => {
        deleteBeverage(existingBev.id);
        closeBeverageSheet();
        addToast('Nápoj smazán', { type: 'warn' });
      },
    });
  };

  return (
    <Sheet
      open={beverageSheetOpen}
      onClose={closeBeverageSheet}
      title={existingBev ? 'Upravit nápoj' : 'Nový nápoj'}
      sub="Nápoje započítávané do celkové ceny dávky"
    >
      <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="field">
          <label className="field-label">Název nápoje</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="např. Pomerančový džus"
          />
        </div>
        <div className="field">
          <label className="field-label">Ikona (emoji)</label>
          <input
            type="text"
            className="input"
            style={{ textAlign: 'center', fontSize: 18 }}
            maxLength={4}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="field-label">Cena za porci ({settings.currency})</label>
          <input
            type="number"
            step="1"
            min="0"
            className="input"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Poznámka (volitelné)</label>
          <input
            type="text"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="např. 250 ml, čerstvý..."
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        {existingBev && existingBev.id !== 'bev_water' && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            <Icon name="trash" /> Smazat
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={closeBeverageSheet}>
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
