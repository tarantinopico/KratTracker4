import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useSounds() {
  const soundsEnabled = useAppStore((s) => s.settings.soundsEnabled);
  const defaultFreq = useAppStore((s) => s.settings.soundFrequencyHz || 660);

  return useCallback(
    (freq?: number, durationMs = 70) => {
      if (!soundsEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq || defaultFreq;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + durationMs / 1000);
      } catch {
        // ignore audio errors
      }
    },
    [soundsEnabled, defaultFreq]
  );
}

