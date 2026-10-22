import {
  AnalyticsContext,
  AnalyticsPeriod,
  AppState,
  DailyAnalyticsEntry,
  Dose,
  DoseDistributionResult,
  Settings,
  Strain,
  StrainPartSummary,
} from '../types';
import { dayKey, startOfDay, startOfToday } from './date';
import { clamp, r1, r2 } from './format';
import { calcActiveMitAtTime } from './pharmacokinetics';
import { calcSmartStockForecast, getTotalStockG } from './stock';
import { calcDailyToleranceHistory, calcReceptorSensitivityScore } from './tolerance';

export function calcDoseDistribution(doses: Dose[]): DoseDistributionResult {
  const bins = [
    { label: '< 1.5 g', color: 'var(--cyan)', count: 0, pct: 0 },
    { label: '1.5 – 2.4 g', color: 'var(--accent)', count: 0, pct: 0 },
    { label: '2.5 – 3.4 g', color: '#ffcc00', count: 0, pct: 0 },
    { label: '3.5 – 4.9 g', color: 'var(--warning)', count: 0, pct: 0 },
    { label: '≥ 5.0 g', color: 'var(--danger)', count: 0, pct: 0 },
  ];
  const total = doses.length;
  if (total === 0) {
    return { bins, total: 0, median: 0, mode: 0, stdDev: 0, mean: 0 };
  }

  const amounts = doses.map((d) => d.amountG).sort((a, b) => a - b);
  let sum = 0;
  const freq: Record<string, number> = {};

  doses.forEach((d) => {
    const g = d.amountG;
    sum += g;
    if (g < 1.5) bins[0].count++;
    else if (g < 2.5) bins[1].count++;
    else if (g < 3.5) bins[2].count++;
    else if (g < 5.0) bins[3].count++;
    else bins[4].count++;

    const k = String(r1(g));
    freq[k] = (freq[k] || 0) + 1;
  });

  bins.forEach((b) => {
    b.pct = Math.round((b.count / total) * 100);
  });

  const mean = r2(sum / total);
  const mid = Math.floor(total / 2);
  const median = r2(total % 2 === 0 ? (amounts[mid - 1] + amounts[mid]) / 2 : amounts[mid]);

  let mode = amounts[0];
  let maxFreq = 0;
  Object.entries(freq).forEach(([k, cnt]) => {
    if (cnt > maxFreq) {
      maxFreq = cnt;
      mode = parseFloat(k);
    }
  });

  const variance = amounts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / total;
  const stdDev = r2(Math.sqrt(variance));

  return { bins, total, median, mode: r2(mode), stdDev, mean };
}

export interface DailyIntervalEntry {
  ts: number;
  dayKey: string;
  avgH: number | null;
  minH: number | null;
  maxH: number | null;
  overnightH: number | null;
  compliancePct: number | null;
  intervalsCount: number;
}

export interface IntervalHistoryResult {
  dailyHistory: DailyIntervalEntry[];
  stats: {
    avgGapH: number | null;
    minGapH: number | null;
    maxGapH: number | null;
    medianGapH: number | null;
    avgNightGapH: number | null;
    compliancePct: number;
    totalIntervals: number;
    threshH: number;
  };
}

