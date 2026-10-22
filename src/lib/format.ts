export const r1 = (v: number): number => Math.round((v || 0) * 10) / 10;
export const r2 = (v: number): number => Math.round((v || 0) * 100) / 100;
export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const uid = (p: string): string =>
  p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const parseNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = parseFloat(String(v).replace(',', '.'));
  return isNaN(x) ? null : x;
};

export const fmtG = (n: number): string =>
  r2(n).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });

export const fmtKc = (n: number, currency = 'Kč'): string =>
  r2(n).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' ' + (currency || 'Kč');

export const fmtMg = (n: number): string =>
  r2(n).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' mg';

export function lightenHex(hex: string, amount = 46): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = clamp(parseInt(clean.slice(0, 2), 16) + amount, 0, 255);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + amount, 0, 255);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + amount, 0, 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(48, 209, 88, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
