import { clamp } from './format';

export function dayStartOffsetMs(dayStartHour = 0): number {
  return clamp(dayStartHour || 0, 0, 12) * 3600000;
}

export function dayKey(ts: number, dayStartHour = 0): string {
  const off = dayStartOffsetMs(dayStartHour);
  const d = new Date(ts - off);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startOfDay(ts: number, dayStartHour = 0): number {
  const off = dayStartOffsetMs(dayStartHour);
  const d = new Date(ts - off);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + off;
}

export function startOfToday(dayStartHour = 0, now = Date.now()): number {
  return startOfDay(now, dayStartHour);
}

export function fmtTime(ts: number, timeFormat24 = true): string {
  const d = new Date(ts);
  if (timeFormat24) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return d.toLocaleTimeString('cs-CZ', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function fmtDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function fmtDateLong(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function fmtDateMid(ts: number): string {
  const d = new Date(ts);
  const wd = d.toLocaleDateString('cs-CZ', { weekday: 'short' });
  return `${d.getDate()}. ${d.getMonth() + 1}. ${wd}`;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const diffMin = Math.max(0, Math.floor((now - ts) / 60000));
  if (diffMin < 1) return 'právě teď';
  if (diffMin < 60) return `před ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  const remM = diffMin % 60;
  if (diffH < 24) {
    return remM > 0 ? `před ${diffH} h ${remM} m` : `před ${diffH} h`;
  }
  const diffD = Math.floor(diffH / 24);
  return `před ${diffD} d`;
}

export function fmtDur(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
