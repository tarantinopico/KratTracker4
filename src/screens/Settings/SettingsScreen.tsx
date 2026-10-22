import React, { useRef, useState } from 'react';
import { Icon } from '../../components/icons/Icon';
import { TopHeader } from '../../components/layout/TopHeader';
import { Switch } from '../../components/ui/Switch';
import { APP_VERSION, LS_KEY } from '../../constants/defaults';
import { THEMES } from '../../constants/themes';
import { useNotifications } from '../../hooks/useNotifications';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { dayKey, fmtDateShort } from '../../lib/date';
import { downloadFile, exportCSV, exportJSON, parseImportedJSON } from '../../lib/exportImport';
import { clamp, fmtG, fmtKc, parseNum, r1 } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';
import {
  AnalyticsSubTab,
  BorderContrast,
  CalculationMode,
  CardRadiusScale,
  Density,
  DialStyle,
  FontScale,
  HapticIntensity,
  ReconcileMethod,
  Settings,
  SettingsSubTab,
  StartTab,
  ThemeId,
} from '../../types';
import { AboutAppTab } from './AboutAppTab';

const SETTINGS_TABS: Array<{ id: SettingsSubTab; label: string; desc: string; badge?: string }> = [
  { id: 'appearance', label: '🎨 Vzhled & UI', desc: 'Téma, blur skla, zaoblení, plocha, písmo' },
  { id: 'limits', label: '🎯 Limity & Cíle', desc: 'Gramáž, rozpočet, voda, dávkování, tapering' },
  { id: 'kinetics', label: '🧬 Kinetika & Tolerance', desc: 'MIT α/β, Hill rovnice, 7-OH, T-Break' },
  { id: 'stock', label: '📦 Sklad & Grafy', desc: 'Model výdrže zásob, Bento přehled, styl grafů' },
  { id: 'modules', label: '🧩 Moduly & Katalog', desc: 'Funkce, Chuť tracker, odrůdy a nápoje' },
  { id: 'data', label: '💾 Data & Zálohy', desc: 'JSON/CSV export, obnova dat, lokální úložiště' },
  { id: 'about', label: 'ℹ️ O aplikaci', desc: 'Vědecké vzorce, diagnostika a architektura' },
];

