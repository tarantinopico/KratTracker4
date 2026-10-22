import React from 'react';
import { ACH_DEFS } from '../../constants/achievements';
import { APP_VERSION, DEFAULT_SETTINGS, LS_KEY } from '../../constants/defaults';
import { Icon } from '../../components/icons/Icon';
import { fmtDateShort } from '../../lib/date';
import { fmtG, r1 } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';

export const AboutAppTab: React.FC = () => {
  const state = useAppStore();
  const st = state.settings;

  const rawLs =
    typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) || '' : '';
  const dataKb = r1(new Blob([rawLs]).size / 1024);
  const totalGAllTime = r1(state.doses.reduce((a, d) => a + d.amountG, 0));
  const unlockedAch = Object.keys(state.achievements || {}).length;

  const handleResetCalculationDefaults = () => {
    state.askConfirm({
      title: 'Obnovit výchozí parametry výpočtů?',
      message:
        'Tato akce vrátí parametry farmakokinetiky, modelu tolerance a odhadu skladu na vědecky kalibrované výchozí hodnoty. Tvé záznamy dávek, skladu a historie zůstanou nedotčeny.',
      okText: 'Obnovit výpočty',
      danger: false,
      onConfirm: () => {
        state.updateSettings({
          mitHalfLifeAlphaH: DEFAULT_SETTINGS.mitHalfLifeAlphaH,
          mitHalfLifeBetaH: DEFAULT_SETTINGS.mitHalfLifeBetaH,
          mitTMaxH: DEFAULT_SETTINGS.mitTMaxH,
          mitAlphaSharePct: DEFAULT_SETTINGS.mitAlphaSharePct,
          mitBioavailabilityPct: DEFAULT_SETTINGS.mitBioavailabilityPct,
          toleranceModelMode: 'smart',
          toleranceWindowDays: DEFAULT_SETTINGS.toleranceWindowDays,
          toleranceDecayHalfLifeDays: DEFAULT_SETTINGS.toleranceDecayHalfLifeDays,
          toleranceSevenOhMultiplier: DEFAULT_SETTINGS.toleranceSevenOhMultiplier,
          acuteHillMidpointMg: DEFAULT_SETTINGS.acuteHillMidpointMg,
          acuteHillSlope: DEFAULT_SETTINGS.acuteHillSlope,
          acuteWashoutThresholdMg: DEFAULT_SETTINGS.acuteWashoutThresholdMg,
          idealFastingWindowH: DEFAULT_SETTINGS.idealFastingWindowH,
          toleranceAcuteWeightPct: DEFAULT_SETTINGS.toleranceAcuteWeightPct,
          stockForecastMode: 'smart',
          stockForecastWindowDays: DEFAULT_SETTINGS.stockForecastWindowDays,
          stockDecayHalfLifeDays: DEFAULT_SETTINGS.stockDecayHalfLifeDays,
        });
        state.addToast('Výchozí parametry výpočtů obnoveny', { type: 'good' });
      },
    });
  };

  return (
    <div>
      {/* Hero Banner Card */}
      <div
        className="card"
        style={{
          background:
            'radial-gradient(120% 120% at 0% 0%, var(--accent-dim) 0%, rgba(28,28,30,0.88) 65%)',
          borderColor: 'var(--accent-glow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'var(--accent)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px var(--accent-glow)',
              flexShrink: 0,
            }}
          >
            <Icon name="leaf" size={26} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Kratom Tracker
              </span>
              <span className="delta-tag good">v{APP_VERSION} Pro</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Osobní harm-reduction telemetrie, farmakokinetický simulátor a chytrý skladový analytik
            </div>
          </div>
        </div>

        <div className="chip-row" style={{ marginTop: 12 }}>
          <span className="chip on" style={{ fontSize: 11, padding: '4px 9px' }}>
            🔒 100% Offline-First PWA
          </span>
          <span className="chip" style={{ fontSize: 11, padding: '4px 9px' }}>
            🧬 2-kompartmentová kinetika
          </span>
          <span className="chip" style={{ fontSize: 11, padding: '4px 9px' }}>
            ⚡ Hillův receptorový model
          </span>
          <span className="chip" style={{ fontSize: 11, padding: '4px 9px' }}>
            📦 Exponenciální predikce skladu
          </span>
        </div>
      </div>

      {/* Live App Telemetry Bento */}
      <div className="card">
        <div className="card-title">
          <span>📊 Živá diagnostika tvé databáze</span>
          <span className="delta-tag">{dataKb} kB v prohlížeči</span>
        </div>
        <div className="bento-subgrid-4">
          <div className="bento-subcell">
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Zaznamenáno dávek</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              {state.doses.length}×
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>celkem {fmtG(totalGAllTime)} g</div>
          </div>

          <div className="bento-subcell">
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Katalog & Sklad</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              {state.strains.length} druhů
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
              {state.packages.length} balení · {state.beverages.length} nápojů
            </div>
          </div>

          <div className="bento-subcell">
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Logy chuti & Vody</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              {(state.cravingLogs || []).length} chutí
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
              {state.waterLogs.length} záznamů vody
            </div>
          </div>

          <div className="bento-subcell">
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Úspěchy & Pauzy</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 800, marginTop: 2, color: 'var(--accent)' }}>
              {unlockedAch}/{ACH_DEFS.length} 🏆
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
              {state.tbreakHistory.length}× T-Break v historii
            </div>
          </div>
        </div>
      </div>

      {/* Scientific & Mathematical Models Breakdown */}
      <div className="card">
        <div className="card-title">
          <span>🧮 Matematické a fyziologické modely aplikace</span>
          <span className="delta-tag good">Plně konfigurovatelné</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div className="bento-subcell" style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13, color: 'var(--cyan)' }}>
                1. Dvoufázová eliminace Mitragyninu (α / β kompartment)
              </strong>
              <span className="delta-tag" style={{ fontSize: 10 }}>
                Tmax {st.mitTMaxH}h
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>
              Po užití dávky stoupá plazmatická koncentrace po sinusové absorpční křivce do vrcholu{' '}
              <strong style={{ color: 'var(--text)' }}>Tmax = {st.mitTMaxH} h</strong>. Následně probíhá
              dvoufázová bi-exponenciální eliminace: rychlá distribuční fáze{' '}
              <strong style={{ color: 'var(--text)' }}>
                α ({st.mitAlphaSharePct ?? 72} %, t½ = {st.mitHalfLifeAlphaH} h)
              </strong>{' '}
              a pomalá terminální fáze{' '}
              <strong style={{ color: 'var(--text)' }}>
                β ({100 - (st.mitAlphaSharePct ?? 72)} %, t½ = {st.mitHalfLifeBetaH} h)
              </strong>
              .
            </div>
          </div>

          <div className="bento-subcell" style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13, color: 'var(--accent-light)' }}>
                2. Hillova rovnice saturace receptorů & Chronická tolerance
              </strong>
              <span className="delta-tag" style={{ fontSize: 10 }}>
                EC50 = {st.acuteHillMidpointMg ?? 32} mg
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>
              Akutní obsazenost μ-opioidních receptorů se počítá nelineární Hillovou rovnicí s bodem
              poloviční saturace <strong style={{ color: 'var(--text)' }}>EC50 = {st.acuteHillMidpointMg ?? 32} mg MIT</strong>{' '}
              a strmostí <strong style={{ color: 'var(--text)' }}>n = {st.acuteHillSlope ?? 1.35}</strong>.
              Chronická adaptace kombinuje exponenciálně vážený příjem za{' '}
              <strong style={{ color: 'var(--text)' }}>{st.toleranceWindowDays || 14} dní</strong>{' '}
              (poločas paměti {st.toleranceDecayHalfLifeDays || 4.5} d), potenční váhu{' '}
              <strong style={{ color: 'var(--text)' }}>7-OH (×{st.toleranceSevenOhMultiplier ?? 12})</strong>,
              kvalitu rozestupů a noční washout okno (cíl ≥ {st.idealFastingWindowH ?? 12} h).
            </div>
          </div>

          <div className="bento-subcell" style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13, color: 'var(--purple)' }}>
                3. Shannonova entropie rotace odrůd & Skladová predikce
              </strong>
              <span className="delta-tag" style={{ fontSize: 10 }}>
                Okno {st.stockForecastWindowDays || 14}d
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>
              Při střídání různých druhů (alkaloidových profilů) model měří informační entropii{' '}
              <strong style={{ color: 'var(--text)' }}>H&apos; = -Σ pᵢ ln(pᵢ)</strong> a snižuje
              rychlost budování tolerance. Chytrý sklad počítá exponenciálně váženou denní spotřebu pro
              každý druh zvlášť a predikuje paralelní i samostatnou výdrž balení.
            </div>
          </div>

          <div className="bento-subcell" style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13, color: 'var(--warning)' }}>
                4. Prediktor chuti (MIT práh + vážená regrese WLS)
              </strong>
              <span className="delta-tag" style={{ fontSize: 10 }}>
                Session {st.cravingSessionWindowMin}m
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>
              Dávky v okně {st.cravingSessionWindowMin} min se slučují do jedné session. Při zaznamenání
              chuti aplikace uloží okamžitou plazmatickou hladinu MIT a učí se tvůj individuální
              fyziologický práh kombinovaný s váženou lineární regresí.
            </div>
          </div>
        </div>
      </div>

      {/* Privacy & Architecture */}
      <div className="card">
        <div className="card-title">
          <span>🛡️ Soukromí, architektura & klávesové zkratky</span>
          <span className="delta-tag">Zero-Cloud</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>
          Všechna tvá data jsou uložena výhradně lokálně v úložišti prohlížeče pod klíčem{' '}
          <code style={{ color: 'var(--accent-light)' }}>{LS_KEY}</code>. Aplikace neodesílá žádnou
          telemetrii ani analytiku na cizí servery a funguje plně offline jako nainstalovatelná PWA.
          Poslední záloha:{' '}
          <strong style={{ color: 'var(--text)' }}>
            {st.lastBackupAt ? fmtDateShort(st.lastBackupAt) : 'Dosud neprovedena'}
          </strong>
          .
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => state.setHelpSheetOpen(true)}
          >
            <Icon name="keyboard" size={15} />
            <span>Klávesové zkratky</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => state.setOnboardingOpen(true)}
          >
            <Icon name="sparkles" size={15} />
            <span>Přehrát úvodní prohlídku</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ gridColumn: 'span 2' }}
            onClick={handleResetCalculationDefaults}
          >
            <Icon name="refresh" size={15} />
            <span>Obnovit výchozí vědecké konstanty výpočtů</span>
          </button>
        </div>
      </div>
    </div>
  );
};
