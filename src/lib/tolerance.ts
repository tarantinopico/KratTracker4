import { AppState, CalculationMode } from '../types';
import { startOfDay, startOfToday } from './date';
import { clamp, r1, r2 } from './format';
import { calcActiveMitAtTime } from './pharmacokinetics';

export interface ReceptorToleranceAnalysis {
  mode: CalculationMode;
  sensitivityScore: number;         // 10–100 % (vyšší = čerstvější receptory)
  receptorLoadPct: number;          // 0–100 % (celková akutní + chronická zátěž receptorů)
  toleranceIndex: number;           // 0–90 % (odhadovaná míra vybudované tolerance)
  effectivePotencyPct: number;      // např. 84 % subjektivní síly standardní dávky
  equivalentDoseFor2g: number;      // kolik g je dnes potřeba pro účinek čerstvých 2.0 g
  activeMitMg: number;              // aktuální plazmatická hladina MIT v mg
  acuteOccupancyPct: number;        // 0–100 % okamžitá obsazenost receptorů (Hillova rovnice)
  chronicFatiguePct: number;        // 0–100 % dlouhodobá adaptace receptorů za okno
  weightedDailyEqG: number;         // vážený denní ekvivalent gramů (zohledňuje i 7-OH potenci)
  avgIntervalH: number | null;
  overnightGapH: number | null;
  consecutiveActiveDays: number;
  cleanDaysInWindow: number;
  daysTo80Pct: number;
  daysTo90Pct: number;
  hoursToAcuteWashout: number;
  statusLabel: string;
  statusCls: 'good' | 'warn' | 'danger';
  components: {
    volumePenalty: number;          // penalizace za objem a alkaloidovou nálož
    alkaloidPotencyPenalty: number; // extra dopad silných 7-OH / MIT šarží
    spacingPenalty: number;         // penalizace za krátké rozestupy / redosing ve špičce
    streakPenalty: number;          // penalizace za souvislou sérii dnů bez pauzy
    overnightBonus: number;         // bonus za noční washout okno (≥ 11 h)
    rotationBonus: number;          // bonus za střídání alkaloidových profilů (odrůd)
    cleanDaysRecovery: number;      // regenerace za čisté dny a T-Break
  };
}

/**
 * Původní (Classic) bodový model citlivosti receptorů (zpětně kompatibilní).
 */
export function calcClassicReceptorScore(
  state: Pick<AppState, 'doses' | 'settings'>,
  targetTs = Date.now()
): number {
  const st = state.settings;
  const L = st.dailyLimitG || 10;
  const pLimit = st.tolerancePenaltyLimit ?? 30;
  const pInt = st.tolerancePenaltyInterval ?? 35;
  const pStreak = st.toleranceConsecutiveDaysPenalty ?? 15;
  const recPerDay = st.toleranceRecoveryPerDay ?? 15;
  const dayStartHour = st.dayStartHour || 0;

  let score = 100;
  const t0 = startOfDay(targetTs, dayStartHour);
  const dayEnd = t0 + 86_400_000;

  const historyDoses = state.doses
    .filter((d) => d.timestamp <= targetTs)
    .sort((a, b) => b.timestamp - a.timestamp);
  const todayDoses = historyDoses.filter((d) => d.timestamp >= t0 && d.timestamp < dayEnd);
  const todayG = todayDoses.reduce((a, d) => a + d.amountG, 0);

  // Penalizace za krátké rozestupy (prvních 5 intervalů)
  if (historyDoses.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < Math.min(historyDoses.length, 6); i++) {
      intervals.push((historyDoses[i - 1].timestamp - historyDoses[i].timestamp) / 3_600_000);
    }
    const avgInt = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInt < 2.5) score -= pInt;
    else if (avgInt < 4.0) score -= Math.round(pInt * 0.5);
  }

  // Penalizace za překročení denního limitu
  if (L > 0 && todayG > L) score -= pLimit;
  else if (L > 0 && todayG > L * 0.8) score -= Math.round(pLimit * 0.5);

  // Po sobě jdoucí dny s dávkou vs. čisté dny (posledních 7 dní)
  let consecutiveDays = 0;
  let cleanDays = 0;
  for (let i = 0; i < 7; i++) {
    const s = t0 - i * 86_400_000;
    const e = s + 86_400_000;
    const hadDose = state.doses.some((d) => d.timestamp >= s && d.timestamp < e);
    if (hadDose) {
      if (cleanDays === 0) consecutiveDays++;
    } else {
      if (consecutiveDays === 0) cleanDays++;
    }
  }
  if (consecutiveDays >= 7) score -= pStreak;
  else if (consecutiveDays >= 4) score -= Math.round(pStreak * 0.5);
  if (cleanDays > 0) score += cleanDays * recPerDay;

  return clamp(Math.round(score), 10, 100);
}

