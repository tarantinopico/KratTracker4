import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons/Icon';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ open, onClose, title, sub, wide, children }) => {
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    const bodyEl = bodyRef.current;
    const isHeaderGrab = (e.target as HTMLElement).closest('.sheet-grab, .sheet-title');
    if (isHeaderGrab || !bodyEl || bodyEl.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
    } else {
      startYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) {
      setDragY(dy);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 80) {
      setDragY(0);
      onClose();
    } else {
      setDragY(0);
    }
    startYRef.current = null;
  };

  return (
    <>
      <div className="modal-backdrop open" onClick={onClose} />
      <div
        className={`sheet open ${wide ? 'sheet-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        style={
          dragY > 0
            ? { transform: `translate(-50%, ${dragY}px)`, transition: 'none' }
            : undefined
        }
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sheet-grab" />
        {title && (
          <div className="sheet-title">
            <div>
              <div>{title}</div>
              {sub && (
                <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-3)', marginTop: 2 }}>
                  {sub}
                </div>
              )}
            </div>
            <button type="button" className="icon-btn" aria-label="Zavřít" onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        <div className="sheet-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </>
  );
};
