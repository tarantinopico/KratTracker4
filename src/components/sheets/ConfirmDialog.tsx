import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ConfirmDialog: React.FC = () => {
  const confirmDialog = useAppStore((s) => s.confirmDialog);
  const closeConfirm = useAppStore((s) => s.closeConfirm);

  if (!confirmDialog) return null;

  return (
    <>
      <div className="modal-backdrop open" style={{ zIndex: 110 }} onClick={closeConfirm} />
      <div className="sheet open" style={{ zIndex: 115 }} role="alertdialog" aria-modal="true">
        <div className="sheet-grab" />
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{confirmDialog.title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 18 }}>
          {confirmDialog.message}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={closeConfirm}>
            Zrušit
          </button>
          <button
            type="button"
            className={`btn ${confirmDialog.danger !== false ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              const fn = confirmDialog.onConfirm;
              closeConfirm();
              fn();
            }}
          >
            {confirmDialog.okText || 'Potvrdit'}
          </button>
        </div>
      </div>
    </>
  );
};
