import { AppState } from '../types';
import { dayKey, startOfToday } from './date';
import { dailyMap } from './stock';

export function calcLimitStreak(state: Pick<AppState, 'doses' | 'settings'>, now = Date.now()): number {
  const dayStartHour = state.settings.dayStartHour || 0;
  const dm = dailyMap(state.doses, dayStartHour);
  const L = state.settings.dailyLimitG || 0;
  const t0 = startOfToday(dayStartHour, now);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const val = dm[dayKey(t0 - i * 86400000, dayStartHour)] || 0;
    if (L > 0 && val <= L && val > 0) streak++;
    else if (val === 0) continue;
    else break;
  }
  return streak;
}

export function calcCleanStreak(state: Pick<AppState, 'doses' | 'settings'>, now = Date.now()): number {
  if (!state.doses.length) return 0;
  const dayStartHour = state.settings.dayStartHour || 0;
  const dm = dailyMap(state.doses, dayStartHour);
  const t0 = startOfToday(dayStartHour, now);
  const oldestTs = Math.min(...state.doses.map((d) => d.timestamp));
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const dayTs = t0 - i * 86400000;
    if (dayTs + 86400000 < oldestTs) break;
    const val = dm[dayKey(dayTs, dayStartHour)] || 0;
    if (val === 0) streak++;
    else break;
  }
  return streak;
}

export function calcWaterStreak(state: Pick<AppState, 'waterLogs' | 'settings'>, now = Date.now()): number {
  const dayStartHour = state.settings.dayStartHour || 0;
  const goal = state.settings.dailyWaterGoalMl || 2500;
  const t0 = startOfToday(dayStartHour, now);
  const wm: Record<string, number> = {};
  state.waterLogs.forEach((w) => {
    const k = dayKey(w.timestamp, dayStartHour);
    wm[k] = (wm[k] || 0) + (w.amountMl || 0);
  });
  let streak = 0;
  const todayOk = (wm[dayKey(t0, dayStartHour)] || 0) >= goal;
  for (let i = todayOk ? 0 : 1; i < 400; i++) {
    if ((wm[dayKey(t0 - i * 86400000, dayStartHour)] || 0) >= goal) streak++;
    else break;
  }
  return streak;
}

export function calcIntervalStreak(state: Pick<AppState, 'doses' | 'settings'>): number {
  const th = state.settings.intervalComplianceThresholdH || 4;
  const arr = [...state.doses].sort((a, b) => b.timestamp - a.timestamp);
  let streak = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    const gapH = (arr[i].timestamp - arr[i + 1].timestamp) / 3600000;
    if (gapH >= th) streak++;
    else break;
  }
  return streak;
}

export function calcBudgetStreak(state: Pick<AppState, 'doses' | 'settings'>, now = Date.now()): number {
  const B = state.settings.dailyBudgetKc || 0;
  if (B <= 0) return 0;
  const dayStartHour = state.settings.dayStartHour || 0;
  const cm: Record<string, number> = {};
  state.doses.forEach((d) => {
    const k = dayKey(d.timestamp, dayStartHour);
    cm[k] = (cm[k] || 0) + (d.cost || 0) + (d.beverageCost || 0);
  });
  const t0 = startOfToday(dayStartHour, now);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const v = cm[dayKey(t0 - i * 86400000, dayStartHour)] || 0;
    if (v <= B && v > 0) streak++;
    else if (v === 0) continue;
    else break;
  }
  return streak;
}