export const SettingsScreen: React.FC = () => {
  const state = useAppStore();
  const st = state.settings;
  const { toggleNotifications, toggleCravingNotifications } = useNotifications();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [subTab, setSubTab] = useState<SettingsSubTab>('hub');
  const [searchQ, setSearchQ] = useState('');
  const [showAllFlat, setShowAllFlat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setField = <K extends keyof Settings>(key: K, val: Settings[K]) => {
    state.updateSettings({ [key]: val });
    state.addToast('Nastavení uloženo');
  };

  const setNumField = (
    key: keyof Settings,
    raw: string,
    min = 0,
    max = 100000,
    isInt = false
  ) => {
    const n = parseNum(raw);
    if (n === null) return;
    const clamped = clamp(isInt ? Math.round(n) : n, min, max);
    setField(key, clamped as never);
  };

  const rawLs =
    typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) || '' : '';
  const dataKb = r1(new Blob([rawLs]).size / 1024);
  const oldestDoseTs =
    state.doses.length > 0 ? Math.min(...state.doses.map((d) => d.timestamp)) : null;

  const backupDaysAgo = st.lastBackupAt
    ? Math.floor((Date.now() - st.lastBackupAt) / 86400000)
    : null;
  const backupOverdue =
    backupDaysAgo === null || backupDaysAgo >= (st.autoBackupReminderDays || 7);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedJSON(String(reader.result));
        state.askConfirm({
          title: 'Obnovit data ze zálohy?',
          message: `Bude načteno ${imported.doses.length} dávek, ${imported.strains.length} druhů a ${imported.packages.length} balení. Současná data budou přepsána.`,
          okText: 'Obnovit data',
          danger: false,
          onConfirm: () => {
            state.replaceState(imported);
            state.addToast('✅ Data ze zálohy byla obnovena', { type: 'good' });
          },
        });
      } catch {
        state.addToast('Neplatný soubor zálohy JSON', { type: 'danger' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const qNorm = searchQ.trim().toLowerCase();
  const isSearching = qNorm.length > 0;

  const showSection = (target: SettingsSubTab, keywords: string): boolean => {
    if (isSearching) {
      return keywords.toLowerCase().includes(qNorm);
    }
    if (showAllFlat) return true;
    return subTab === target;
  };

  return (
    <div className="screen active">
      <TopHeader
        icon="settings"
        title="Nastavení"
        subtitle={`Kratom Tracker v${APP_VERSION} · Detailní konfigurace`}
      />

      {/* Sub-navigation bar */}
      <div className="sub-nav-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-label="Rozcestník nastavení"
          aria-selected={subTab === 'hub' && !showAllFlat && !isSearching}
          className={`sub-nav-btn ${subTab === 'hub' && !showAllFlat && !isSearching ? 'on' : ''}`}
          style={{ padding: '7px 11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => {
            setSubTab('hub');
            setShowAllFlat(false);
            setSearchQ('');
          }}
          title="Rozcestník nastavení"
        >
          <Icon name="home" size={14} />
        </button>

        {SETTINGS_TABS.map((t) => {
          const isOn = subTab === t.id && !showAllFlat && !isSearching;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isOn}
              className={`sub-nav-btn ${isOn ? 'on' : ''}`}
              onClick={() => {
                setSubTab(isOn ? 'hub' : t.id);
                setShowAllFlat(false);
                setSearchQ('');
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search & View Mode Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <div className="inp-wrap" style={{ flex: 1 }}>
          <input
            type="text"
            className="input"
            placeholder="🔍 Hledat parametr, výpočet, modul..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ padding: '7px 30px 7px 11px', fontSize: 12.5 }}
          />
          {searchQ && (
            <button
              type="button"
              onClick={() => setSearchQ('')}
              style={{
                position: 'absolute',
                right: 8,
                color: 'var(--muted)',
                fontSize: 12,
                padding: 2,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          className={`btn btn-sm ${showAllFlat ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setShowAllFlat(!showAllFlat);
            if (!showAllFlat) setSubTab('hub');
          }}
          style={{ padding: '7px 10px', fontSize: 11.5 }}
        >
          {showAllFlat ? 'Rozcestník' : 'Vše pod sebou'}
        </button>
      </div>

      {/* Active Sub-page Back Header */}
      {subTab !== 'hub' && !showAllFlat && !isSearching && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 2px 2px',
          }}
        >
          <button
            type="button"
            className="chip"
            onClick={() => setSubTab('hub')}
            style={{ fontSize: 11.5, padding: '4px 10px' }}
          >
            ← Zpět na rozcestník nastavení
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
            {SETTINGS_TABS.find((x) => x.id === subTab)?.label}
          </span>
        </div>
      )}

      {/* PWA Install Card if not installed */}
      {!isInstalled && (isInstallable || isIOS) && subTab === 'hub' && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>📲 Nainstalovat aplikaci (PWA)</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                Spouštěj Kratom Tracker přímo z plochy v plnohodnotném offline režimu.
              </div>
            </div>
            {isInstallable ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={async () => {
                  const ok = await install();
                  if (ok) state.addToast('Aplikace nainstalována 🎉', { type: 'good' });
                }}
              >
                Instalovat
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setShowIOSGuide(!showIOSGuide)}
              >
                Návod iOS
              </button>
            )}
          </div>
          {showIOSGuide && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', paddingTop: 8, borderTop: '0.5px solid var(--border-subtle)' }}>
              1. Klepni na tlačítko <strong>Sdílet</strong> v liště Safari.<br />
              2. Zvol možnost <strong>Přidat na plochu</strong>.
            </div>
          )}
        </div>
      )}

      {/* BENTO HUB ROZCESTNÍK (when subTab === 'hub' and not searching/flat) */}
      {subTab === 'hub' && !showAllFlat && !isSearching && (
        <div>
          <div className="bento-hub-grid">
            {/* Appearance tile */}
            <div
              className="bento-micro-tile interactive bento-col-3"
              onClick={() => setSubTab('appearance')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>🎨 Vzhled & Rozhraní</span>
                <Icon name="chev" size={14} style={{ color: 'var(--muted)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Téma: <strong style={{ color: 'var(--accent-light)' }}>{st.theme}</strong> · Blur {st.glassBlurPx ?? 28}px
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                Sestava plochy, zaoblení karet, velikost písma, soukromí
              </div>
            </div>

            {/* Limits tile */}
            <div
              className="bento-micro-tile interactive bento-col-3"
              onClick={() => setSubTab('limits')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>🎯 Limity, Voda & Cíle</span>
                <Icon name="chev" size={14} style={{ color: 'var(--muted)' }} />
              </div>
              <div className="num" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Limit <strong style={{ color: 'var(--text)' }}>{fmtG(st.dailyLimitG)}g</strong> (STOP {fmtG(st.dailyHardLimitG)}g) · {st.dailyWaterGoalMl}ml
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                Rozpočty, cooldown {st.cooldownMin}m, tapering, zvuky, vibrace
              </div>
            </div>

            {/* Kinetics & Tolerance tile */}
            <div
              className="bento-micro-tile interactive bento-col-6"
              onClick={() => setSubTab('kinetics')}
              style={{ borderColor: 'rgba(100, 210, 255, 0.25)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>
                  🧬 Farmakokinetika, Receptory & Model tolerance
                </span>
                <span className="delta-tag good" style={{ fontSize: 10 }}>
                  {st.toleranceModelMode === 'classic' ? 'Klasický model' : 'Chytrý vícefaktorový'}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                  marginTop: 8,
                  fontSize: 10.5,
                }}
              >
                <div className="bento-subcell" style={{ padding: '5px 7px' }}>
                  <div style={{ color: 'var(--muted)', fontSize: 9.5 }}>Poločas α/β</div>
                  <div className="num" style={{ fontWeight: 700 }}>{st.mitHalfLifeAlphaH}/{st.mitHalfLifeBetaH}h</div>
                </div>
                <div className="bento-subcell" style={{ padding: '5px 7px' }}>
                  <div style={{ color: 'var(--muted)', fontSize: 9.5 }}>Hill EC50 / n</div>
                  <div className="num" style={{ fontWeight: 700 }}>{st.acuteHillMidpointMg ?? 32}mg / {st.acuteHillSlope ?? 1.35}</div>
                </div>
                <div className="bento-subcell" style={{ padding: '5px 7px' }}>
                  <div style={{ color: 'var(--muted)', fontSize: 9.5 }}>Váha 7-OH</div>
                  <div className="num" style={{ fontWeight: 700 }}>×{st.toleranceSevenOhMultiplier ?? 12} MIT</div>
                </div>
                <div className="bento-subcell" style={{ padding: '5px 7px' }}>
                  <div style={{ color: 'var(--muted)', fontSize: 9.5 }}>Paměť okna</div>
                  <div className="num" style={{ fontWeight: 700 }}>{st.toleranceWindowDays ?? 14}d ({st.toleranceDecayHalfLifeDays ?? 4.5}d)</div>
                </div>
              </div>
            </div>

            {/* Stock & Analytics Charts tile */}
            <div
              className="bento-micro-tile interactive bento-col-3"
              onClick={() => setSubTab('stock')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>📦 Sklad, Přehled & Grafy</span>
                <Icon name="chev" size={14} style={{ color: 'var(--muted)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Sklad: <strong style={{ color: 'var(--text)' }}>{st.stockForecastMode === 'classic' ? 'Klasický' : 'Chytrý vážený'}</strong> ({st.stockForecastWindowDays ?? 14}d)
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                Bento dlaždice, 5 nových grafů, tloušťka křivek, dopočítávání
              </div>
            </div>

            {/* Modules & Catalogs tile */}
            <div
              className="bento-micro-tile interactive bento-col-3"
              onClick={() => setSubTab('modules')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>🧩 Moduly, Chuť & Katalog</span>
                <Icon name="chev" size={14} style={{ color: 'var(--muted)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                <strong style={{ color: 'var(--text)' }}>{state.strains.length} odrůd</strong> · {state.beverages.length} nápojů
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                Chuť tracker ({st.enableCravingTracker ? 'Zapnuto' : 'Vypnuto'}), 17 modulů
              </div>
            </div>

            {/* Data & Backups tile */}
            <div
              className="bento-micro-tile interactive bento-col-3"
              onClick={() => setSubTab('data')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>💾 Data & Zálohování</span>
                <Icon name="chev" size={14} style={{ color: 'var(--muted)' }} />
              </div>
              <div className="num" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {state.doses.length} dávek · <strong style={{ color: 'var(--text)' }}>{dataKb} kB</strong>
              </div>
              <div style={{ fontSize: 10, color: backupOverdue ? 'var(--warning)' : 'var(--accent)', marginTop: 4 }}>
                Záloha: {st.lastBackupAt ? fmtDateShort(st.lastBackupAt) : 'Doporučujeme zálohovat'}
              </div>
            </div>

            {/* About App tile */}
            <div
              className="bento-micro-tile interactive bento-col-3"
              onClick={() => setSubTab('about')}
              style={{ borderColor: 'var(--accent-glow)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-light)' }}>
                  ℹ️ O aplikaci & Vzorce
                </span>
                <Icon name="chev" size={14} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Verze <strong style={{ color: 'var(--text)' }}>{APP_VERSION} Pro</strong> · Architektura
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                Vysvětlení výpočtů, diagnostika, klávesové zkratky
              </div>
            </div>
          </div>

          {/* Quick Master Toggles Card right on the Hub */}
          <div className="card">
            <div className="card-title">
              <span>⚡ Rychlé přepínače klíčových režimů</span>
              <span className="delta-tag">Okamžitá změna</span>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Chytrý vícefaktorový model receptorů & tolerance</div>
                <div className="set-sub">Vypnuto = původní klasický bodový výpočet</div>
              </div>
              <Switch
                checked={(st.toleranceModelMode || 'smart') === 'smart'}
                onChange={(v) => setField('toleranceModelMode', (v ? 'smart' : 'classic') as CalculationMode)}
                label="Chytrý vícefaktorový model receptorů"
              />
            </div>

            <div className="set-row">
              <div>
                <div className="set-label">Chytrá predikce výdrže skladu podle odrůd</div>
                <div className="set-sub">Vážený odběr dle podílu jednotlivých druhů</div>
              </div>
              <Switch
                checked={(st.stockForecastMode || 'smart') === 'smart'}
                onChange={(v) => setField('stockForecastMode', (v ? 'smart' : 'classic') as CalculationMode)}
                label="Chytrá predikce výdrže skladu"
              />
            </div>

            <div className="set-row">
              <div>
                <div className="set-label">Vždy otevřít Přehled na domovském Bento rozcestníku (🏠)</div>
                <div className="set-sub">První stránka v Přehledu zobrazí hustý Bento grid</div>
              </div>
              <Switch
                checked={st.analyticsResetToHomeOnOpen !== false}
                onChange={(v) => setField('analyticsResetToHomeOnOpen', v)}
                label="Otevřít Přehled na Bento rozcestníku"
              />
            </div>

            <div className="set-row">
              <div>
                <div className="set-label">Režim soukromí (rozmazat částky a gramáže)</div>
                <div className="set-sub">Podrž prst na hodnotě pro dočasné odkrytí</div>
              </div>
              <Switch
                checked={st.privacyMode}
                onChange={(v) => setField('privacyMode', v)}
                label="Režim soukromí"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 1: APPEARANCE & UI ('appearance')                            */}
      {/* ===================================================================== */}
      {showSection(
        'appearance',
        'vzhled téma barva akcent budík velikost písma hustota blur sklo zaoblení kontrast animace desetinná místa plocha dashboard historie dialog'
      ) && (
        <>
          <div className="card">
            <div className="card-title">🎨 Barevné téma, Sklo (Glassmorphism) & Geometrie</div>
            <div style={{ marginBottom: 10 }}>
              <div className="set-sub" style={{ marginBottom: 6 }}>Barevné téma aplikace</div>
              <div className="chip-row">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`chip ${st.theme === t.id ? 'on' : ''}`}
                    onClick={() => setField('theme', t.id as ThemeId)}
                  >
                    <span
                      className="dot"
                      style={{ background: t.hex || st.customAccentHex || '#30d158' }}
                    />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {st.theme === 'custom' && (
              <div className="set-row">
                <span className="set-label">Vlastní barva akcentu</span>
                <input
                  type="color"
                  value={st.customAccentHex || '#30D158'}
                  onChange={(e) => setField('customAccentHex', e.target.value)}
                />
              </div>
            )}

            <div className="set-row">
              <div>
                <div className="set-label">Intenzita rozmazání skla (Glass Blur)</div>
                <div className="set-sub">0 px = čistý povrch, 28 px = Apple Glass, 44 px = hluboký</div>
              </div>
              <div className="inp-wrap" style={{ width: 95 }}>
                <input
                  type="number"
                  className="input"
                  style={{ paddingRight: 28, textAlign: 'right' }}
                  min={0}
                  max={48}
                  value={st.glassBlurPx ?? 28}
                  onChange={(e) => setNumField('glassBlurPx', e.target.value, 0, 48, true)}
                />
                <span className="inp-suf">px</span>
              </div>
            </div>

            <div className="set-row">
              <span className="set-label">Zaoblení karet a Bento dlaždic</span>
              <select
                className="select"
                style={{ width: 145 }}
                value={st.cardRadiusScale || 'normal'}
                onChange={(e) => setField('cardRadiusScale', e.target.value as CardRadiusScale)}
              >
                <option value="sharp">Ostré (Technické)</option>
                <option value="normal">Standardní (Apple)</option>
                <option value="rounded">Extra zaoblené</option>
              </select>
            </div>

            <div className="set-row">
              <span className="set-label">Kontrast okrajů karet (Borders)</span>
              <select
                className="select"
                style={{ width: 145 }}
                value={st.borderContrast || 'normal'}
                onChange={(e) => setField('borderContrast', e.target.value as BorderContrast)}
              >
                <option value="subtle">Jemný</option>
                <option value="normal">Standardní</option>
                <option value="high">Vysoký kontrast</option>
              </select>
            </div>

            <div className="set-row">
              <span className="set-label">Plynulé animace a mikro-přechody</span>
              <Switch
                checked={st.animationsEnabled !== false}
                onChange={(v) => setField('animationsEnabled', v)}
                label="Plynulé animace"
              />
            </div>

            <div className="set-row">
              <span className="set-label">Styl hlavního budíku na ploše</span>
              <select
                className="select"
                style={{ width: 155 }}
                value={st.dashboardDialStyle}
                onChange={(e) => setField('dashboardDialStyle', e.target.value as DialStyle)}
              >
                <option value="precision">Precision Dial</option>
                <option value="concentric">Concentric Rings</option>
              </select>
            </div>

            <div className="set-row">
              <span className="set-label">Výchozí záložka po spuštění</span>
              <select
                className="select"
                style={{ width: 155 }}
                value={st.startTab}
                onChange={(e) => setField('startTab', e.target.value as StartTab)}
              >
                <option value="dashboard">Dnes (Dashboard)</option>
                <option value="stock">Sklad</option>
                <option value="history">Historie</option>
                <option value="analytics">Přehled</option>
              </select>
            </div>

            <div className="set-row">
              <span className="set-label">Hustota rozhraní</span>
              <select
                className="select"
                style={{ width: 140 }}
                value={st.uiDensity}
                onChange={(e) => setField('uiDensity', e.target.value as Density)}
              >
                <option value="normal">Normální</option>
                <option value="compact">Kompaktní</option>
              </select>
            </div>

            <div className="set-row">
              <span className="set-label">Velikost písma</span>
              <select
                className="select"
                style={{ width: 140 }}
                value={st.fontScale}
                onChange={(e) => setField('fontScale', e.target.value as FontScale)}
              >
                <option value="normal">Standardní</option>
                <option value="large">Větší</option>
                <option value="xlarge">Extra velké</option>
              </select>
            </div>

            <div className="set-row">
              <span className="set-label">Přesnost desetinných míst gramáže</span>
              <select
                className="select"
                style={{ width: 140 }}
                value={String(st.decimalPrecision || 1)}
                onChange={(e) => setField('decimalPrecision', Number(e.target.value) as 1 | 2)}
              >
                <option value="1">1 desetinné (2.5 g)</option>
                <option value="2">2 desetinná (2.55 g)</option>
              </select>
            </div>

            <div className="set-row">
              <span className="set-label">24hodinový formát času</span>
              <Switch
                checked={st.timeFormat24}
                onChange={(v) => setField('timeFormat24', v)}
                label="24hodinový formát času"
              />
            </div>

            <div className="set-row">
              <span className="set-label">Týden začíná pondělím</span>
              <Switch
                checked={st.weekStartsMonday}
                onChange={(v) => setField('weekStartsMonday', v)}
                label="Týden začíná pondělím"
              />
            </div>

            <div className="set-row">
              <span className="set-label">Sparkline graf MIT na ploše</span>
              <Switch
                checked={st.dashboardShowSparklines}
                onChange={(v) => setField('dashboardShowSparklines', v)}
                label="Sparkline graf MIT na ploše"
              />
            </div>

            <div className="set-row">
              <span className="set-label">Počet posledních dávek na ploše (1–5)</span>
              <input
                type="number"
                className="input"
                style={{ width: 76, textAlign: 'right' }}
                min={1}
                max={5}
                value={st.dashRecentDosesCount}
                onChange={(e) => setNumField('dashRecentDosesCount', e.target.value, 1, 5, true)}
              />
            </div>
          </div>

          {/* Sestava plochy (Dashboard) */}
          <div className="card">
            <div className="card-title">🧱 Sestava plochy (Dashboard)</div>
            {(
              [
                ['dashShowQuickRow', 'Rychlé čipy (+Xg, voda, chuť)'],
                ['dashShowHud', 'HUD pilulky (streak, receptory, úspěchy)'],
                ['dashShowInsight', 'Chytrý postřeh (Smart Insight banner)'],
                ['dashShowHero', 'Hlavní budík denního limitu'],
                ['dashShowTelem', 'Telemetrie (cooldown & aktivní MIT)'],
                ['dashShowTimeline', 'Časová osa dnešních dávek'],
                ['dashShowWater', 'Mini karta hydratace'],
                ['dashShowActivity', 'Karta dnešní aktivity'],
                ['dashShowStats', 'Spodní statistický pás (4 buňky)'],
              ] as Array<[keyof Settings, string]>
            ).map(([key, label]) => (
              <div key={key} className="set-row">
                <span className="set-label">{label}</span>
                <Switch
                  checked={Boolean(st[key])}
                  onChange={(v) => setField(key, v as never)}
                  label={label}
                />
              </div>
            ))}
          </div>

          {/* Historie & Dialog dávky */}
          <div className="card">
            <div className="card-title">📜 Historie & 📝 Dialog dávky</div>
            <div className="set-row">
              <span className="set-label">Kompaktní řádky historie</span>
              <Switch
                checked={st.histCompactRows}
                onChange={(v) => setField('histCompactRows', v)}
                label="Kompaktní řádky historie"
              />
            </div>
            <div className="set-row">
              <span className="set-label">Zobrazovat panel filtrů v historii</span>
              <Switch
                checked={st.histShowFilters}
                onChange={(v) => setField('histShowFilters', v)}
                label="Zobrazovat panel filtrů"
              />
            </div>
            <div className="set-row">
              <span className="set-label">Živý náhled dopadu v dialogu dávky</span>
              <Switch
                checked={st.modalShowPreview}
                onChange={(v) => setField('modalShowPreview', v)}
                label="Živý náhled dopadu v dialogu"
              />
            </div>
            <div className="set-row">
              <span className="set-label">Odhad poločasu MIT v náhledu</span>
              <Switch
                checked={st.modalShowMitEstimate}
                onChange={(v) => setField('modalShowMitEstimate', v)}
                label="Odhad poločasu MIT v náhledu"
              />
            </div>
            <div className="set-row">
              <span className="set-label">Rychlé štítky poznámek</span>
              <Switch
                checked={st.modalShowNoteTags}
                onChange={(v) => setField('modalShowNoteTags', v)}
                label="Rychlé štítky poznámek"
              />
            </div>
            <div className="set-row">
              <span className="set-label">Potvrzovat rychlý zápis čipem</span>
              <Switch
                checked={st.quickLogConfirm}
                onChange={(v) => setField('quickLogConfirm', v)}
                label="Potvrzovat rychlý zápis čipem"
              />
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 2: LIMITS, HYDRATION, DOSING & TAPERING ('limits')           */}
      {/* ===================================================================== */}
      {showSection(
        'limits',
        'denní limit rozpočet cooldown měna haptika vibrace hydratace voda dávkování předvolby stepper tapering snižování chování půlnoc zvuk frekvence'
      ) && (
        <>
          <div className="card">
            <div className="card-title">🎯 Denní limity, Rozpočty & Rozestupy</div>
            <div className="set-row">
              <span className="set-label">Denní měkký limit (g)</span>
              <input
                type="number"
                step="0.5"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.dailyLimitG}
                onChange={(e) => setNumField('dailyLimitG', e.target.value, 0.5, 100)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Tvrdý STOP limit (g)</span>
              <input
                type="number"
                step="0.5"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.dailyHardLimitG}
                onChange={(e) => setNumField('dailyHardLimitG', e.target.value, 1, 150)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Denní rozpočet ({st.currency})</span>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.dailyBudgetKc}
                onChange={(e) => setNumField('dailyBudgetKc', e.target.value, 0, 10000)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Měsíční rozpočet ({st.currency})</span>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.monthlyBudgetKc}
                onChange={(e) => setNumField('monthlyBudgetKc', e.target.value, 0, 200000)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Cooldown mezi dávkami (min)</span>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.cooldownMin}
                onChange={(e) => setNumField('cooldownMin', e.target.value, 15, 1440, true)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Práh disciplíny rozestupů (h)</span>
              <input
                type="number"
                step="0.5"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.intervalComplianceThresholdH}
                onChange={(e) => setNumField('intervalComplianceThresholdH', e.target.value, 1, 24)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Měna</span>
              <input
                type="text"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.currency}
                onChange={(e) => setField('currency', e.target.value || 'Kč')}
              />
            </div>
          </div>

          {/* Hydratace */}
          <div className="card">
            <div className="card-title">💧 Hydratace & Pitný režim</div>
            <div className="set-row">
              <span className="set-label">Základní denní cíl vody (ml)</span>
              <input
                type="number"
                step="100"
                className="input"
                style={{ width: 95, textAlign: 'right' }}
                value={st.dailyWaterGoalMl}
                onChange={(e) => setNumField('dailyWaterGoalMl', e.target.value, 500, 10000, true)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Extra voda na 1 g kratomu (ml)</span>
              <input
                type="number"
                step="25"
                className="input"
                style={{ width: 95, textAlign: 'right' }}
                value={st.waterPerGramKratomMl}
                onChange={(e) => setNumField('waterPerGramKratomMl', e.target.value, 0, 1000, true)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Rychlé tlačítko 1 (ml)</span>
              <input
                type="number"
                step="50"
                className="input"
                style={{ width: 95, textAlign: 'right' }}
                value={st.waterQuickMl1}
                onChange={(e) => setNumField('waterQuickMl1', e.target.value, 25, 5000, true)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Rychlé tlačítko 2 (ml)</span>
              <input
                type="number"
                step="50"
                className="input"
                style={{ width: 95, textAlign: 'right' }}
                value={st.waterQuickMl2}
                onChange={(e) => setNumField('waterQuickMl2', e.target.value, 25, 5000, true)}
              />
            </div>
          </div>

          {/* Dávkování */}
          <div className="card">
            <div className="card-title">⚖️ Dávkování & Rychlé logování</div>
            <div className="set-row">
              <span className="set-label">Výchozí gramáž dávky (g)</span>
              <input
                type="number"
                step="0.25"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.defaultDoseG}
                onChange={(e) => setNumField('defaultDoseG', e.target.value, 0.1, 30)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Rychlé předvolby (čárkou)</span>
              <input
                type="text"
                className="input"
                style={{ width: 135, textAlign: 'right' }}
                defaultValue={st.quickDosePresets.join(', ')}
                onBlur={(e) => {
                  const nums = e.target.value
                    .split(',')
                    .map((x) => parseFloat(x.trim().replace(',', '.')))
                    .filter((x) => !isNaN(x) && x > 0);
                  setField('quickDosePresets', nums.length > 0 ? nums : [1, 2, 2.5, 3]);
                }}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Automaticky vybírat otevřené balení</span>
              <Switch
                checked={st.autoSelectActivePackage}
                onChange={(v) => setField('autoSelectActivePackage', v)}
                label="Automaticky vybírat otevřené balení"
              />
            </div>
            <div className="set-row">
              <span className="set-label">Výchozí krok stepperu (g)</span>
              <select
                className="select"
                style={{ width: 110 }}
                value={String(st.doseStepDefault)}
                onChange={(e) => setField('doseStepDefault', parseFloat(e.target.value))}
              >
                <option value="0.1">0.1 g</option>
                <option value="0.25">0.25 g</option>
                <option value="0.5">0.5 g</option>
                <option value="1">1.0 g</option>
              </select>
            </div>
          </div>

          {/* Tapering */}
          <div className="card">
            <div className="card-title">📉 Tapering (Plán snižování spotřeby)</div>
            <div className="set-row">
              <span className="set-label">Aktivovat plán taperingu</span>
              <Switch
                checked={st.taperingEnabled}
                onChange={(v) => setField('taperingEnabled', v)}
                label="Aktivovat plán taperingu"
              />
            </div>
            {st.taperingEnabled && (
              <>
                <div className="set-row">
                  <span className="set-label">Počáteční denní dávka (g)</span>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    style={{ width: 90, textAlign: 'right' }}
                    value={st.taperingStartG}
                    onChange={(e) => setNumField('taperingStartG', e.target.value, 1, 100)}
                  />
                </div>
                <div className="set-row">
                  <span className="set-label">Cílová denní dávka (g)</span>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    style={{ width: 90, textAlign: 'right' }}
                    value={st.taperingTargetG}
                    onChange={(e) => setNumField('taperingTargetG', e.target.value, 0, 50)}
                  />
                </div>
                <div className="set-row">
                  <span className="set-label">Týdenní redukce (%)</span>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 90, textAlign: 'right' }}
                    value={st.taperingWeeklyReductionPct}
                    onChange={(e) => setNumField('taperingWeeklyReductionPct', e.target.value, 1, 50)}
                  />
                </div>
                <div className="set-row">
                  <span className="set-label">Krok snížení (g)</span>
                  <input
                    type="number"
                    step="0.25"
                    className="input"
                    style={{ width: 90, textAlign: 'right' }}
                    value={st.taperingStepG}
                    onChange={(e) => setNumField('taperingStepG', e.target.value, 0.1, 10)}
                  />
                </div>
                <div className="set-row">
                  <span className="set-label">Interval snížení (dny)</span>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 90, textAlign: 'right' }}
                    value={st.taperingDaysInterval}
                    onChange={(e) => setNumField('taperingDaysInterval', e.target.value, 1, 30, true)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Chování, Zvuky & Haptika */}
          <div className="card">
            <div className="card-title">🧠 Chování, Zvuková odezva & Vibrace</div>
            <div className="set-row">
              <span className="set-label">Začátek nového dne (posun půlnoci)</span>
              <select
                className="select"
                style={{ width: 115 }}
                value={st.dayStartHour}
                onChange={(e) => setField('dayStartHour', clamp(parseInt(e.target.value, 10), 0, 12))}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((h) => (
                  <option key={h} value={h}>
                    0{h}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="set-row">
              <span className="set-label">Potvrzovat mazání záznamů</span>
              <Switch
                checked={st.confirmBeforeDelete}
                onChange={(v) => setField('confirmBeforeDelete', v)}
                label="Potvrzovat mazání záznamů"
              />
            </div>
            <div className="set-row">
              <span className="set-label">Haptická odezva (vibrace)</span>
              <Switch
                checked={st.haptics}
                onChange={(v) => setField('haptics', v)}
                label="Haptická odezva"
              />
            </div>
            {st.haptics && (
              <div className="set-row">
                <span className="set-label">Intenzita vibrací</span>
                <select
                  className="select"
                  style={{ width: 130 }}
                  value={st.hapticIntensity || 'medium'}
                  onChange={(e) => setField('hapticIntensity', e.target.value as HapticIntensity)}
                >
                  <option value="light">Jemná</option>
                  <option value="medium">Střední</option>
                  <option value="heavy">Výrazná</option>
                </select>
              </div>
            )}
            <div className="set-row">
              <span className="set-label">Zvukové efekty (syntezátor)</span>
              <Switch
                checked={st.soundsEnabled}
                onChange={(v) => setField('soundsEnabled', v)}
                label="Zvukové efekty"
              />
            </div>
            {st.soundsEnabled && (
              <div className="set-row">
                <span className="set-label">Základní frekvence tónu (Hz)</span>
                <input
                  type="number"
                  step="20"
                  className="input"
                  style={{ width: 90, textAlign: 'right' }}
                  value={st.soundFrequencyHz ?? 660}
                  onChange={(e) => setNumField('soundFrequencyHz', e.target.value, 220, 1760, true)}
                />
              </div>
            )}
            <div className="set-row">
              <span className="set-label">Systémové notifikace</span>
              <Switch
                checked={st.enableNotifications}
                onChange={(v) => toggleNotifications(v)}
                label="Systémové notifikace"
              />
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 3: PHARMACOKINETICS & TOLERANCE ('kinetics')                 */}
      {/* ===================================================================== */}
      {showSection(
        'kinetics',
        'farmakokinetika vzorce alkaloidy mitragynin 7-oh hmotnost tmax poločas eliminace tolerance receptory zátěž hill ec50 washout t-break'
      ) && (
        <>
          <div className="card">
            <div className="card-title">🧬 Farmakokinetika & Dvoufázová eliminace alkaloidů</div>
            <div className="set-row">
              <span className="set-label">Tělesná hmotnost (kg)</span>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.bodyWeightKg}
                onChange={(e) => setNumField('bodyWeightKg', e.target.value, 35, 250)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Tmax nástup vrcholu (h)</span>
              <input
                type="number"
                step="0.1"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.mitTMaxH}
                onChange={(e) => setNumField('mitTMaxH', e.target.value, 0.2, 6)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Poločas rychlé fáze α (h)</span>
              <input
                type="number"
                step="0.2"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.mitHalfLifeAlphaH}
                onChange={(e) => setNumField('mitHalfLifeAlphaH', e.target.value, 1, 24)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Poločas terminální fáze β (h)</span>
              <input
                type="number"
                step="0.5"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.mitHalfLifeBetaH}
                onChange={(e) => setNumField('mitHalfLifeBetaH', e.target.value, 4, 72)}
              />
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Podíl rychlé distribuční fáze α (%)</div>
                <div className="set-sub">Zbytek (100 - α) tvoří pomalá fáze β</div>
              </div>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.mitAlphaSharePct ?? 72}
                onChange={(e) => setNumField('mitAlphaSharePct', e.target.value, 20, 95, true)}
              />
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Orální biologická dostupnost MIT (%)</div>
                <div className="set-sub">Referenční vstřebatelnost alkaloidů</div>
              </div>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.mitBioavailabilityPct ?? 25}
                onChange={(e) => setNumField('mitBioavailabilityPct', e.target.value, 5, 100, true)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Výchozí obsah MIT (%)</span>
              <input
                type="number"
                step="0.05"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.defaultMitPct}
                onChange={(e) => setNumField('defaultMitPct', e.target.value, 0.1, 5)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Výchozí obsah 7-OH (%)</span>
              <input
                type="number"
                step="0.005"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.defaultSevenOhPct}
                onChange={(e) => setNumField('defaultSevenOhPct', e.target.value, 0.001, 1)}
              />
            </div>
          </div>

          {/* Model tolerance & Citlivosti receptorů */}
          <div className="card">
            <div className="card-title">📈 Model tolerance, Hillovy saturace & Zátěže receptorů</div>

            <div style={{ marginBottom: 10 }}>
              <div className="set-sub" style={{ marginBottom: 5 }}>
                Režim výpočtu zátěže receptorů a tolerance
              </div>
              <div className="seg">
                <button
                  type="button"
                  className={`seg-btn ${(st.toleranceModelMode || 'smart') === 'smart' ? 'on' : ''}`}
                  onClick={() => setField('toleranceModelMode', 'smart' as CalculationMode)}
                >
                  Chytrý vícefaktorový
                </button>
                <button
                  type="button"
                  className={`seg-btn ${st.toleranceModelMode === 'classic' ? 'on' : ''}`}
                  onClick={() => setField('toleranceModelMode', 'classic' as CalculationMode)}
                >
                  Původní (Klasický)
                </button>
              </div>
            </div>

            {(st.toleranceModelMode || 'smart') === 'smart' && (
              <>
                <div className="set-row">
                  <div>
                    <div className="set-label">Okno historie pro výpočet (dny)</div>
                    <div className="set-sub">Délka paměti modelu pro chronickou zátěž</div>
                  </div>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.toleranceWindowDays ?? 14}
                    onChange={(e) => setNumField('toleranceWindowDays', e.target.value, 3, 60, true)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Poločas paměti receptorů (dny)</div>
                    <div className="set-sub">Exponenciální váha nedávných dnů</div>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.toleranceDecayHalfLifeDays ?? 4.5}
                    onChange={(e) => setNumField('toleranceDecayHalfLifeDays', e.target.value, 1, 30)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Potenční násobitel 7-OH (× MIT)</div>
                    <div className="set-sub">Váha 7-hydroxymitragyninu na zátěž receptorů</div>
                  </div>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.toleranceSevenOhMultiplier ?? 12}
                    onChange={(e) => setNumField('toleranceSevenOhMultiplier', e.target.value, 1, 50, true)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Hill EC50 poloviční saturace (mg MIT)</div>
                    <div className="set-sub">Hladina aktivního MIT při 50% obsazenosti receptorů</div>
                  </div>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.acuteHillMidpointMg ?? 32}
                    onChange={(e) => setNumField('acuteHillMidpointMg', e.target.value, 10, 120, true)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Hill koeficient strmosti (n)</div>
                    <div className="set-sub">Kooperativita vazby (1.0 = Michaelis-Menten)</div>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.acuteHillSlope ?? 1.35}
                    onChange={(e) => setNumField('acuteHillSlope', e.target.value, 0.5, 3.0)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Práh čistého washoutu (mg MIT)</div>
                    <div className="set-sub">Pod touto hladinou se receptory považují za čisté</div>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.acuteWashoutThresholdMg ?? 5}
                    onChange={(e) => setNumField('acuteWashoutThresholdMg', e.target.value, 1, 25)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Cílové noční okno bez kratomu (h)</div>
                    <div className="set-sub">Ideální délka nočního půstu pro plný bonus</div>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.idealFastingWindowH ?? 12}
                    onChange={(e) => setNumField('idealFastingWindowH', e.target.value, 8, 20)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Váha akutní obsazenosti v celkové zátěži (%)</div>
                    <div className="set-sub">Poměr okamžité vs. dlouhodobé únavy receptorů</div>
                  </div>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.toleranceAcuteWeightPct ?? 45}
                    onChange={(e) => setNumField('toleranceAcuteWeightPct', e.target.value, 10, 80, true)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Bonus za rozestupy & noční okno (%)</div>
                    <div className="set-sub">Odměna za dodržení odstupů a noční půst</div>
                  </div>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.toleranceSpacingBonusPct ?? 12}
                    onChange={(e) => setNumField('toleranceSpacingBonusPct', e.target.value, 0, 30, true)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Bonus za rotaci odrůd (%)</div>
                    <div className="set-sub">Snížení adaptace při střídání druhů (Shannon H&apos;)</div>
                  </div>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.toleranceRotationBonusPct ?? 8}
                    onChange={(e) => setNumField('toleranceRotationBonusPct', e.target.value, 0, 25, true)}
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Referenční denní základ (g)</div>
                    <div className="set-sub">0 = automaticky použít denní měkký limit</div>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    style={{ width: 85, textAlign: 'right' }}
                    value={st.toleranceBaselineG ?? 0}
                    onChange={(e) => setNumField('toleranceBaselineG', e.target.value, 0, 100)}
                  />
                </div>
              </>
            )}

            <div className="set-row">
              <span className="set-label">Regenerace za čistý den (%)</span>
              <input
                type="number"
                className="input"
                style={{ width: 85, textAlign: 'right' }}
                value={st.toleranceRecoveryPerDay}
                onChange={(e) => setNumField('toleranceRecoveryPerDay', e.target.value, 1, 50, true)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Penalizace za objem / limit</span>
              <input
                type="number"
                className="input"
                style={{ width: 85, textAlign: 'right' }}
                value={st.tolerancePenaltyLimit}
                onChange={(e) => setNumField('tolerancePenaltyLimit', e.target.value, 0, 80, true)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Penalizace za krátké rozestupy</span>
              <input
                type="number"
                className="input"
                style={{ width: 85, textAlign: 'right' }}
                value={st.tolerancePenaltyInterval}
                onChange={(e) => setNumField('tolerancePenaltyInterval', e.target.value, 0, 80, true)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Penalizace za každodenní sérii</span>
              <input
                type="number"
                className="input"
                style={{ width: 85, textAlign: 'right' }}
                value={st.toleranceConsecutiveDaysPenalty}
                onChange={(e) =>
                  setNumField('toleranceConsecutiveDaysPenalty', e.target.value, 0, 60, true)
                }
              />
            </div>
            <div className="set-row">
              <span className="set-label">Cílová délka T-Breaku (h)</span>
              <input
                type="number"
                className="input"
                style={{ width: 85, textAlign: 'right' }}
                value={st.tbreakGoalHours}
                onChange={(e) => setNumField('tbreakGoalHours', e.target.value, 12, 720, true)}
              />
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 4: STOCK, BENTO HUB & CHARTS ('stock')                       */}
      {/* ===================================================================== */}
      {showSection(
        'stock',
        'sklad vizualizace výdrž zásoby balení dopočet váhy přehled bento grafy radar kumulativní mřížka tloušťka křivky'
      ) && (
        <>
          <div className="card">
            <div className="card-title">📦 Sklad, Vizualizace & Chytrý odhad výdrže</div>

            <div className="set-row">
              <span className="set-label">Zobrazovat horní vizualizaci a analytiku skladu</span>
              <Switch
                checked={st.stockShowVisualization !== false}
                onChange={(v) => setField('stockShowVisualization', v)}
                label="Zobrazovat horní vizualizaci a analytiku skladu"
              />
            </div>

            <div className="set-row">
              <span className="set-label">Rozpad výdrže podle odrůd a podílu užívání</span>
              <Switch
                checked={st.stockShowStrainBreakdown !== false}
                onChange={(v) => setField('stockShowStrainBreakdown', v)}
                label="Rozpad výdrže podle odrůd a podílu užívání"
              />
            </div>

            <div className="set-row">
              <span className="set-label">Povolit detailní statistiky balení</span>
              <Switch
                checked={st.stockEnablePackageDetails !== false}
                onChange={(v) => setField('stockEnablePackageDetails', v)}
                label="Povolit detailní statistiky balení"
              />
            </div>

            <div className="set-row">
              <span className="set-label">Započítat i neotevřenou zásobu do celkové výdrže</span>
              <Switch
                checked={st.stockIncludeUnopenedInEta !== false}
                onChange={(v) => setField('stockIncludeUnopenedInEta', v)}
                label="Započítat i neotevřenou zásobu do celkové výdrže"
              />
            </div>

            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <div className="set-sub" style={{ marginBottom: 4 }}>
                Model výpočtu spotřeby a výdrže zásob
              </div>
              <div className="seg">
                <button
                  type="button"
                  className={`seg-btn ${(st.stockForecastMode || 'smart') === 'smart' ? 'on' : ''}`}
                  onClick={() => setField('stockForecastMode', 'smart' as CalculationMode)}
                >
                  Chytrý vážený (podle odrůd)
                </button>
                <button
                  type="button"
                  className={`seg-btn ${st.stockForecastMode === 'classic' ? 'on' : ''}`}
                  onClick={() => setField('stockForecastMode', 'classic' as CalculationMode)}
                >
                  Klasický průměr
                </button>
              </div>
            </div>

            <div className="set-row">
              <span className="set-label">Okno historie pro výpočet odběru (dny)</span>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.stockForecastWindowDays ?? 14}
                onChange={(e) => setNumField('stockForecastWindowDays', e.target.value, 3, 90, true)}
              />
            </div>

            {(st.stockForecastMode || 'smart') === 'smart' && (
              <div className="set-row">
                <div>
                  <div className="set-label">Poločas váhy nedávné spotřeby (dny)</div>
                  <div className="set-sub">Nedávné dny mají vyšší váhu než starší</div>
                </div>
                <input
                  type="number"
                  className="input"
                  style={{ width: 90, textAlign: 'right' }}
                  value={st.stockDecayHalfLifeDays ?? 7}
                  onChange={(e) => setNumField('stockDecayHalfLifeDays', e.target.value, 1, 60, true)}
                />
              </div>
            )}

            <div className="set-row">
              <span className="set-label">Varování při výdrži pod (dny)</span>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.stockLowDaysWarning ?? 7}
                onChange={(e) => setNumField('stockLowDaysWarning', e.target.value, 1, 60, true)}
              />
            </div>

            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <div className="set-sub" style={{ marginBottom: 4 }}>Výchozí metoda dopočtu váhy</div>
              <div className="seg">
                <button
                  type="button"
                  className={`seg-btn ${st.defaultReconcileMethod === 'proportional' ? 'on' : ''}`}
                  onClick={() => setField('defaultReconcileMethod', 'proportional' as ReconcileMethod)}
                >
                  Poměrně (× faktor)
                </button>
                <button
                  type="button"
                  className={`seg-btn ${st.defaultReconcileMethod === 'uniform' ? 'on' : ''}`}
                  onClick={() => setField('defaultReconcileMethod', 'uniform' as ReconcileMethod)}
                >
                  Rovnoměrně (± delta)
                </button>
              </div>
            </div>
            <div className="set-row">
              <span className="set-label">Zahrnout i volné dávky při dopočtu</span>
              <Switch
                checked={st.reconcileAutoIncludeUnassigned}
                onChange={(v) => setField('reconcileAutoIncludeUnassigned', v)}
                label="Zahrnout i volné dávky při dopočtu"
              />
            </div>
            <div className="set-row">
              <span className="set-label">Varování nízkého skladu (g)</span>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.lowStockWarningG}
                onChange={(e) => setNumField('lowStockWarningG', e.target.value, 1, 500)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Výchozí váha balení (g)</span>
              <input
                type="number"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.defaultPackageWeightG}
                onChange={(e) => setNumField('defaultPackageWeightG', e.target.value, 5, 5000)}
              />
            </div>
            <div className="set-row">
              <span className="set-label">Výchozí cena za gram ({st.currency})</span>
              <input
                type="number"
                step="0.5"
                className="input"
                style={{ width: 90, textAlign: 'right' }}
                value={st.defaultPricePerG}
                onChange={(e) => setNumField('defaultPricePerG', e.target.value, 0.1, 200)}
              />
            </div>
          </div>

          {/* Přehled, Bento Hub & Grafy */}
          <div className="card">
            <div className="card-title">📊 Přehled (Analytics), Bento Rozcestník & Vzhled grafů</div>

            <div className="set-row">
              <span className="set-label">Výchozí podstránka v Přehledu</span>
              <select
                className="select"
                style={{ width: 165 }}
                value={st.defaultAnalyticsSubTab}
                onChange={(e) => setField('defaultAnalyticsSubTab', e.target.value as AnalyticsSubTab)}
              >
                <option value="home">🏠 Domů (Bento grid)</option>
                <option value="summary">📊 Souhrn</option>
                <option value="intervals">⏱ Rozestupy</option>
                <option value="strains">🌿 Odrůdy</option>
                {st.enableCravingTracker && <option value="craving">🤤 Chuť</option>}
                <option value="health">💚 Zdraví & Plán</option>
                <option value="achievements">🏆 Úspěchy</option>
              </select>
            </div>

            <div className="set-row">
              <span className="set-label">Při otevření Přehledu vždy přepnout na 🏠 Bento</span>
              <Switch
                checked={st.analyticsResetToHomeOnOpen !== false}
                onChange={(v) => setField('analyticsResetToHomeOnOpen', v)}
                label="Vždy otevřít Přehled na Bento rozcestníku"
              />
            </div>

            <div className="set-row">
              <span className="set-label">Tloušťka čar v grafech (px)</span>
              <input
                type="number"
                step="0.2"
                className="input"
                style={{ width: 85, textAlign: 'right' }}
                value={st.chartLineThickness ?? 2.2}
                onChange={(e) => setNumField('chartLineThickness', e.target.value, 1, 4)}
              />
            </div>

            <div className="set-row">
              <span className="set-label">Sytost podbarvení křivek (%)</span>
              <input
                type="number"
                step="4"
                className="input"
                style={{ width: 85, textAlign: 'right' }}
                value={st.chartFillOpacityPct ?? 24}
                onChange={(e) => setNumField('chartFillOpacityPct', e.target.value, 0, 65, true)}
              />
            </div>

            <div className="set-row">
              <span className="set-label">Zobrazovat pomocnou mřížku v grafech</span>
              <Switch
                checked={st.chartShowGridLines !== false}
                onChange={(v) => setField('chartShowGridLines', v)}
                label="Zobrazovat pomocnou mřížku"
              />
            </div>

            <div className="set-sub" style={{ marginTop: 10, marginBottom: 4 }}>
              Grafy a analytické karty v Přehledu
            </div>
            {(
              [
                ['anaShowRadarChart', '🕸️ 6osý radar disciplíny, receptorů a zdraví'],
                ['anaShowCumulativeChart', '📐 Kumulativní trajektorie vs. rozpočet limitu'],
                ['anaShowWeekdayChart', '🗓️ Profil dnů v týdnu (Po–Ne)'],
                ['anaShowAlkaloidRatioChart', '🧪 Poměr čistého MIT vs. 7-OH ekvivalentu'],
                ['anaShowDoseEfficiencyScatter', '🎯 Matice velikosti dávky vs. spokojenost (Sweet-Spot)'],
                ['anaShowAdvancedStats', '🧠 Rozšířená diagnostika a stabilita (CV%)'],
                ['anaShowReceptorBreakdown', '🧬 Detailní rozpad zátěže receptorů a tolerance'],
                ['anaShowStrainEfficiency', '⚡ Efektivita odrůd a výdrž v Přehledu'],
              ] as Array<[keyof Settings, string]>
            ).map(([key, label]) => (
              <div key={key} className="set-row">
                <span className="set-label">{label}</span>
                <Switch
                  checked={st[key] !== false}
                  onChange={(v) => setField(key, v as never)}
                  label={label}
                />
              </div>
            ))}

            <div className="set-sub" style={{ marginTop: 10, marginBottom: 4 }}>
              Dlaždice na domovském Bento rozcestníku (🏠)
            </div>
            {(
              [
                ['bentoShowLivePlasma', 'Dlaždice aktivní plazmy MIT & washoutu'],
                ['bentoShow7dSparkline', 'Dlaždice 14d spotřeby a rezervy limitu'],
                ['bentoShowRadarProfile', 'Komplexní radarový profil a receptorová bilance'],
                ['bentoShowStrainMix', 'Dlaždice rotace druhů (Shannon H\')'],
                ['bentoShowStockRunway', 'Dlaždice skladu a výdrže zásob'],
                ['bentoShowWeekdayStrip', 'Mini-pás dnů v týdnu (Po–Ne)'],
                ['bentoShowFinancePace', 'Dlaždice ekonomiky a ceny za gram'],
                ['bentoShowCircadianMini', 'Mini 24h cirkadiánní rytmus'],
                ['bentoShowHydrationCraving', 'Dlaždice predikce chuti a hydratace'],
                ['bentoShowQuickJumps', 'Rozcestník analytických podstránek dole'],
              ] as Array<[keyof Settings, string]>
            ).map(([key, label]) => (
              <div key={key} className="set-row">
                <span className="set-label">{label}</span>
                <Switch
                  checked={st[key] !== false}
                  onChange={(v) => setField(key, v as never)}
                  label={label}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 5: MODULES, CRAVING TRACKER & CATALOGS ('modules')           */}
      {/* ===================================================================== */}
      {showSection(
        'modules',
        'moduly funkce chuť tracker craving katalog nápoje druhy kratomu odrůdy rotace úspěchy kalendář heatmapa'
      ) && (
        <>
          <div className="card">
            <div className="card-title">🧩 Moduly & Funkce aplikace</div>
            {(
              [
                ['showAlkaloids', 'Zobrazovat alkaloidy (MIT & 7-OH)'],
                ['showFinances', 'Sledovat finance a útratu'],
                ['enableBeverages', 'Doprovodné nápoje u dávek'],
                ['enableHydration', 'Sledování pitného režimu'],
                ['enableMoodRating', 'Hodnocení hvězdičkami a efekt'],
                ['enableHeatmap', '28denní heatmapa v historii'],
                ['enableQuickLog', 'Rychlé čipy na hlavní ploše'],
                ['enablePharmacokinetics', 'Farmakokinetický model MIT'],
                ['enableReceptorScore', 'Skóre citlivosti receptorů'],
                ['enableHourlyDistribution', '24h cirkadiánní graf v analytice'],
                ['enableStrainRotationAdvice', 'Doporučení rotace odrůd'],
                ['enableAchievements', 'Systém úspěchů (17 odznaků)'],
                ['enableCalendarView', 'Měsíční kalendář v historii'],
                ['enableSmartInsights', 'Chytré postřehy (Smart Insights)'],
              ] as Array<[keyof Settings, string]>
            ).map(([key, label]) => (
              <div key={key} className="set-row">
                <span className="set-label">{label}</span>
                <Switch
                  checked={Boolean(st[key])}
                  onChange={(v) => setField(key, v as never)}
                  label={label}
                />
              </div>
            ))}
            {st.enableStrainRotationAdvice && (
              <div className="set-row">
                <span className="set-label">Varování rotace po X stejných dávkách</span>
                <input
                  type="number"
                  className="input"
                  style={{ width: 80, textAlign: 'right' }}
                  value={st.diversityWarningThreshold}
                  onChange={(e) => setNumField('diversityWarningThreshold', e.target.value, 2, 15, true)}
                />
              </div>
            )}
          </div>

          {/* 🤤 Chuť tracker */}
          <div className="card">
            <div className="card-title">🤤 Chuť tracker & Predikční model</div>
            <div className="set-row">
              <span className="set-label">Zapnout chuť tracker</span>
              <Switch
                checked={st.enableCravingTracker}
                onChange={(v) => setField('enableCravingTracker', v)}
                label="Zapnout chuť tracker"
              />
            </div>

            {st.enableCravingTracker && (
              <>
                <div className="set-row">
                  <span className="set-label">Zobrazit tlačítko na dashboardu</span>
                  <Switch
                    checked={st.cravingShowOnDashboard}
                    onChange={(v) => setField('cravingShowOnDashboard', v)}
                    label="Zobrazit tlačítko na dashboardu"
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Vyžadovat intenzitu</div>
                    <div className="set-sub">Jinak default 3 – střední</div>
                  </div>
                  <Switch
                    checked={st.cravingSeverityRequired}
                    onChange={(v) => setField('cravingSeverityRequired', v)}
                    label="Vyžadovat intenzitu"
                  />
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Okno pro sloučení dávek (Session)</div>
                    <div className="set-sub">
                      Dávky v tomto okně se počítají jako jedna session
                    </div>
                  </div>
                  <div className="inp-wrap" style={{ width: 105 }}>
                    <input
                      type="number"
                      className="input"
                      style={{ paddingRight: 34, textAlign: 'right' }}
                      min={10}
                      max={240}
                      value={st.cravingSessionWindowMin}
                      onChange={(e) =>
                        setNumField('cravingSessionWindowMin', e.target.value, 10, 240, true)
                      }
                    />
                    <span className="inp-suf">min</span>
                  </div>
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-label">Minimum záznamů pro predikci</div>
                    <div className="set-sub">Doporučeno 3</div>
                  </div>
                  <div className="inp-wrap" style={{ width: 105 }}>
                    <input
                      type="number"
                      className="input"
                      style={{ paddingRight: 38, textAlign: 'right' }}
                      min={1}
                      max={20}
                      value={st.cravingPredictionThresholdMin}
                      onChange={(e) =>
                        setNumField('cravingPredictionThresholdMin', e.target.value, 1, 20, true)
                      }
                    />
                    <span className="inp-suf">logů</span>
                  </div>
                </div>

                <div className="set-row">
                  <span className="set-label">Notifikace predikce</span>
                  <Switch
                    checked={st.cravingNotificationEnabled}
                    onChange={(v) => toggleCravingNotifications(v)}
                    label="Notifikace predikce"
                  />
                </div>

                {st.cravingNotificationEnabled && (
                  <div className="set-row">
                    <span className="set-label">Notifikovat X minut před</span>
                    <div className="inp-wrap" style={{ width: 105 }}>
                      <input
                        type="number"
                        className="input"
                        style={{ paddingRight: 34, textAlign: 'right' }}
                        min={5}
                        max={120}
                        value={st.cravingNotificationLeadMin}
                        onChange={(e) =>
                          setNumField('cravingNotificationLeadMin', e.target.value, 5, 120, true)
                        }
                      />
                      <span className="inp-suf">min</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Katalog nápojů */}
          {st.enableBeverages && (
            <div className="card">
              <div className="card-title">
                <span>☕ Katalog nápojů</span>
                <span className="delta-tag">{state.beverages.length}</span>
              </div>
              {state.beverages.map((bev) => (
                <div
                  key={bev.id}
                  className="set-row clickable"
                  onClick={() => state.openBeverageSheet(bev.id)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {bev.icon} {bev.name}
                    </div>
                    <div className="set-sub">
                      {bev.cost > 0 ? `${fmtKc(bev.cost, st.currency)} / porce` : 'Zdarma'}
                      {bev.note ? ` · ${bev.note}` : ''}
                    </div>
                  </div>
                  <Icon name="chev" size={16} />
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => state.openBeverageSheet(null)}
              >
                <Icon name="plus" size={15} />
                <span>Přidat nový nápoj</span>
              </button>
            </div>
          )}

          {/* Druhy kratomu */}
          <div className="card">
            <div className="card-title">
              <span>🌿 Druhy kratomu</span>
              <span className="delta-tag">{state.strains.length}</span>
            </div>
            {state.strains.map((s) => {
              const stockG = state.packages
                .filter((p) => p.strainId === s.id && p.status !== 'finished')
                .reduce((a, p) => a + Math.max(0, p.remainingWeightG), 0);

              return (
                <div
                  key={s.id}
                  className="set-row clickable"
                  onClick={() => state.openStrainSheet(s.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className="dot" style={{ background: s.color }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</span>
                        <span className="delta-tag" style={{ fontSize: 10 }}>
                          {s.mitPct}% MIT
                        </span>
                      </div>
                      <div className="set-sub">
                        {fmtKc(s.pricePerG, st.currency)}/g · skladem {fmtG(stockG)} g
                      </div>
                    </div>
                  </div>
                  <Icon name="chev" size={16} />
                </div>
              );
            })}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => state.openStrainSheet(null)}
            >
              <Icon name="plus" size={15} />
              <span>Přidat nový druh</span>
            </button>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 6: DATA & BACKUPS ('data')                                   */}
      {/* ===================================================================== */}
      {showSection('data', 'záloha správa dat export json csv obnovit vymazat reset') && (
        <div className="card">
          <div className="card-title">💾 Záloha & Správa dat</div>
          <div className="stats-4" style={{ marginBottom: 10 }}>
            <div className="bento-subcell" style={{ textAlign: 'center' }}>
              <div className="stat-cell-label">Dávek</div>
              <div className="stat-cell-val">{state.doses.length}</div>
            </div>
            <div className="bento-subcell" style={{ textAlign: 'center' }}>
              <div className="stat-cell-label">Druhů</div>
              <div className="stat-cell-val">{state.strains.length}</div>
            </div>
            <div className="bento-subcell" style={{ textAlign: 'center' }}>
              <div className="stat-cell-label">Balení</div>
              <div className="stat-cell-val">{state.packages.length}</div>
            </div>
            <div className="bento-subcell" style={{ textAlign: 'center' }}>
              <div className="stat-cell-label">Velikost</div>
              <div className="stat-cell-val">{dataKb} kB</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            Nejstarší záznam: {oldestDoseTs ? fmtDateShort(oldestDoseTs) : '—'} · Poslední záloha:{' '}
            <strong style={{ color: backupOverdue ? 'var(--warning)' : 'var(--accent)' }}>
              {st.lastBackupAt ? fmtDateShort(st.lastBackupAt) : 'Nikdy'}
            </strong>
          </div>

          <div className="set-row" style={{ marginBottom: 8 }}>
            <span className="set-label">Připomínka zálohy (dny)</span>
            <input
              type="number"
              className="input"
              style={{ width: 80, textAlign: 'right' }}
              value={st.autoBackupReminderDays}
              onChange={(e) => setNumField('autoBackupReminderDays', e.target.value, 1, 90, true)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                const json = exportJSON(state);
                downloadFile(
                  json,
                  `kratom-tracker-backup-${dayKey(Date.now())}.json`,
                  'application/json'
                );
                state.markBackupDone();
                state.addToast('💾 Záloha JSON exportována', { type: 'good' });
              }}
            >
              <Icon name="download" size={15} />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                const csv = exportCSV(state);
                downloadFile(csv, `kratom-tracker-${dayKey(Date.now())}.csv`, 'text/csv');
                state.markBackupDone();
                state.addToast('📄 CSV soubor exportován');
              }}
            >
              <Icon name="download" size={15} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="upload" size={15} />
              <span>Obnovit JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />

            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() =>
                state.askConfirm({
                  title: 'Vymazat všechna data?',
                  message:
                    'Tato akce obnoví aplikaci do výchozího stavu (seed data). Všechny vlastní záznamy budou smazány.',
                  okText: 'Vymazat vše',
                  onConfirm: () => {
                    state.resetAll();
                    state.addToast('Data byla resetována do výchozího stavu');
                  },
                })
              }
            >
              <Icon name="trash" size={15} />
              <span>Vymazat vše</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-PAGE 7: ABOUT APP ('about')                                       */}
      {/* ===================================================================== */}
      {showSection('about', 'o aplikaci nápověda vzorce verze klávesové zkratky úvod') && (
        <AboutAppTab />
      )}
    </div>
  );
};