export function calcIntervalHistory(
  doses: Dose[],
  days: number,
  settings: Pick<Settings, 'dayStartHour' | 'intervalComplianceThresholdH'>,
  now = Date.now()
): IntervalHistoryResult {
  const dayStartHour = settings.dayStartHour || 0;
  const threshH = settings.intervalComplianceThresholdH || 4.0;
  const t0 = startOfToday(dayStartHour, now);
  const sortedAll = [...doses].sort((a, b) => a.timestamp - b.timestamp);

  const dailyHistory: DailyIntervalEntry[] = [];
  const allGaps: number[] = [];
  const nightGaps: number[] = [];
  let compliantCount = 0;

  for (let i = days - 1; i >= 0; i--) {
    const ds = t0 - i * 86400000;
    const de = ds + 86400000;
    const dk = dayKey(ds, dayStartHour);
    const dayDoses = sortedAll.filter((d) => d.timestamp >= ds && d.timestamp < de);

    const prevDoses = sortedAll.filter((d) => d.timestamp < ds);
    const lastPrev = prevDoses.length ? prevDoses[prevDoses.length - 1] : null;
    let overnightH: number | null = null;
    if (lastPrev && dayDoses.length > 0) {
      const gap = (dayDoses[0].timestamp - lastPrev.timestamp) / 3600000;
      if (gap <= 36) {
        overnightH = r1(gap);
        nightGaps.push(overnightH);
      }
    }

    const dayGaps: number[] = [];
    for (let j = 1; j < dayDoses.length; j++) {
      const gapH = (dayDoses[j].timestamp - dayDoses[j - 1].timestamp) / 3600000;
      dayGaps.push(r2(gapH));
      allGaps.push(gapH);
      if (gapH >= threshH) compliantCount++;
    }

    const avgH = dayGaps.length ? r1(dayGaps.reduce((a, b) => a + b, 0) / dayGaps.length) : null;
    const minH = dayGaps.length ? r1(Math.min(...dayGaps)) : null;
    const maxH = dayGaps.length ? r1(Math.max(...dayGaps)) : null;
    const dayComp = dayGaps.length
      ? Math.round((dayGaps.filter((g) => g >= threshH).length / dayGaps.length) * 100)
      : null;

    dailyHistory.push({
      ts: ds,
      dayKey: dk,
      avgH,
      minH,
      maxH,
      overnightH,
      compliancePct: dayComp,
      intervalsCount: dayGaps.length,
    });
  }

  const sortedGaps = [...allGaps].sort((a, b) => a - b);
  const totalIntervals = allGaps.length;
  const avgGapH = totalIntervals ? r1(allGaps.reduce((a, b) => a + b, 0) / totalIntervals) : null;
  const minGapH = totalIntervals ? r1(sortedGaps[0]) : null;
  const maxGapH = totalIntervals ? r1(sortedGaps[totalIntervals - 1]) : null;
  const mid = Math.floor(totalIntervals / 2);
  const medianGapH = totalIntervals
    ? r1(totalIntervals % 2 === 0 ? (sortedGaps[mid - 1] + sortedGaps[mid]) / 2 : sortedGaps[mid])
    : null;
  const avgNightGapH = nightGaps.length
    ? r1(nightGaps.reduce((a, b) => a + b, 0) / nightGaps.length)
    : null;
  const compliancePct = totalIntervals ? Math.round((compliantCount / totalIntervals) * 100) : 100;

  return {
    dailyHistory,
    stats: {
      avgGapH,
      minGapH,
      maxGapH,
      medianGapH,
      avgNightGapH,
      compliancePct,
      totalIntervals,
      threshH,
    },
  };
}

export function calcContinuousPlasmaCurve(
  doses: Dose[],
  days: number,
  settings: Pick<Settings, 'mitHalfLifeAlphaH' | 'mitHalfLifeBetaH' | 'mitTMaxH'>,
  now = Date.now()
): {
  points: Array<{ ts: number; mg: number }>;
  maxMg: number;
  avgMg: number;
  currentMg: number;
} {
  const totalHours = Math.min(days * 24, 24 * 30);
  const stepH = Math.max(1, Math.round(totalHours / 55));
  const startTs = now - totalHours * 3600000;
  const points: Array<{ ts: number; mg: number }> = [];

  for (let ts = startTs; ts <= now; ts += stepH * 3600000) {
    points.push({ ts, mg: calcActiveMitAtTime(doses, settings, ts) });
  }
  const currentMg = calcActiveMitAtTime(doses, settings, now);
  if (!points.length || points[points.length - 1].ts < now) {
    points.push({ ts: now, mg: currentMg });
  }

  const maxMg = points.length ? r2(Math.max(...points.map((p) => p.mg))) : 0;
  const avgMg = points.length
    ? r2(points.reduce((a, p) => a + p.mg, 0) / points.length)
    : 0;

  return { points, maxMg, avgMg, currentMg };
}

export function calcWeeklyTimeMatrix(doses: Dose[]): {
  matrix: number[][];
  maxCount: number;
  totalCount: number;
} {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxCount = 0;

  doses.forEach((d) => {
    const dt = new Date(d.timestamp);
    const wd = (dt.getDay() + 6) % 7; // Po=0..Ne=6
    const hr = dt.getHours();
    matrix[wd][hr]++;
    if (matrix[wd][hr] > maxCount) maxCount = matrix[wd][hr];
  });

  return { matrix, maxCount, totalCount: doses.length };
}

