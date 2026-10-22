import { dayKey, startOfToday } from '../lib/date';
import { r1, r2 } from '../lib/format';
import { calcActiveMitAtTime } from '../lib/pharmacokinetics';
import { getTotalStockG, getTotalStockValueKc } from '../lib/stock';
import { calcLimitStreak } from '../lib/streaks';
import { calcReceptorSensitivityScore } from '../lib/tolerance';
import { AppState, Dose } from '../types';

export function getTodayDoses(state: Pick<AppState, 'doses' | 'settings'>, now = Date.now()): Dose[] {
  const dayStartHour = state.settings.dayStartHour || 0;
  const t0 = startOfToday(dayStartHour, now);
  const tEnd = t0 + 86400000;
  return state.doses
    .filter((d) => d.timestamp >= t0 && d.timestamp < tEnd)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getTodayWaterMl(
  state: Pick<AppState, 'waterLogs' | 'settings'>,
  now = Date.now()
): number {
  const dayStartHour = state.settings.dayStartHour || 0;
  const tk = dayKey(now, dayStartHour);
  return state.waterLogs
    .filter((w) => dayKey(w.timestamp, dayStartHour) === tk)
    .reduce((a, w) => a + (w.amountMl || 0), 0);
}

export function getDashboardSnapshot(state: AppState, now = Date.now()) {
  const st = state.settings;
  const dayStartHour = st.dayStartHour || 0;
  const t0 = startOfToday(dayStartHour, now);
  const todays = getTodayDoses(state, now);
  const todayG = r2(todays.reduce((a, d) => a + d.amountG, 0));
  const todayKratomCost = r2(todays.reduce((a, d) => a + (d.cost || 0), 0));
  const todayBevCost = r2(todays.reduce((a, d) => a + (d.beverageCost || 0), 0));
  const totalSpend = r2(todayKratomCost + todayBevCost);
  const todayMit = r2(todays.reduce((a, d) => a + (d.mitMg || 0), 0));

  const sortedAll = [...state.doses].sort((a, b) => b.timestamp - a.timestamp);
  const lastDose = sortedAll[0] || null;
  const cooldownMs = (st.cooldownMin || 240) * 60000;
  const elapsedSinceLastMs = lastDose ? Math.max(0, now - lastDose.timestamp) : Infinity;
  const cooldownRemainMs = lastDose ? Math.max(0, cooldownMs - elapsedSinceLastMs) : 0;
  const cooldownReady = cooldownRemainMs <= 0;

  const activeMitMg = calcActiveMitAtTime(state.doses, st, now);
  const receptorScore = calcReceptorSensitivityScore(state, now);
  const limitStreak = calcLimitStreak(state, now);

  // 7d average (previous 7 days)
  let sum7d = 0;
  for (let i = 1; i <= 7; i++) {
    const ds = t0 - i * 86400000;
    const de = ds + 86400000;
    const dg = state.doses
      .filter((d) => d.timestamp >= ds && d.timestamp < de)
      .reduce((a, d) => a + d.amountG, 0);
    sum7d += dg;
  }
  const avg7d = r1(sum7d / 7);

  const stockTotalG = getTotalStockG(state.packages);
  const stockValueKc = getTotalStockValueKc(state.packages);
  const runwayDays = avg7d > 0 ? Math.round(stockTotalG / avg7d) : '∞';

  // Strain streak
  let strainStreak = 0;
  if (sortedAll.length > 0) {
    const firstStrain = sortedAll[0].strainId;
    for (const d of sortedAll) {
      if (d.strainId === firstStrain) strainStreak++;
      else break;
    }
  }

  const todayWaterMl = getTodayWaterMl(state, now);
  const dynamicWaterGoalMl = Math.round(
    (st.dailyWaterGoalMl || 2500) + todayG * (st.waterPerGramKratomMl || 200)
  );

  return {
    todays,
    todayG,
    totalSpend,
    todayMit,
    lastDose,
    cooldownRemainMs,
    cooldownReady,
    activeMitMg,
    receptorScore,
    limitStreak,
    avg7d,
    stockTotalG,
    stockValueKc,
    runwayDays,
    strainStreak,
    todayWaterMl,
    dynamicWaterGoalMl,
  };
}
