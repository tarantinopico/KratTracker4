import { useEffect } from 'react';
import { hexToRgba, lightenHex } from '../lib/format';
import { useAppStore } from '../store/useAppStore';

export function useTheme() {
  const theme = useAppStore((s) => s.settings.theme);
  const customAccentHex = useAppStore((s) => s.settings.customAccentHex);
  const privacyMode = useAppStore((s) => s.settings.privacyMode);
  const uiDensity = useAppStore((s) => s.settings.uiDensity);
  const fontScale = useAppStore((s) => s.settings.fontScale);
  const histCompactRows = useAppStore((s) => s.settings.histCompactRows);
  const glassBlurPx = useAppStore((s) => s.settings.glassBlurPx ?? 28);
  const cardRadiusScale = useAppStore((s) => s.settings.cardRadiusScale || 'normal');
  const borderContrast = useAppStore((s) => s.settings.borderContrast || 'normal');
  const animationsEnabled = useAppStore((s) => s.settings.animationsEnabled !== false);

  useEffect(() => {
    const body = document.body;
    body.setAttribute('data-theme', theme);

    if (theme === 'custom' && customAccentHex) {
      body.style.setProperty('--accent', customAccentHex);
      body.style.setProperty('--accent-light', lightenHex(customAccentHex, 46));
      body.style.setProperty('--accent-dim', hexToRgba(customAccentHex, 0.16));
      body.style.setProperty('--accent-glow', hexToRgba(customAccentHex, 0.35));
    } else {
      body.style.removeProperty('--accent');
      body.style.removeProperty('--accent-light');
      body.style.removeProperty('--accent-dim');
      body.style.removeProperty('--accent-glow');
    }

    body.style.setProperty('--glass-blur', `${glassBlurPx}px`);

    if (cardRadiusScale === 'sharp') {
      body.style.setProperty('--radius-sm', '5px');
      body.style.setProperty('--radius-md', '8px');
      body.style.setProperty('--radius-lg', '11px');
      body.style.setProperty('--radius-xl', '14px');
    } else if (cardRadiusScale === 'rounded') {
      body.style.setProperty('--radius-sm', '11px');
      body.style.setProperty('--radius-md', '16px');
      body.style.setProperty('--radius-lg', '24px');
      body.style.setProperty('--radius-xl', '30px');
    } else {
      body.style.removeProperty('--radius-sm');
      body.style.removeProperty('--radius-md');
      body.style.removeProperty('--radius-lg');
      body.style.removeProperty('--radius-xl');
    }

    if (borderContrast === 'subtle') {
      body.style.setProperty('--border-glass', 'rgba(255, 255, 255, 0.06)');
      body.style.setProperty('--border-glass-top', 'rgba(255, 255, 255, 0.11)');
    } else if (borderContrast === 'high') {
      body.style.setProperty('--border-glass', 'rgba(255, 255, 255, 0.24)');
      body.style.setProperty('--border-glass-top', 'rgba(255, 255, 255, 0.38)');
    } else {
      body.style.removeProperty('--border-glass');
      body.style.removeProperty('--border-glass-top');
    }

    body.classList.toggle('privacy-on', Boolean(privacyMode));
    body.classList.toggle('density-compact', uiDensity === 'compact');
    body.classList.toggle('fs-large', fontScale === 'large');
    body.classList.toggle('fs-xlarge', fontScale === 'xlarge');
    body.classList.toggle('hist-compact', Boolean(histCompactRows));
    body.classList.toggle('no-anim', !animationsEnabled);
  }, [
    theme,
    customAccentHex,
    privacyMode,
    uiDensity,
    fontScale,
    histCompactRows,
    glassBlurPx,
    cardRadiusScale,
    borderContrast,
    animationsEnabled,
  ]);
}