export function calcStrainHistory(
  doses: Dose[],
  strains: Strain[],
  days: number,
  dayStartHour = 0,
  now = Date.now()
): {
  daily: Array<{ ts: number; dayKey: string; totalG: number; byStrain: Record<string, number> }>;
  activeStrains: Array<{ id: string; name: string; color: string; totalG: number; count: number; avgRating: number | null }>;
} {
  const t0 = startOfToday(dayStartHour, now);
  const daily: Array<{ ts: number; dayKey: string; totalG: number; byStrain: Record<string, number> }> = [];
  const strainTotals: Record<string, { id: string; name: string; color: string; totalG: number; count: number; ratingSum: number; ratingCnt: number }> = {};

  for (let i = days - 1; i >= 0; i--) {
    const ds = t0 - i * 86400000;
    const de = ds + 86400000;
    const dk = dayKey(ds, dayStartHour);
    const byStrain: Record<string, number> = {};
    let totalG = 0;

    doses.forEach((d) => {
      if (d.timestamp >= ds && d.timestamp < de) {
        const sid = d.strainId || 'unknown';
        byStrain[sid] = r2((byStrain[sid] || 0) + d.amountG);
        totalG = r2(totalG + d.amountG);

        if (!strainTotals[sid]) {
          const st = strains.find((s) => s.id === sid);
          strainTotals[sid] = {
            id: sid,
            name: st?.name || d.strainName || 'Neznámý',
            color: st?.color || d.strainColor || '#30D158',
            totalG: 0,
            count: 0,
            ratingSum: 0,
            ratingCnt: 0,
          };
        }
        strainTotals[sid].totalG = r2(strainTotals[sid].totalG + d.amountG);
        strainTotals[sid].count++;
        if (d.rating > 0) {
          strainTotals[sid].ratingSum += d.rating;
          strainTotals[sid].ratingCnt++;
        }
      }
    });

    daily.push({ ts: ds, dayKey: dk, totalG, byStrain });
  }

  const activeStrains = Object.values(strainTotals)
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      totalG: s.totalG,
      count: s.count,
      avgRating: s.ratingCnt > 0 ? r1(s.ratingSum / s.ratingCnt) : null,
    }))
    .sort((a, b) => b.totalG - a.totalG);

  return { daily, activeStrains };
}

export function calcStrainDiversityIndex(
  doses: Dose[],
  threshold = 3
): {
  pct: number;
  shannonH: number;
  streak: number;
  lastStrainName: string;
  statusLabel: string;
  statusCls: 'opt' | 'mid' | 'danger';
  topStrainName: string;
  topStrainPct: number;
  activeStrainsCount: number;
} {
  if (!doses.length) {
    return {
      pct: 100,
      shannonH: 0,
      streak: 0,
      lastStrainName: '—',
      statusLabel: 'Výborná rotace',
      statusCls: 'opt',
      topStrainName: '—',
      topStrainPct: 0,
      activeStrainsCount: 0,
    };
  }

  const sorted = [...doses].sort((a, b) => b.timestamp - a.timestamp);
  const lastStrainId = sorted[0].strainId;
  const lastStrainName = sorted[0].strainName || '—';
  let streak = 0;
  for (const d of sorted) {
    if (d.strainId === lastStrainId) streak++;
    else break;
  }

  const byStrain: Record<string, { name: string; g: number }> = {};
  let totalG = 0;
  doses.forEach((d) => {
    const sid = d.strainId || d.strainName;
    if (!byStrain[sid]) byStrain[sid] = { name: d.strainName || 'Neznámý', g: 0 };
    byStrain[sid].g += d.amountG;
    totalG += d.amountG;
  });

  const parts = Object.values(byStrain).sort((a, b) => b.g - a.g);
  const activeStrainsCount = parts.length;
  const topStrainName = parts[0]?.name || '—';
  const topStrainPct = totalG > 0 ? Math.round((parts[0].g / totalG) * 100) : 0;

  let H = 0;
  if (totalG > 0 && activeStrainsCount > 1) {
    parts.forEach((p) => {
      const pi = p.g / totalG;
      if (pi > 0) H -= pi * Math.log(pi);
    });
  }
  const maxH = Math.log(Math.max(2, activeStrainsCount));
  const pct = activeStrainsCount <= 1 ? 15 : clamp(Math.round((H / maxH) * 100), 0, 100);

  let statusLabel = 'Výborná rotace';
  let statusCls: 'opt' | 'mid' | 'danger' = 'opt';
  if (pct < 35 || streak >= threshold + 1) {
    statusLabel = 'Nízká rotace (riziko)';
    statusCls = 'danger';
  } else if (pct < 70 || streak >= threshold) {
    statusLabel = 'Střední rotace';
    statusCls = 'mid';
  }

  return {
    pct,
    shannonH: r2(H),
    streak,
    lastStrainName,
    statusLabel,
    statusCls,
    topStrainName,
    topStrainPct,
    activeStrainsCount,
  };
}

export function calcTaperingTrajectory(
  days: number,
  startG: number,
  targetG: number,
  reductionPct: number,
  dailyActual: DailyAnalyticsEntry[],
  pricePerG = 8.0
): {
  trajectory: Array<{ ts: number; plannedG: number; actualG: number }>;
  savedG: number;
  savedKc: number;
  annualSavingsG: number;
  annualSavingsKc: number;
} {
  const weeklyFactor = 1 - clamp(reductionPct || 10, 1, 50) / 100;
  const trajectory: Array<{ ts: number; plannedG: number; actualG: number }> = [];
  let savedG = 0;

  dailyActual.slice(-days).forEach((d, idx) => {
    const weeksElapsed = idx / 7;
    const rawPlan = startG * Math.pow(weeklyFactor, weeksElapsed);
    const plannedG = r2(Math.max(targetG, rawPlan));
    trajectory.push({
      ts: d.ts,
      plannedG,
      actualG: d.g,
    });
    savedG += Math.max(0, startG - d.g);
  });

  savedG = r1(savedG);
  const savedKc = r1(savedG * pricePerG);
  const dailySavedAtTarget = Math.max(0, startG - targetG);
  const annualSavingsG = Math.round(dailySavedAtTarget * 365);
  const annualSavingsKc = Math.round(annualSavingsG * pricePerG);

  return {
    trajectory,
    savedG,
    savedKc,
    annualSavingsG,
    annualSavingsKc,
  };
}

