import React from 'react';
import { Sheet } from '../components/sheets/Sheet';
import { useAppStore } from '../store/useAppStore';

const SHORTCUTS: Array<[string, string]> = [
  ['D / N', 'Otevřít okno pro novou dávku'],
  ['W', 'Rychle přidat +250 ml vody'],
  ['1 – 5', 'Přepínání záložek (Přehled → Nastavení)'],
  ['E', 'Rychlý export JSON zálohy'],
  ['?', 'Zobrazit přehled klávesových zkratek'],
  ['Esc', 'Zavřít otevřené modální okno'],
];

export const HelpSheet: React.FC = () => {
  const helpSheetOpen = useAppStore((s) => s.helpSheetOpen);
  const setHelpSheetOpen = useAppStore((s) => s.setHelpSheetOpen);

  return (
    <Sheet
      open={helpSheetOpen}
      onClose={() => setHelpSheetOpen(false)}
      title="Klávesové zkratky & Tipy"
      sub="Rychlé ovládání na počítači i mobilu"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SHORTCUTS.map(([key, desc]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{desc}</span>
            <span className="kbd">{key}</span>
          </div>
        ))}
      </div>
    </Sheet>
  );
};
