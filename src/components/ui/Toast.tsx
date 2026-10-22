import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ToastContainer: React.FC = () => {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div id="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast-pill">
          <span>{t.message}</span>
          {t.actionLabel && t.onAction && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.onAction?.();
                removeToast(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