export function getAnalyticsContext(
  state: AppState,
  anaPeriod: AnalyticsPeriod = 30,
  now = Date.now()
): AnalyticsContext {
  const st = state.settings;
  const dayStartHour = st.dayStartHour || 0;
  const t0 = startOfToday(dayStartHour, now);
  const curEnd = t0 + 86400000;

  let days: number;
  if (anaPeriod === 'all') {
    if (state.doses.length > 0) {
      const oldest = Math.min(...state.doses.map((d) => d.timestamp));
      const diffDays = Math.ceil((curEnd - startOfDay(oldest, dayStartHour)) / 86400000);
      days = Math.max(7, diffDays);
    } else {
      days = 30;
    }
  } else {
    days = anaPeriod;
  }

  const curStart = curEnd - days * 86400000;
  const priorStart = curStart - days * 86400000;

  const curDoses = state.doses.filter((d) => d.timestamp >= curStart && d.timestamp < curEnd);
  const priorDoses = state.doses.filter((d) => d.timestamp >= priorStart && d.timestamp < curStart);

  const curG = r2(curDoses.reduce((a, d) => a + d.amountG, 0));
  const priorG = r2(priorDoses.reduce((a, d) => a + d.amountG, 0));
  const curMit = r2(curDoses.reduce((a, d) => a + (d.mitMg || 0), 0));
  const priorMit = r2(priorDoses.reduce((a, d) => a + (d.mitMg || 0), 0));
  const cur7Oh = r2(curDoses.reduce((a, d) => a + (d.sevenOhMg || 0), 0));
  const prior7Oh = r2(priorDoses.reduce((a, d) => a + (d.sevenOhMg || 0), 0));
  const curKratomCost = r2(curDoses.reduce((a, d) => a + (d.cost || 0), 0));
  const curBevCost = r2(curDoses.reduce((a, d) => a + (d.beverageCost || 0), 0));
  const curCost = r2(curKratomCost + curBevCost);
  const priorCost = r2(
    priorDoses.reduce((a, d) => a + (d.cost || 0) + (d.beverageCost || 0), 0)
  );

  const curAvgG = r2(curG / days);
  const priorAvgG = r2(priorG / days);
  const curAvgDoseG = curDoses.length ? r2(curG / curDoses.length) : 0;
  const priorAvgDoseG = priorDoses.length ? r2(priorG / priorDoses.length) : 0;

  const dailyMapEntries: Record<string, DailyAnalyticsEntry> = {};
  for (let i = days - 1; i >= 0; i--) {
    const ds = t0 - i * 86400000;
    const dk = dayKey(ds, dayStartHour);
    dailyMapEntries[dk] = {
      ts: ds,
      dayKey: dk,
      g: 0,
      mitMg: 0,
      sevenOhMg: 0,
      kratomCost: 0,
      bevCost: 0,
      dosesCount: 0,
    };
  }

  curDoses.forEach((d) => {
    const dk = dayKey(d.timestamp, dayStartHour);
    const entry = dailyMapEntries[dk];
    if (entry) {
      entry.g = r2(entry.g + d.amountG);
      entry.mitMg = r2(entry.mitMg + (d.mitMg || 0));
      entry.sevenOhMg = r2(entry.sevenOhMg + (d.sevenOhMg || 0));
      entry.kratomCost = r2(entry.kratomCost + (d.cost || 0));
      entry.bevCost = r2(entry.bevCost + (d.beverageCost || 0));
      entry.dosesCount++;
    }
  });

  const daily = Object.values(dailyMapEntries).sort((a, b) => a.ts - b.ts);
  const peakDayG = daily.length ? r2(Math.max(...daily.map((x) => x.g))) : 0;
  const peakDayMit = daily.length ? r2(Math.max(...daily.map((x) => x.mitMg))) : 0;
  const activeDaysCount = daily.filter((x) => x.dosesCount > 0).length;

  const last7Days = daily.slice(-7);
  const last7AvgG = last7Days.length
    ? r2(last7Days.reduce((a, x) => a + x.g, 0) / last7Days.length)
    : 0;
  const ma7vsAvgDiff = curAvgG > 0 ? Math.round(((last7AvgG - curAvgG) / curAvgG) * 100) : 0;

  const stockForecast = calcSmartStockForecast(
    state.packages,
    state.strains,
    state.doses,
    st,
    now
  );
  const stockTotalG = stockForecast.totalAllStockG;
  const runwayDays =
    stockForecast.totalRunwayDays !== null ? stockForecast.totalRunwayDays : '∞';

  const projAnnualKg = r2((curAvgG * 365) / 1000);
  const projAnnualKc = Math.round((curCost / days) * 365);
  const costPerG = curG > 0 ? r2(curKratomCost / curG) : st.defaultPricePerG || 8;
  const costPerDose = curDoses.length > 0 ? r1(curCost / curDoses.length) : 0;
  const mgPerKg = r2(curMit / days / Math.max(30, st.bodyWeightKg || 75));

  const toleranceHistory = calcDailyToleranceHistory(state, days, now);
  const curTolScore = calcReceptorSensitivityScore(state, now);
  const recPerDay = st.toleranceRecoveryPerDay || 15;
  const daysTo90 = curTolScore >= 90 ? 0 : Math.ceil((90 - curTolScore) / Math.max(1, recPerDay));

  const doseDist = calcDoseDistribution(curDoses);

  const strainAcc: Record<
    string,
    { id: string; name: string; color: string; g: number; cost: number; count: number; rSum: number; rCnt: number }
  > = {};
  curDoses.forEach((d) => {
    const sid = d.strainId || d.strainName;
    const sObj = state.strains.find((s) => s.id === d.strainId);
    if (!strainAcc[sid]) {
      strainAcc[sid] = {
        id: sid,
        name: sObj?.name || d.strainName || 'Neznámý',
        color: sObj?.color || d.strainColor || '#30D158',
        g: 0,
        cost: 0,
        count: 0,
        rSum: 0,
        rCnt: 0,
      };
    }
    strainAcc[sid].g = r2(strainAcc[sid].g + d.amountG);
    strainAcc[sid].cost = r2(strainAcc[sid].cost + (d.cost || 0));
    strainAcc[sid].count++;
    if (d.rating > 0) {
      strainAcc[sid].rSum += d.rating;
      strainAcc[sid].rCnt++;
    }
  });

  const strainParts: StrainPartSummary[] = Object.values(strainAcc)
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      g: s.g,
      cost: s.cost,
      count: s.count,
      avgRating: s.rCnt > 0 ? r1(s.rSum / s.rCnt) : null,
    }))
    .sort((a, b) => b.g - a.g);

  const sortedCurDoses = [...curDoses].sort((a, b) => a.timestamp - b.timestamp);
  const cooldownGaps: number[] = [];
  for (let i = 1; i < sortedCurDoses.length; i++) {
    const gapH = (sortedCurDoses[i].timestamp - sortedCurDoses[i - 1].timestamp) / 3600000;
    if (gapH <= 24) cooldownGaps.push(gapH);
  }
  const avgCooldownH = cooldownGaps.length
    ? r1(cooldownGaps.reduce((a, b) => a + b, 0) / cooldownGaps.length)
    : null;

  return {
    days,
    curStart,
    curEnd,
    curDoses,
    priorDoses,
    curG,
    priorG,
    curMit,
    priorMit,
    cur7Oh,
    prior7Oh,
    curCost,
    priorCost,
    curKratomCost,
    curBevCost,
    curAvgG,
    priorAvgG,
    curAvgDoseG,
    priorAvgDoseG,
    daily,
    peakDayG,
    peakDayMit,
    activeDaysCount,
    last7Days,
    last7AvgG,
    ma7vsAvgDiff,
    stockTotalG,
    runwayDays,
    projAnnualKg,
    projAnnualKc,
    costPerG,
    costPerDose,
    mgPerKg,
    toleranceHistory,
    curTolScore,
    recPerDay,
    daysTo90,
    doseDist,
    strainParts,
    sortedCurDoses,
    avgCooldownH,
    st,
    L: st.dailyLimitG || 10,
    hardL: st.dailyHardLimitG || 14,
    B: st.dailyBudgetKc || 150,
  };
}

