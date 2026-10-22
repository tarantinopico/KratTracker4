import React, { useEffect, useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { EFFECT_KEYS, EFFECT_MAP } from '../constants/effects';
import { useHaptics } from '../hooks/useHaptics';
import { useSounds } from '../hooks/useSounds';
import { fmtTime, toLocalInput } from '../lib/date';
import { clamp, fmtG, fmtKc, fmtMg, parseNum, r1, r2, uid } from '../lib/format';
import { getActivePackage } from '../lib/stock';
import { useAppStore } from '../store/useAppStore';
import { Dose, EffectType } from '../types';

const QUICK_NOTE_TAGS = ['Nalačno', 'Po jídle', 'Pracovní fokus', 'Před tréninkem'];

export const DoseModal: React.FC = () => {
  const state = useAppStore();
  const st = state.settings;
  const buzz = useHaptics();
  const playSound = useSounds();

  const isOpen = state.doseModalOpen;
  const editingDose = state.editingDoseId
    ? state.doses.find((d) => d.id === state.editingDoseId) || null
    : null;

  const [amountStr, setAmountStr] = useState('2');
  const [stepSize, setStepSize] = useState(st.doseStepDefault || 0.5);
  const [strainId, setStrainId] = useState('');
  const [packageId, setPackageId] = useState<string>('none');
  const [beverageId, setBeverageId] = useState('bev_water');
  const [rating, setRating] = useState(4);
  const [effect, setEffect] = useState<EffectType>('energy');
  const [timeMode, setTimeMode] = useState<'now' | 'custom'>('now');
  const [customTimeStr, setCustomTimeStr] = useState(toLocalInput(Date.now()));
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStepSize(st.doseStepDefault || 0.5);

    if (editingDose) {
      setAmountStr(String(editingDose.amountG));
      setStrainId(editingDose.strainId);
      setPackageId(editingDose.packageId || 'none');
      setBeverageId(editingDose.beverageId || 'bev_water');
      setRating(editingDose.rating ?? 4);
      setEffect(editingDose.effect || 'energy');
      setTimeMode('custom');
      setCustomTimeStr(toLocalInput(editingDose.timestamp));
      setNote(editingDose.note || '');
    } else {
      const defAmt = st.lastAmount || st.defaultDoseG || 2.0;
      setAmountStr(String(defAmt));
      const defStrainId = st.lastStrainId || state.strains[0]?.id || '';
      setStrainId(defStrainId);
      const activePkg =
        st.autoSelectActivePackage && defStrainId
          ? getActivePackage(state.packages, defStrainId)
          : null;
      setPackageId(activePkg ? activePkg.id : 'none');
      setBeverageId(st.lastBeverageId || 'bev_water');
      setRating(4);
      setEffect('energy');
      setTimeMode('now');
      setCustomTimeStr(toLocalInput(Date.now()));
      setNote('');
    }
  }, [isOpen, editingDose]);

  if (!isOpen) return null;

  const amountG = Math.max(0.05, parseNum(amountStr) || 0);
  const selectedStrain = state.strains.find((s) => s.id === strainId) || state.strains[0];
  const candidatePackages = state.packages.filter(
    (p) =>
      p.strainId === selectedStrain?.id &&
      (p.status !== 'finished' || p.id === editingDose?.packageId)
  );
  const selectedPkg =
    packageId !== 'none' ? state.packages.find((p) => p.id === packageId) || null : null;
  const selectedBev =
    state.beverages.find((b) => b.id === beverageId) || state.beverages[0];

  const pricePerG = selectedPkg
    ? selectedPkg.pricePerG
    : selectedStrain?.pricePerG || st.defaultPricePerG || 8;
  const kratomCost = r2(amountG * pricePerG);
  const bevCost = st.enableBeverages ? selectedBev?.cost || 0 : 0;
  const totalCost = r2(kratomCost + bevCost);

  const mitPct = selectedStrain?.mitPct || st.defaultMitPct || 1.45;
  const sevenOhPct = selectedStrain?.sevenOhPct || st.defaultSevenOhPct || 0.025;
  const mitMg = r2(amountG * mitPct * 10);
  const sevenOhMg = r2(amountG * sevenOhPct * 10);
  const mgPerKg = r2(mitMg / Math.max(35, st.bodyWeightKg || 75));

  const pkgRemAfter = selectedPkg
    ? r2(
        Math.max(
          0,
          selectedPkg.remainingWeightG +
            (editingDose && editingDose.packageId === selectedPkg.id ? editingDose.amountG : 0) -
            amountG
        )
      )
    : null;

  const doseTimestamp =
    timeMode === 'now'
      ? Date.now()
      : new Date(customTimeStr).getTime() || Date.now();
  const peakTs = doseTimestamp + (st.mitTMaxH || 1.2) * 3600000;
  const sub1MgHours = r1((st.mitTMaxH || 1.2) + (st.mitHalfLifeAlphaH || 3.8) * 3.2);

  const handleStrainChange = (newStrainId: string) => {
    setStrainId(newStrainId);
    if (st.autoSelectActivePackage) {
      const act = getActivePackage(state.packages, newStrainId);
      setPackageId(act ? act.id : 'none');
    } else {
      setPackageId('none');
    }
  };

  const adjustAmount = (delta: number) => {
    buzz(8);
    const next = clamp(r2(amountG + delta), 0.1, 50);
    setAmountStr(String(next));
  };

  const handleAppendNoteTag = (tag: string) => {
    if (!note.trim()) {
      setNote(tag);
    } else if (!note.includes(tag)) {
      setNote(`${note.trim()}, ${tag}`);
    }
  };

  const handleSave = () => {
    if (!selectedStrain || amountG <= 0) {
      state.addToast('Zadej platnou gramáž a druh', { type: 'danger' });
      return;
    }

    buzz(15);
    playSound(660, 80);

    const payload: Dose = {
      id: editingDose ? editingDose.id : uid('d'),
      strainId: selectedStrain.id,
      strainName: selectedStrain.name,
      strainColor: selectedStrain.color,
      packageId: selectedPkg ? selectedPkg.id : null,
      amountG: r2(amountG),
      timestamp: doseTimestamp,
      pricePerG,
      cost: kratomCost,
      beverageId: selectedBev?.id || 'bev_water',
      beverageName: selectedBev?.name || 'Voda',
      beverageIcon: selectedBev?.icon || '💧',
      beverageCost: bevCost,
      rating: st.enableMoodRating ? rating : 4,
      effect: st.enableMoodRating ? effect : 'energy',
      mitPct,
      sevenOhPct,
      mitMg,
      sevenOhMg,
      note: note.trim(),
      calibrated: editingDose?.calibrated || false,
      calibrationDiff: editingDose?.calibrationDiff,
      originalAmountG: editingDose?.originalAmountG,
    };

    if (editingDose) {
      state.updateDose(editingDose.id, payload);
      state.addToast('Dávka upravena ✅', { type: 'good' });
    } else {
      state.addDose(payload);
      state.addToast(`Zapsáno: +${fmtG(payload.amountG)} g (${payload.strainName})`, {
        type: 'good',
      });
    }
    state.closeDoseModal();
  };

  const handleDelete = () => {
    if (!editingDose) return;
    const performDelete = () => {
      const removed = state.deleteDose(editingDose.id);
      state.closeDoseModal();
      if (removed) {
        state.addToast('Dávka smazána', {
          duration: 5200,
          actionLabel: 'Vrátit zpět',
          onAction: () => {
            state.restoreDose(removed);
            state.addToast('Dávka obnovena');
          },
        });
      }
    };

    if (st.confirmBeforeDelete) {
      state.askConfirm({
        title: 'Smazat dávku?',
        message: `Opravdu chceš smazat záznam ${fmtG(editingDose.amountG)} g (${editingDose.strainName})?`,
        okText: 'Smazat',
        onConfirm: performDelete,
      });
    } else {
      performDelete();
    }
  };

  return (
    <div className="fullscreen-modal open" role="dialog" aria-modal="true" aria-label={editingDose ? 'Upravit dávku' : 'Nová dávka'}>
      <header className="fd-header">
        <button type="button" className="btn btn-sm btn-ghost" onClick={state.closeDoseModal}>
          Zrušit
        </button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {editingDose ? 'Upravit dávku' : 'Nová dávka'}
        </div>
        <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>
          {editingDose ? 'Uložit změny' : 'Uložit'}
        </button>
      </header>

      <div className="fd-body">
        {/* 1. Amount Stepper Hero */}
        <div className="fd-card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <button
              type="button"
              aria-label="Snížit gramáž"
              onClick={() => adjustAmount(-stepSize)}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '0.5px solid var(--border-glass)',
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              −
            </button>

            <div style={{ minWidth: 120 }}>
              <input
                id="dose-amt-input"
                type="number"
                step="0.05"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                aria-label="Gramáž dávky"
                style={{
                  width: 120,
                  textAlign: 'center',
                  background: 'transparent',
                  border: 0,
                  fontSize: 44,
                  fontWeight: 800,
                  color: '#ffffff',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4 }}>gramů</div>
            </div>

            <button
              type="button"
              aria-label="Zvýšit gramáž"
              onClick={() => adjustAmount(stepSize)}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'var(--accent-dim)',
                border: '0.5px solid var(--accent)',
                color: 'var(--accent-light)',
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              +
            </button>
          </div>

          {/* Quick presets */}
          <div className="chip-row" style={{ justifyContent: 'center', marginTop: 12 }}>
            {st.quickDosePresets.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${Math.abs(amountG - p) < 0.01 ? 'on' : ''}`}
                onClick={() => setAmountStr(String(p))}
              >
                {fmtG(p)} g
              </button>
            ))}
          </div>

          {/* Step size seg */}
          <div className="seg" style={{ marginTop: 10 }}>
            {[0.1, 0.25, 0.5, 1].map((stVal) => (
              <button
                key={stVal}
                type="button"
                className={`seg-btn ${stepSize === stVal ? 'on' : ''}`}
                onClick={() => setStepSize(stVal)}
              >
                ±{stVal}g
              </button>
            ))}
          </div>
        </div>

        {/* 2. Live Preview Card */}
        {st.modalShowPreview && (
          <div className="fd-card">
            <div className="fd-label">📊 Náhled dopadu · živě</div>
            <div className="stats-4">
              <div className="bento-subcell" style={{ textAlign: 'center' }}>
                <div className="stat-cell-label">Cena celkem</div>
                <div className="stat-cell-val">{fmtKc(totalCost, st.currency)}</div>
              </div>
              <div className="bento-subcell" style={{ textAlign: 'center' }}>
                <div className="stat-cell-label">Zbude v balení</div>
                <div className="stat-cell-val">
                  {pkgRemAfter !== null ? `${fmtG(pkgRemAfter)} g` : 'Volná'}
                </div>
              </div>
              <div className="bento-subcell" style={{ textAlign: 'center' }}>
                <div className="stat-cell-label">Čistý MIT</div>
                <div className="stat-cell-val">{fmtMg(mitMg)}</div>
              </div>
              <div className="bento-subcell" style={{ textAlign: 'center' }}>
                <div className="stat-cell-label">Dávka / kg</div>
                <div className="stat-cell-val">{mgPerKg} mg/kg</div>
              </div>
            </div>
            {st.enablePharmacokinetics && st.modalShowMitEstimate && (
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--muted)',
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: '0.5px solid var(--border-subtle)',
                }}
              >
                🧬 Odhad vrcholu účinku kolem{' '}
                <strong style={{ color: '#fff' }}>{fmtTime(peakTs, st.timeFormat24)}</strong> · pokles
                aktivní frakce za ~{sub1MgHours} h
              </div>
            )}
          </div>
        )}

        {/* 3. Druh a balení */}
        <div className="fd-card">
          <div className="fd-label">🌿 Druh a balení</div>
          <div className="chip-row" style={{ marginBottom: 10 }}>
            {state.strains.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip ${selectedStrain?.id === s.id ? 'on' : ''}`}
                onClick={() => handleStrainChange(s.id)}
              >
                <span className="dot" style={{ background: s.color }} />
                <span>{s.name}</span>
              </button>
            ))}
          </div>

          <select
            id="dose-pkg-choice"
            className="select"
            aria-label="Výběr balení"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
          >
            <option value="none">Bez balení (pouze volný odhad)</option>
            {candidatePackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (zbývá {fmtG(p.remainingWeightG)} g)
              </option>
            ))}
          </select>
        </div>

        {/* 4. Doprovodný nápoj */}
        {st.enableBeverages && (
          <div className="fd-card">
            <div className="fd-label">🥤 Doprovodný nápoj</div>
            <div className="chip-row">
              {state.beverages.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`chip ${beverageId === b.id ? 'on' : ''}`}
                  onClick={() => setBeverageId(b.id)}
                >
                  <span>{b.icon}</span>
                  <span>{b.name}</span>
                  {st.showFinances && b.cost > 0 && (
                    <span style={{ opacity: 0.7 }}>
                      (+{fmtKc(b.cost, st.currency)})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Hodnocení, efekt a čas */}
        <div className="fd-card">
          <div className="fd-label">
            ⭐ Hodnocení, efekt a čas · ({fmtTime(doseTimestamp, st.timeFormat24)})
          </div>

          {st.enableMoodRating && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Hodnocení ${star} hvězd`}
                    onClick={() => setRating(star)}
                    style={{
                      padding: 4,
                      color: star <= rating ? 'var(--warning)' : 'rgba(255,255,255,0.22)',
                    }}
                  >
                    <Icon
                      name="star"
                      size={24}
                      fill={star <= rating ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>

              <div className="chip-row" style={{ marginBottom: 10 }}>
                {EFFECT_KEYS.map((ek) => (
                  <button
                    key={ek}
                    type="button"
                    className={`chip ${effect === ek ? 'on' : ''}`}
                    onClick={() => setEffect(ek)}
                  >
                    <span>{EFFECT_MAP[ek].icon}</span>
                    <span>{EFFECT_MAP[ek].label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="seg">
            <button
              type="button"
              className={`seg-btn ${timeMode === 'now' ? 'on' : ''}`}
              onClick={() => setTimeMode('now')}
            >
              Právě teď
            </button>
            <button
              type="button"
              className={`seg-btn ${timeMode === 'custom' ? 'on' : ''}`}
              onClick={() => setTimeMode('custom')}
            >
              Zadat jiný čas
            </button>
          </div>

          {timeMode === 'custom' && (
            <input
              type="datetime-local"
              className="input"
              style={{ marginTop: 8 }}
              value={customTimeStr}
              onChange={(e) => setCustomTimeStr(e.target.value)}
            />
          )}
        </div>

        {/* 6. Poznámka */}
        <div className="fd-card">
          <div className="fd-label">📝 Poznámka</div>
          <input
            type="text"
            className="input"
            maxLength={160}
            placeholder="např. nalačno, před cvičením…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {st.modalShowNoteTags && (
            <div className="chip-row" style={{ marginTop: 8 }}>
              {QUICK_NOTE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="chip"
                  onClick={() => handleAppendNoteTag(tag)}
                >
                  + {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 7. Delete button in edit mode */}
        {editingDose && (
          <button
            type="button"
            className="btn btn-danger"
            style={{ width: '100%', marginTop: 6 }}
            onClick={handleDelete}
          >
            Smazat dávku
          </button>
        )}
      </div>
    </div>
  );
};
