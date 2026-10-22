import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useHaptics() {
  const hapticsEnabled = useAppStore((s) => s.settings.haptics);
  const intensity = useAppStore((s) => s.settings.hapticIntensity || 'medium');

  return useCallback(
    (pattern?: number | number[]) => {
      if (!hapticsEnabled) return;
      const mult = intensity === 'light' ? 0.5 : intensity === 'heavy' ? 1.8 : 1;
      const finalPattern =
        pattern === undefined
          ? Math.round(12 * mult)
          : typeof pattern === 'number'
          ? Math.max(4, Math.round(pattern * mult))
          : pattern.map((v) => Math.max(4, Math.round(v * mult)));
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(finalPattern);
        }
      } catch {
        // ignore unsupported vibration
      }
    },
    [hapticsEnabled, intensity]
  );
}