export interface AdvancedAnalyticsMetrics {
  stabilityIndexPct: number;       // 0-100 % stabilita denních dávek (podle CV%)
  dailyStdDevG: number;            // směrodatná odchylka denní spotřeby
  limitCompliancePct: number;      // % dní v období pod měkkým limitem
  hardLimitBreaches: number;       // počet překročení tvrdého limitu
  weekdayAvgG: number;
  weekendAvgG: number;
  weekendDeltaPct: number;         // rozdíl víkend vs. pracovní dny v %
  avgFirstDoseTime: string;        // např. "09:35"
  avgLastDoseTime: string;         // např. "18:50"
  avgActiveWindowH: number;        // průměrné denní okno užívání (h)
  avgFastingWindowH: number;       // průměrné regenerační okno bez kratomu (h)
  effectiveAlkaloidLoadG: number;  // ekvivalentní gramáž po zohlednění 7-OH potence
  avgDosesPerActiveDay: number;
  strainEfficiencyList: Array<{
    strainId: string;
    name: string;
    color: string;
    totalG: number;
    dosesCount: number;
    avgDoseG: number;
    avgRating: number | null;
    mitPct: number;
    sevenOhPct: number;
    costPerG: number;
    mitPerKc: number;              // mg MIT za 1 Kč
    efficiencyScore: number;       // 0-100 kombinované skóre (spokojenost × MIT / cena)
    stockRemainingG: number;
    runwayDays: number | null;
  }>;
}

