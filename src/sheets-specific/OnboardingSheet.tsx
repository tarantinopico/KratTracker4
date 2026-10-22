import React from 'react';
import { Icon } from '../components/icons/Icon';
import { Sheet } from '../components/sheets/Sheet';
import { IconName } from '../constants/icons';
import { useHaptics } from '../hooks/useHaptics';
import { useAppStore } from '../store/useAppStore';

const FEATURES: Array<[IconName, string, string]> = [
  [
    'package',
    'Sklad balení & Zpětná kalibrace',
    'Sledujte sáčky v gramech a po dobrání automaticky přepočítejte zapsané dávky podle skutečné váhy balení.',
  ],
  [
    'droplet',
    'Evidence nápojů v ceně dávky',
    'Započítejte džus, čaj nebo energetický nápoj přímo do finančních statistik.',
  ],
  [
    'activity',
    'Reálná farmakokinetika 24h',
    'Živý výpočet aktivního mitragyninu v těle podle poločasu rozpadu.',
  ],
  [
    'timer',
    'Tolerance Break Režim & Simulátor',
    'Sledujte regeneraci receptorů během pauzy a naplánujte postupný tapering.',
  ],
  [
    'calendar',
    'Měsíční kalendář & CSV Export',
    'Přepínejte mezi seznamem a kalendářem, exportujte do Excelu nebo JSON.',
  ],
  [
    'award',
    'Odznaky & Kompletní přizpůsobení',
    'Sbírejte milníky, upravte si barevné téma, zvuky, vibrace i hustotu rozhraní.',
  ],
];

export const OnboardingSheet: React.FC = () => {
  const onboardingOpen = useAppStore((s) => s.onboardingOpen);
  const setOnboardingOpen = useAppStore((s) => s.setOnboardingOpen);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const vibrate = useHaptics();

  const handleClose = () => {
    vibrate([12, 30, 18]);
    updateSettings({ onboarded: true });
    setOnboardingOpen(false);
  };

  return (
    <Sheet open={onboardingOpen} onClose={handleClose}>
      <div style={{ textAlign: 'center', padding: '8px 4px 16px' }}>
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 22,
            margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'grid',
            placeItems: 'center',
            color: '#03150e',
            boxShadow: '0 16px 36px var(--primary-glow)',
          }}
        >
          <span style={{ fontSize: 32, display: 'inline-flex' }}>
            <Icon name="leaf" size={32} />
          </span>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Vítejte v Kratom Tracker v4.1
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-2)',
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Kompletní nástroj se skladem balení, zpětnou kalibrací váhy, nápoji, farmakokinetikou a
          hloubkovou analytikou.
        </p>

        <div
          style={{
            textAlign: 'left',
            margin: '18px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {FEATURES.map(([ic, title, desc]) => (
            <div
              key={title}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '10px 12px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={ic} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 1 }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ padding: 14, fontSize: 15 }}
          onClick={handleClose}
        >
          Začít používat →
        </button>
      </div>
    </Sheet>
  );
};
