import React, { useEffect, useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { Sheet } from '../components/sheets/Sheet';
import { useHaptics } from '../hooks/useHaptics';
import { useSounds } from '../hooks/useSounds';
import { getLastSession } from '../lib/cravingSessions';
import { fmtTime } from '../lib/date';
import { fmtG, fmtMg } from '../lib/format';
import { calcActiveMitAtTime } from '../lib/pharmacokinetics';
import { useAppStore } from '../store/useAppStore';
import { CravingSeverity } from '../types';

export const SEVERITY_META: Array<{
  level: CravingSeverity;
  label: string;
  color: string;
  barH: number;
}> = [
  { level: 1, label: 'Velmi slabá', color: '#30d158', barH: 18 },
  { level: 2, label: 'Slabá', color: '#64d2ff', barH: 26 },
  { level: 3, label: 'Střední', color: '#ffd60a', barH: 34 },
  { level: 4, label: 'Silná', color: '#ff9f0a', barH: 42 },
  { level: 5, label: 'Velmi silná', color: '#ff453a', barH: 50 },
];

export const CravingSheet: React.FC = () => {
  const cravingSheetOpen = useAppStore((s) => s.cravingSheetOpen);
  const editingCravingId = useAppStore((s) => s.editingCravingId);
  const closeCravingSheet = useAppStore((s) => s.closeCravingSheet);
  const cravingLogs = useAppStore((s) => s.cravingLogs);
  const doses = useAppStore((s) => s.doses);
  const strains = useAppStore((s) => s.strains);
  const settings = useAppStore((s) => s.settings);
  const logCraving = useAppStore((s) => s.logCraving);
  const updateCravingLog = useAppStore((s) => s.updateCravingLog);
  const deleteCravingLog = useAppStore((s) => s.deleteCravingLog);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const addToast = useAppStore((s) => s.addToast);

  const buzz = useHaptics();
  const playSound = useSounds();

  const existingLog = editingCravingId
    ? (cravingLogs || []).find((c) => c.id === editingCravingId) || null
    : null;

  const now = Date.now();
  const lastSession = getLastSession(doses, settings.cravingSessionWindowMin || 60);
  const activeMitNow = calcActiveMitAtTime(doses, settings, now);

  const [severity, setSeverity] = useState<CravingSeverity | null>(3);
  const [strainId, setStrainId] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (!cravingSheetOpen) return;
    if (existingLog) {
      setSeverity(existingLog.severity || 3);
      setStrainId(existingLog.strainId || '');
      setNote(existingLog.note || '');
    } else {
      setSeverity(settings.cravingSeverityRequired ? null : 3);
      setStrainId(lastSession?.dominantStrainId || strains[0]?.id || '');
      setNote('');
    }
  }, [
    cravingSheetOpen,
    existingLog,
    settings.cravingSeverityRequired,
    lastSession?.dominantStrainId,
    strains,
  ]);

  const handleSave = () => {
    if (severity === null) {
      addToast('Vyber prosím intenzitu chuti (1–5)', { type: 'warn' });
      return;
    }

    buzz([12, 30, 18]);
    playSound(740, 80);

    if (existingLog) {
      updateCravingLog(existingLog.id, {
        severity,
        strainId: strainId || null,
        note: note.trim(),
      });
      addToast('Záznam chuti upraven', { type: 'good' });
      closeCravingSheet();
    } else {
      logCraving(severity, note, strainId || null);
    }
  };

  const handleDelete = () => {
    if (!existingLog) return;
    const doDelete = () => {
      deleteCravingLog(existingLog.id);
      closeCravingSheet();
      addToast('Záznam chuti smazán', { type: 'warn' });
    };

    if (settings.confirmBeforeDelete) {
      askConfirm({
        title: 'Smazat záznam chuti?',
        message: 'Opravdu chceš tento záznam chuti trvale odstranit?',
        okText: 'Smazat',
        danger: true,
        onConfirm: doDelete,
      });
    } else {
      doDelete();
    }
  };

  return (
    <Sheet
      open={cravingSheetOpen}
      onClose={closeCravingSheet}
      title={existingLog ? 'Upravit záznam chuti' : 'Zaznamenat chuť'}
      sub="Sledování subjektivní chuti a kalibrace predikčního prahu MIT"
    >
      {/* Info block */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(255, 159, 10, 0.1)',
          border: '0.5px solid rgba(255, 159, 10, 0.35)',
          fontSize: 12,
          color: 'var(--text)',
          marginBottom: 14,
          lineHeight: 1.45,
        }}
      >
        {existingLog ? (
          <>
            Poslední session: <strong>{fmtG(existingLog.lastSessionTotalG)} g</strong> (
            {existingLog.lastSessionCount} dávek,{' '}
            {fmtTime(existingLog.lastSessionEnd, settings.timeFormat24)}) · aktivní MIT v
            momentě chuti:{' '}
            <strong className="privacy-val" style={{ color: 'var(--warning)' }}>
              {fmtMg(existingLog.activeMitAtCraving)}
            </strong>
          </>
        ) : lastSession ? (
          <>
            Poslední session: <strong>{fmtG(lastSession.totalG)} g</strong> (
            {lastSession.doseIds.length} dávek,{' '}
            {fmtTime(lastSession.endTime, settings.timeFormat24)}) · aktivní MIT teď:{' '}
            <strong className="privacy-val" style={{ color: 'var(--warning)' }}>
              {fmtMg(activeMitNow)}
            </strong>
          </>
        ) : (
          <span style={{ color: 'var(--warning)' }}>
            Zatím není zaznamenána žádná dávka. Nejdřív prosím zapiš dávku.
          </span>
        )}
      </div>

      {/* Severity Picker (5 vertical column buttons) */}
      <div className="field">
        <label className="field-label">
          Intenzita chuti{' '}
          {settings.cravingSeverityRequired ? '(povinné)' : '(výchozí 3 – Střední)'}
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 6,
            marginTop: 4,
          }}
        >
          {SEVERITY_META.map((item) => {
            const active = severity === item.level;
            return (
              <button
                key={item.level}
                type="button"
                onClick={() => {
                  buzz(10);
                  setSeverity(item.level);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 6,
                  padding: '10px 4px 8px',
                  borderRadius: 12,
                  background: active
                    ? 'rgba(255, 255, 255, 0.11)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: active
                    ? `1.5px solid ${item.color}`
                    : '0.5px solid var(--border-glass)',
                  boxShadow: active ? `0 4px 14px ${item.color}33` : 'none',
                  minHeight: 96,
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: item.barH,
                    borderRadius: 999,
                    background: item.color,
                    opacity: active ? 1 : 0.42,
                    transition: 'all 0.15s ease',
                  }}
                />
                <div
                  className="num"
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: active ? item.color : 'var(--text)',
                  }}
                >
                  {item.level}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: active ? '#ffffff' : 'var(--muted)',
                    textAlign: 'center',
                    lineHeight: 1.15,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Strain select */}
      <div className="field">
        <label className="field-label">Odrůda předchozí session (volitelné)</label>
        <select
          className="select"
          value={strainId}
          onChange={(e) => setStrainId(e.target.value)}
        >
          <option value="">Neuvedeno</option>
          {strains.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Note input */}
      <div className="field">
        <label className="field-label">Poznámka (max 120 znaků)</label>
        <input
          type="text"
          className="input"
          maxLength={120}
          placeholder="např. stres v práci, po obědě, únava…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        {existingLog && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            <Icon name="trash" /> Smazat
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={closeCravingSheet}>
          Zrušit
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          disabled={!existingLog && !lastSession}
          onClick={handleSave}
        >
          <Icon name="check" /> Uložit
        </button>
      </div>
    </Sheet>
  );
};