export function calcAdvancedAnalyticsMetrics(
  ctx: AnalyticsContext,
  state: Pick<AppState, 'packages' | 'strains' | 'doses' | 'settings'>,
  now = Date.now()
): AdvancedAnalyticsMetrics {
  const { daily, curDoses, st, L, hardL } = ctx;
  const activeDaily = daily.filter((d) => d.dosesCount > 0);
  const meanActiveG =
    activeDaily.length > 0
      ? activeDaily.reduce((a, d) => a + d.g, 0) / activeDaily.length
      : 0;
  const variance =
    activeDaily.length > 1
      ? activeDaily.reduce((acc, d) => acc + Math.pow(d.g - meanActiveG, 2), 0) /
        activeDaily.length
      : 0;
  const dailyStdDevG = r2(Math.sqrt(variance));
  const cv = meanActiveG > 0 ? dailyStdDevG / meanActiveG : 0;
  const stabilityIndexPct = activeDaily.length > 0 ? clamp(Math.round((1 - cv * 0.85) * 100), 10, 100) : 100;

  const daysUnderLimit = daily.filter((d) => d.g <= L).length;
  const limitCompliancePct = daily.length > 0 ? Math.round((daysUnderLimit / daily.length) * 100) : 100;
  const hardLimitBreaches = daily.filter((d) => d.g > hardL).length;

  let wdSum = 0;
  let wdCnt = 0;
  let weSum = 0;
  let weCnt = 0;
  daily.forEach((d) => {
    const dayOfWeek = new Date(d.ts).getDay(); // 0=Ne, 6=So
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weSum += d.g;
      weCnt++;
    } else {
      wdSum += d.g;
      wdCnt++;
    }
  });
  const weekdayAvgG = wdCnt > 0 ? r2(wdSum / wdCnt) : 0;
  const weekendAvgG = weCnt > 0 ? r2(weSum / weCnt) : 0;
  const weekendDeltaPct =
    weekdayAvgG > 0 ? Math.round(((weekendAvgG - weekdayAvgG) / weekdayAvgG) * 100) : 0;

  // First & last dose of each active day
  const dayStartHour = st.dayStartHour || 0;
  const byDayDoses: Record<string, Dose[]> = {};
  curDoses.forEach((d) => {
    const dk = dayKey(d.timestamp, dayStartHour);
    if (!byDayDoses[dk]) byDayDoses[dk] = [];
    byDayDoses[dk].push(d);
  });

  let firstMinSum = 0;
  let lastMinSum = 0;
  let windowHSum = 0;
  let dayWithDosesCnt = 0;

  Object.values(byDayDoses).forEach((dList) => {
    if (!dList.length) return;
    const sorted = [...dList].sort((a, b) => a.timestamp - b.timestamp);
    const firstDt = new Date(sorted[0].timestamp);
    const lastDt = new Date(sorted[sorted.length - 1].timestamp);
    let fMin = firstDt.getHours() * 60 + firstDt.getMinutes();
    if (firstDt.getHours() < dayStartHour) fMin += 24 * 60;
    let lMin = lastDt.getHours() * 60 + lastDt.getMinutes();
    if (lastDt.getHours() < dayStartHour) lMin += 24 * 60;

    firstMinSum += fMin;
    lastMinSum += lMin;
    windowHSum += Math.max(0, (sorted[sorted.length - 1].timestamp - sorted[0].timestamp) / 3_600_000);
    dayWithDosesCnt++;
  });

  const fmtMinOfDay = (m: number) => {
    const norm = ((Math.round(m) % 1440) + 1440) % 1440;
    const hh = String(Math.floor(norm / 60)).padStart(2, '0');
    const mm = String(norm % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const avgFirstDoseTime = dayWithDosesCnt > 0 ? fmtMinOfDay(firstMinSum / dayWithDosesCnt) : '—';
  const avgLastDoseTime = dayWithDosesCnt > 0 ? fmtMinOfDay(lastMinSum / dayWithDosesCnt) : '—';
  const avgActiveWindowH = dayWithDosesCnt > 0 ? r1(windowHSum / dayWithDosesCnt) : 0;
  const avgFastingWindowH = dayWithDosesCnt > 0 ? r1(Math.max(0, 24 - avgActiveWindowH)) : 24;
  const avgDosesPerActiveDay =
    activeDaily.length > 0 ? r1(curDoses.length / activeDaily.length) : 0;

  const mult = st.toleranceSevenOhMultiplier ?? 12;
  const refMit = st.defaultMitPct || 1.45;
  const ref7Oh = st.defaultSevenOhPct || 0.025;
  const refEqPerG = refMit * 10 + ref7Oh * 10 * mult;
  const totalEqMg = ctx.curMit + ctx.cur7Oh * mult;
  const effectiveAlkaloidLoadG = refEqPerG > 0 ? r2(totalEqMg / refEqPerG) : ctx.curG;

  const stockForecast = calcSmartStockForecast(
    state.packages,
    state.strains,
    state.doses,
    st,
    now
  );

  const strainEfficiencyList = ctx.strainParts.map((sp) => {
    const sObj = state.strains.find((s) => s.id === sp.id || s.name === sp.name);
    const sf = stockForecast.strainForecasts.find(
      (f) => f.strainId === sp.id || f.strainName === sp.name
    );
    const mitPct = sObj?.mitPct || st.defaultMitPct || 1.45;
    const sevenOhPct = sObj?.sevenOhPct || st.defaultSevenOhPct || 0.025;
    const costPerG = sp.g > 0 ? r2(sp.cost / sp.g) : sObj?.pricePerG || st.defaultPricePerG || 8;
    const mitPerKc = costPerG > 0 ? r1((mitPct * 10) / costPerG) : 0;
    const ratingFactor = sp.avgRating ? sp.avgRating / 5 : 0.78;
    const rawEff = ratingFactor * 55 + clamp(mitPerKc / 4, 0, 1) * 45;
    const efficiencyScore = clamp(Math.round(rawEff), 15, 100);

    return {
      strainId: sp.id,
      name: sp.name,
      color: sp.color,
      totalG: sp.g,
      dosesCount: sp.count,
      avgDoseG: sp.count > 0 ? r2(sp.g / sp.count) : 0,
      avgRating: sp.avgRating,
      mitPct,
      sevenOhPct,
      costPerG,
      mitPerKc,
      efficiencyScore,
      stockRemainingG: sf?.totalG || 0,
      runwayDays: sf?.parallelRunwayDays ?? sf?.soloRunwayDays ?? null,
    };
  });

  return {
    stabilityIndexPct,
    dailyStdDevG,
    limitCompliancePct,
    hardLimitBreaches,
    weekdayAvgG,
    weekendAvgG,
    weekendDeltaPct,
    avgFirstDoseTime,
    avgLastDoseTime,
    avgActiveWindowH,
    avgFastingWindowH,
    effectiveAlkaloidLoadG,
    avgDosesPerActiveDay,
    strainEfficiencyList,
  };
}

export interface WeekdayProfileEntry {
  dayIndex: number; // 0 = Po .. 6 = Ne
  label: string;
  avgG: number;
  avgCost: number;
  avgDoses: number;
  avgMitMg: number;
  avgRating: number | null;
  daysCount: number;
}

export function calcWeekdayProfile(
  daily: DailyAnalyticsEntry[],
  curDoses: Dose[]
): {
  entries: WeekdayProfileEntry[];
  peakWeekdayLabel: string;
  lowestWeekdayLabel: string;
  maxAvgG: number;
} {
  const labels = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
  const buckets = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    label: labels[i],
    sumG: 0,
    sumCost: 0,
    sumDoses: 0,
    sumMit: 0,
    daysCount: 0,
    ratingSum: 0,
    ratingCnt: 0,
  }));

  daily.forEach((d) => {
    const wd = (new Date(d.ts).getDay() + 6) % 7;
    buckets[wd].sumG += d.g;
    buckets[wd].sumCost += d.kratomCost + d.bevCost;
    buckets[wd].sumDoses += d.dosesCount;
    buckets[wd].sumMit += d.mitMg;
    buckets[wd].daysCount++;
  });

  curDoses.forEach((d) => {
    if (d.rating > 0) {
      const wd = (new Date(d.timestamp).getDay() + 6) % 7;
      buckets[wd].ratingSum += d.rating;
      buckets[wd].ratingCnt++;
    }
  });

  const entries: WeekdayProfileEntry[] = buckets.map((b) => {
    const cnt = Math.max(1, b.daysCount);
    return {
      dayIndex: b.dayIndex,
      label: b.label,
      avgG: r2(b.sumG / cnt),
      avgCost: r1(b.sumCost / cnt),
      avgDoses: r1(b.sumDoses / cnt),
      avgMitMg: r1(b.sumMit / cnt),
      avgRating: b.ratingCnt > 0 ? r1(b.ratingSum / b.ratingCnt) : null,
      daysCount: b.daysCount,
    };
  });

  const sortedByG = [...entries].sort((a, b) => b.avgG - a.avgG);
  const peakWeekdayLabel = sortedByG[0]?.label || '—';
  const lowestWeekdayLabel = sortedByG[sortedByG.length - 1]?.label || '—';
  const maxAvgG = sortedByG[0]?.avgG || 1;

  return { entries, peakWeekdayLabel, lowestWeekdayLabel, maxAvgG };
}

