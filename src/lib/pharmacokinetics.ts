import { Dose, Settings } from '../types';
import { clamp, r2 } from './format';

export function calcActiveMitAtTime(
  doses: Dose[],
  settings: Pick<Settings, 'mitHalfLifeAlphaH' | 'mitHalfLifeBetaH' | 'mitTMaxH'> &
    Partial<Pick<Settings, 'mitAlphaSharePct'>>,
  targetTs = Date.now()
): number {
  let active = 0;
  const aH = settings.mitHalfLifeAlphaH || 3.8;
  const bH = settings.mitHalfLifeBetaH || 24.0;
  const tmaxH = settings.mitTMaxH || 1.2;
  const alphaShare =
    settings.mitAlphaSharePct !== undefined
      ? clamp(settings.mitAlphaSharePct, 10, 95) / 100
      : 0.7;
  const betaShare = 1 - alphaShare;

  doses.forEach((d) => {
    const diffH = (targetTs - d.timestamp) / 3600000;
    if (diffH < 0 || diffH > 96) return;
    const doseMit = d.mitMg || d.amountG * (d.mitPct || 1.45) * 10;
    let fraction: number;
    if (diffH < tmaxH) {
      fraction = Math.sin((diffH / Math.max(0.1, tmaxH)) * (Math.PI / 2));
    } else {
      const postMaxH = diffH - tmaxH;
      fraction =
        alphaShare * Math.pow(0.5, postMaxH / aH) + betaShare * Math.pow(0.5, postMaxH / bH);
    }
    active += doseMit * fraction;
  });
  return r2(active);
}