/**
 * Chytrý vícefaktorový model zátěže receptorů a tolerance.
 * Kombinuje:
 * 1) Exponenciálně váženou chronickou expozici MIT + 7-OH (s nastavitelným poločasem paměti receptorů)
 * 2) Akutní plazmatickou obsazenost receptorů (Michaelis-Menten / Hill saturace)
 * 3) Kvalitu rozestupů a penalizaci za redosing v době vrcholu plazmatické koncentrace
 * 4) Noční regenerační okno (washout >= 11h) a rotaci odrůd (Shannonova entropie)
 * 5) Kontinuální sérii dnů vs. čisté dny a aktivní T-Break
 */
export function calcSmartReceptorAnalysis(
  state: Pick<AppState, 'doses' | 'settings'>,
  targetTs = Date.now()
): ReceptorToleranceAnalysis {
  const st = state.settings;
  const mode: CalculationMode = st.toleranceModelMode || 'smart';
  const dayStartHour = st.dayStartHour || 0;
  const t0 = startOfDay(targetTs, dayStartHour);

  const windowDays = clamp(st.toleranceWindowDays || 14, 3, 60);
  const halfLifeDays = clamp(st.toleranceDecayHalfLifeDays || 4.5, 1, 30);
  const sevenOhMult = clamp(st.toleranceSevenOhMultiplier ?? 12, 1, 50);
  const spacingBonusMax = clamp(st.toleranceSpacingBonusPct ?? 12, 0, 30);
  const rotationBonusMax = clamp(st.toleranceRotationBonusPct ?? 8, 0, 25);
  const baselineG =
    (st.toleranceBaselineG && st.toleranceBaselineG > 0 ? st.toleranceBaselineG : st.dailyLimitG) ||
    10;

  const pLimit = st.tolerancePenaltyLimit ?? 30;
  const pInt = st.tolerancePenaltyInterval ?? 35;
  const pStreak = st.toleranceConsecutiveDaysPenalty ?? 15;
  const recPerDay = st.toleranceRecoveryPerDay ?? 15;

  const historyDoses = state.doses
    .filter((d) => d.timestamp <= targetTs)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Reference alkaloid content of 1 standard gram
  const refMitPct = st.defaultMitPct || 1.45;
  const refSevenOhPct = st.defaultSevenOhPct || 0.025;
  const refEqMgPerG = refMitPct * 10 + refSevenOhPct * 10 * sevenOhMult;

  // 1) Rolling exponentially weighted daily equivalent intake
  let weightedEqGSum = 0;
  let weightedRawGSum = 0;
  let weightTotal = 0;
  let consecutiveActiveDays = 0;
  let streakBroken = false;
  let leadingCleanDays = 0;
  let cleanStreakBroken = false;
  let cleanDaysInWindow = 0;

  const strainWeights: Record<string, number> = {};

  for (let i = 0; i < windowDays; i++) {
    const ds = t0 - i * 86_400_000;
    const de = ds + 86_400_000;
    const dayDoses = historyDoses.filter((d) => d.timestamp >= ds && d.timestamp < de);
    const dayRawG = dayDoses.reduce((a, d) => a + d.amountG, 0);

    let dayEqG = 0;
    dayDoses.forEach((d) => {
      const mitMg = d.mitMg !== undefined ? d.mitMg : d.amountG * (d.mitPct || refMitPct) * 10;
      const sevenOhMg =
        d.sevenOhMg !== undefined ? d.sevenOhMg : d.amountG * (d.sevenOhPct || refSevenOhPct) * 10;
      const eqMg = mitMg + sevenOhMg * sevenOhMult;
      const eqG = refEqMgPerG > 0 ? eqMg / refEqMgPerG : d.amountG;
      dayEqG += eqG;

      const wDose = Math.exp((-i * Math.LN2) / halfLifeDays);
      const sid = d.strainId || d.strainName || 'unknown';
      strainWeights[sid] = (strainWeights[sid] || 0) + d.amountG * wDose;
    });

    const w = Math.exp((-i * Math.LN2) / halfLifeDays);
    weightedRawGSum += dayRawG * w;
    weightedEqGSum += dayEqG * w;
    weightTotal += w;

    if (dayDoses.length > 0) {
      cleanStreakBroken = true;
      if (!streakBroken) consecutiveActiveDays++;
    } else {
      streakBroken = true;
      cleanDaysInWindow++;
      if (!cleanStreakBroken) leadingCleanDays++;
    }
  }

  const weightedDailyRawG = weightTotal > 0 ? r2(weightedRawGSum / weightTotal) : 0;
  const weightedDailyEqG = weightTotal > 0 ? r2(weightedEqGSum / weightTotal) : 0;

  // Volume penalty based on weighted daily intake vs baseline
  const loadRatio = baselineG > 0 ? weightedDailyRawG / baselineG : 0;
  const eqLoadRatio = baselineG > 0 ? weightedDailyEqG / baselineG : 0;

  // Non-linear saturation curve for volume penalty
  const rawVolumePen = clamp(Math.round(pLimit * Math.pow(loadRatio, 1.15)), 0, Math.round(pLimit * 1.45));
  const eqVolumePen = clamp(Math.round(pLimit * Math.pow(eqLoadRatio, 1.15)), 0, Math.round(pLimit * 1.65));
  const volumePenalty = rawVolumePen;
  const alkaloidPotencyPenalty = Math.max(0, eqVolumePen - rawVolumePen);

  // 2) Inter-dose intervals & overnight washout analysis
  let avgIntervalH: number | null = null;
  let overnightGapH: number | null = null;
  let spacingPenalty = 0;
  let overnightBonus = 0;

  if (historyDoses.length >= 2) {
    const intraDayGaps: number[] = [];
    const nightGaps: number[] = [];
    let redoseStackCount = 0;

    for (let i = 1; i < Math.min(historyDoses.length, 14); i++) {
      const gapH = (historyDoses[i - 1].timestamp - historyDoses[i].timestamp) / 3_600_000;
      if (gapH <= 8.5) {
        intraDayGaps.push(gapH);
        if (gapH < 2.2) redoseStackCount += 1.5;
        else if (gapH < 3.2) redoseStackCount += 0.75;
      } else if (gapH <= 30) {
        nightGaps.push(gapH);
      }
    }

    if (intraDayGaps.length > 0) {
      avgIntervalH = r1(intraDayGaps.reduce((a, b) => a + b, 0) / intraDayGaps.length);
      const threshH = st.intervalComplianceThresholdH || 4.0;
      if (avgIntervalH < threshH) {
        const deficitRatio = clamp((threshH - avgIntervalH) / Math.max(1.5, threshH - 1.2), 0, 1.3);
        spacingPenalty = Math.round(pInt * deficitRatio);
      }
      // Extra stacking penalty if multiple rapid redoses occurred
      spacingPenalty = clamp(
        spacingPenalty + Math.round(redoseStackCount * (pInt * 0.12)),
        0,
        Math.round(pInt * 1.35)
      );
    }

    if (nightGaps.length > 0) {
      overnightGapH = r1(nightGaps.reduce((a, b) => a + b, 0) / nightGaps.length);
      const idealFastH = clamp(st.idealFastingWindowH || 12, 8, 20);
      const minFastStart = Math.max(7, idealFastH - 1.5);
      if (overnightGapH >= minFastStart) {
        const nightFactor = clamp((overnightGapH - minFastStart) / 5.5, 0, 1);
        overnightBonus = Math.round(spacingBonusMax * 0.6 * nightFactor);
      }
    }

    // Bonus for disciplined daytime spacing
    if (avgIntervalH !== null && avgIntervalH >= (st.intervalComplianceThresholdH || 4.0)) {
      const bonusFactor = clamp((avgIntervalH - (st.intervalComplianceThresholdH || 4.0) + 1) / 3, 0, 1);
      overnightBonus += Math.round(spacingBonusMax * 0.4 * bonusFactor);
    }
  }

  // 3) Streak penalty & Clean days recovery
  const streakFactor = clamp(consecutiveActiveDays / 10, 0, 1.35);
  const streakPenalty =
    consecutiveActiveDays >= 2 ? Math.round(pStreak * Math.pow(streakFactor, 1.1)) : 0;

  let cleanDaysRecovery = Math.round(leadingCleanDays * recPerDay * 0.85);
  if (st.tbreakActive && st.tbreakStartedAt && st.tbreakStartedAt < targetTs) {
    const tbHours = (targetTs - st.tbreakStartedAt) / 3_600_000;
    const tbBonus = Math.round((tbHours / 24) * recPerDay * 0.5);
    cleanDaysRecovery = Math.max(cleanDaysRecovery, tbBonus);
  }

  // 4) Strain rotation bonus (Shannon entropy over weighted window)
  let rotationBonus = 0;
  const strainEntries = Object.values(strainWeights);
  const totalStrainWeight = strainEntries.reduce((a, b) => a + b, 0);
  if (strainEntries.length > 1 && totalStrainWeight > 0) {
    let H = 0;
    strainEntries.forEach((w) => {
      const p = w / totalStrainWeight;
      if (p > 0) H -= p * Math.log(p);
    });
    const normH = clamp(H / Math.log(Math.max(3, strainEntries.length)), 0, 1);
    rotationBonus = Math.round(rotationBonusMax * normH);
  }

  // 5) Acute plasma occupancy (Hill equation with configurable EC50 and Hill coefficient)
  const activeMitMg = calcActiveMitAtTime(state.doses, st, targetTs);
  const baseEc50 = st.acuteHillMidpointMg && st.acuteHillMidpointMg > 0
    ? st.acuteHillMidpointMg
    : Math.max(20, (st.bodyWeightKg || 75) * 0.48);
  const hillN = clamp(st.acuteHillSlope || 1.0, 0.5, 3.0);
  const mitPow = Math.pow(Math.max(0, activeMitMg), hillN);
  const ec50Pow = Math.pow(Math.max(5, baseEc50), hillN);
  const acuteOccupancyPct = clamp(
    Math.round((mitPow / (mitPow + ec50Pow)) * 100),
    0,
    100
  );

  // Combine into Smart Sensitivity Score vs Classic Score
  const rawSmartScore =
    100 -
    volumePenalty -
    alkaloidPotencyPenalty -
    spacingPenalty -
    streakPenalty +
    overnightBonus +
    rotationBonus +
    cleanDaysRecovery -
    Math.round(acuteOccupancyPct * 0.12);

  const smartSensitivityScore = clamp(Math.round(rawSmartScore), 10, 100);
  const classicSensitivityScore = calcClassicReceptorScore(state, targetTs);

  const sensitivityScore = mode === 'smart' ? smartSensitivityScore : classicSensitivityScore;

  // Chronic fatigue & overall receptor load
  const chronicFatiguePct = clamp(
    Math.round(volumePenalty + alkaloidPotencyPenalty + spacingPenalty * 0.8 + streakPenalty - overnightBonus - rotationBonus - cleanDaysRecovery * 0.7),
    0,
    100
  );
  const acuteW = clamp(st.toleranceAcuteWeightPct ?? 35, 10, 80) / 100;
  const chronicW = 1 - acuteW;
  const receptorLoadPct = clamp(
    Math.round(chronicFatiguePct * chronicW + acuteOccupancyPct * acuteW),
    0,
    100
  );

  // Tolerance Index (inverse of sensitivity scaled 0-90%)
  const toleranceIndex = clamp(100 - sensitivityScore, 0, 90);

  // Effective subjective potency of a standard dose (100% when sensitivity=100%, down to ~45% at high tolerance)
  const effectivePotencyPct = clamp(Math.round(45 + 0.55 * sensitivityScore), 45, 100);
  const equivalentDoseFor2g = r2(2.0 * (100 / effectivePotencyPct));

  // Washout time until active MIT drops below threshold (default 5 mg)
  const washoutThreshMg = clamp(st.acuteWashoutThresholdMg ?? 5, 1, 25);
  let hoursToAcuteWashout = 0;
  if (activeMitMg > washoutThreshMg) {
    hoursToAcuteWashout = 96;
    for (let h = 0.5; h <= 120; h += 0.5) {
      if (calcActiveMitAtTime(state.doses, st, targetTs + h * 3_600_000) <= washoutThreshMg) {
        hoursToAcuteWashout = r1(h);
        break;
      }
    }
  }

  const effRecRate = Math.max(3, recPerDay);
  const daysTo80Pct =
    sensitivityScore >= 80 ? 0 : Math.ceil((80 - sensitivityScore) / effRecRate);
  const daysTo90Pct =
    sensitivityScore >= 90 ? 0 : Math.ceil((90 - sensitivityScore) / effRecRate);

  let statusLabel = 'Vysoká citlivost (Optimum)';
  let statusCls: 'good' | 'warn' | 'danger' = 'good';
  if (sensitivityScore < 50) {
    statusLabel = 'Vysoká zátěž receptorů';
    statusCls = 'danger';
  } else if (sensitivityScore < 75) {
    statusLabel = 'Střední adaptace (Tolerance)';
    statusCls = 'warn';
  }

  return {
    mode,
    sensitivityScore,
    receptorLoadPct,
    toleranceIndex,
    effectivePotencyPct,
    equivalentDoseFor2g,
    activeMitMg,
    acuteOccupancyPct,
    chronicFatiguePct,
    weightedDailyEqG,
    avgIntervalH,
    overnightGapH,
    consecutiveActiveDays,
    cleanDaysInWindow,
    daysTo80Pct,
    daysTo90Pct,
    hoursToAcuteWashout,
    statusLabel,
    statusCls,
    components: {
      volumePenalty,
      alkaloidPotencyPenalty,
      spacingPenalty,
      streakPenalty,
      overnightBonus,
      rotationBonus,
      cleanDaysRecovery,
    },
  };
}

export function calcReceptorSensitivityScore(
  state: Pick<AppState, 'doses' | 'settings'>,
  targetTs = Date.now()
): number {
  const mode = state.settings?.toleranceModelMode || 'smart';
  if (mode === 'classic') {
    return calcClassicReceptorScore(state, targetTs);
  }
  return calcSmartReceptorAnalysis(state, targetTs).sensitivityScore;
}

export function calcDailyToleranceHistory(
  state: Pick<AppState, 'doses' | 'settings'>,
  days: number,
  now = Date.now()
): Array<{ ts: number; score: number }> {
  const dayStartHour = state.settings.dayStartHour || 0;
  const t0 = startOfToday(dayStartHour, now);
  const res: Array<{ ts: number; score: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = t0 - i * 86_400_000;
    const noonTs = dayStart + 12 * 3_600_000;
    res.push({
      ts: dayStart,
      score: calcReceptorSensitivityScore(state, Math.min(now, noonTs)),
    });
  }
  return res;
}