export interface RadarAxisPoint {
  key: string;
  label: string;
  shortLabel: string;
  score: number; // 0-100
  detail: string;
}

export function calcRadarDisciplineProfile(
  ctx: AnalyticsContext,
  state: Pick<AppState, 'doses' | 'waterLogs' | 'packages' | 'strains' | 'settings'>,
  now = Date.now()
): {
  axes: RadarAxisPoint[];
  overallScore: number;
} {
  const adv = calcAdvancedAnalyticsMetrics(ctx, state, now);
  const intHist = calcIntervalHistory(state.doses, ctx.days, ctx.st, now);
  const div = calcStrainDiversityIndex(ctx.curDoses, ctx.st.diversityWarningThreshold || 3);

  const idealFastH = clamp(ctx.st.idealFastingWindowH || 12, 8, 20);
  const nightWashoutScore = clamp(Math.round((adv.avgFastingWindowH / idealFastH) * 100), 15, 100);

  // Hydration balance over last 7 days
  const last7 = ctx.daily.slice(-7);
  const dayStartHour = ctx.st.dayStartHour || 0;
  let waterRatioSum = 0;
  last7.forEach((d) => {
    const ds = d.ts;
    const de = ds + 86400000;
    const dayWater = state.waterLogs
      .filter((w) => w.timestamp >= ds && w.timestamp < de)
      .reduce((a, w) => a + w.amountMl, 0);
    const goal = (ctx.st.dailyWaterGoalMl || 2500) + d.g * (ctx.st.waterPerGramKratomMl || 200);
    waterRatioSum += goal > 0 ? clamp(dayWater / goal, 0, 1.2) : 1;
  });
  const hydrationScore =
    last7.length > 0 ? clamp(Math.round((waterRatioSum / last7.length) * 100), 10, 100) : 85;
  void dayStartHour;

  const axes: RadarAxisPoint[] = [
    {
      key: 'limit',
      label: 'Dodržení limitu',
      shortLabel: 'Limit',
      score: adv.limitCompliancePct,
      detail: `${adv.limitCompliancePct}% dní v limitu`,
    },
    {
      key: 'intervals',
      label: 'Kvalita rozestupů',
      shortLabel: 'Odstupy',
      score: intHist.stats.compliancePct,
      detail: `ø ${intHist.stats.avgGapH ?? '—'}h mezi dávkami`,
    },
    {
      key: 'receptors',
      label: 'Citlivost receptorů',
      shortLabel: 'Receptory',
      score: ctx.curTolScore,
      detail: `skóre ${ctx.curTolScore}%`,
    },
    {
      key: 'rotation',
      label: 'Rotace odrůd',
      shortLabel: 'Rotace',
      score: div.pct,
      detail: `H'=${div.shannonH} (${div.activeStrainsCount} dr.)`,
    },
    {
      key: 'fasting',
      label: 'Noční regenerace',
      shortLabel: 'Noční klid',
      score: nightWashoutScore,
      detail: `ø ${adv.avgFastingWindowH}h bez kratomu`,
    },
    {
      key: 'stability',
      label: 'Stabilita & Hydratace',
      shortLabel: 'Stabilita',
      score: Math.round(adv.stabilityIndexPct * 0.6 + hydrationScore * 0.4),
      detail: `stabilita ${adv.stabilityIndexPct}%`,
    },
  ];

  const overallScore = Math.round(axes.reduce((a, x) => a + x.score, 0) / axes.length);
  return { axes, overallScore };
}

export interface CumulativePoint {
  ts: number;
  dayKey: string;
  cumActualG: number;
  cumBudgetG: number;
  cumCostKc: number;
  dailyG: number;
}

export function calcCumulativeTrajectory(
  daily: DailyAnalyticsEntry[],
  dailyLimitG: number
): {
  points: CumulativePoint[];
  totalActualG: number;
  totalBudgetG: number;
  savedOrExcessG: number; // kladné = ušetřeno oproti limitu, záporné = překročeno
} {
  let cumActualG = 0;
  let cumBudgetG = 0;
  let cumCostKc = 0;
  const points: CumulativePoint[] = daily.map((d) => {
    cumActualG = r2(cumActualG + d.g);
    cumBudgetG = r2(cumBudgetG + dailyLimitG);
    cumCostKc = r1(cumCostKc + d.kratomCost + d.bevCost);
    return {
      ts: d.ts,
      dayKey: d.dayKey,
      cumActualG,
      cumBudgetG,
      cumCostKc,
      dailyG: d.g,
    };
  });

  const savedOrExcessG = r1(cumBudgetG - cumActualG);
  return {
    points,
    totalActualG: cumActualG,
    totalBudgetG: cumBudgetG,
    savedOrExcessG,
  };
}


