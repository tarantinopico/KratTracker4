import { CalculationMode, Dose, EffectType, Package, Settings, Strain } from '../types';
import { dayKey, startOfDay, startOfToday } from './date';
import { clamp, r1, r2 } from './format';

export function dailyMap(doses: Dose[], dayStartHour = 0): Record<string, number> {
  const m: Record<string, number> = {};
  doses.forEach((d) => {
    const k = dayKey(d.timestamp, dayStartHour);
    m[k] = r2((m[k] || 0) + d.amountG);
  });
  return m;
}

export function getTotalStockG(packages: Package[]): number {
  return r2(
    packages
      .filter((p) => p.status !== 'finished')
      .reduce((a, p) => a + Math.max(0, p.remainingWeightG), 0)
  );
}

export function getTotalStockValueKc(packages: Package[]): number {
  return r2(
    packages
      .filter((p) => p.status !== 'finished')
      .reduce((acc, p) => {
        if (p.initialWeightG <= 0) return acc;
        return acc + (Math.max(0, p.remainingWeightG) / p.initialWeightG) * p.costTotal;
      }, 0)
  );
}

export function getActivePackage(packages: Package[], strainId: string): Package | null {
  return packages.find((p) => p.strainId === strainId && p.status === 'active') || null;
}

export function getPackageDoses(doses: Dose[], pkgId: string): Dose[] {
  return doses.filter((d) => d.packageId === pkgId);
}

export interface StrainStockForecast {
  strainId: string;
  strainName: string;
  strainColor: string;
  mitPct: number;
  sevenOhPct: number;
  activeG: number;
  unopenedG: number;
  totalG: number;
  forecastTargetG: number;
  valueKc: number;
  shareOfStockPct: number;
  activePackagesCount: number;
  unopenedPackagesCount: number;
  finishedPackagesCount: number;
  // Consumption & Smart Forecast
  windowConsumedG: number;
  usageSharePct: number;          // % podíl tohoto druhu na spotřebě
  dailyStrainBurnG: number;       // kolik g/den uživatel z tohoto druhu reálně odebírá
  parallelRunwayDays: number | null; // kolik dní vydrží při současném tempu užívání tohoto druhu
  soloRunwayDays: number | null;     // kolik dní vydrží, pokud by uživatel užíval pouze tento druh
  estimatedRunoutTs: number | null;
  isLowStock: boolean;
}

export interface SmartStockForecastResult {
  mode: CalculationMode;
  windowDays: number;
  decayHalfLifeDays: number;
  includeUnopened: boolean;
  activeStockG: number;
  unopenedStockG: number;
  totalAllStockG: number;
  forecastTargetG: number;
  totalValueKc: number;
  avgPricePerG: number;
  activePackagesCount: number;
  unopenedPackagesCount: number;
  finishedPackagesCount: number;
  // Consumption metrics
  simpleDailyAvgG: number;
  weightedDailyBurnG: number;
  effectiveDailyBurnG: number;
  recent7dAvgG: number;
  burnVelocityDeltaPct: number; // kladné = spotřeba zrychluje oproti průměru okna
  dailyCostEstimateKc: number;
  // Runway & ETA
  totalRunwayDays: number | null;
  activeOnlyRunwayDays: number | null;
  estimatedRunoutTs: number | null;
  lowStockStrainsCount: number;
  strainForecasts: StrainStockForecast[];
}

export function calcSmartStockForecast(
  packages: Package[],
  strains: Strain[],
  doses: Dose[],
  settings: Partial<Settings> = {},
  now = Date.now()
): SmartStockForecastResult {
  const mode: CalculationMode = settings.stockForecastMode || 'smart';
  const windowDays = clamp(settings.stockForecastWindowDays || 14, 3, 90);
  const decayHalfLifeDays = clamp(settings.stockDecayHalfLifeDays || 7, 1, 60);
  const includeUnopened = settings.stockIncludeUnopenedInEta ?? true;
  const dayStartHour = settings.dayStartHour || 0;
  const lowStockWarningG = settings.lowStockWarningG ?? 20;
  const lowDaysWarning = settings.stockLowDaysWarning ?? 7;

  const activePackages = packages.filter((p) => p.status === 'active');
  const unopenedPackages = packages.filter((p) => p.status === 'unopened');
  const finishedPackages = packages.filter((p) => p.status === 'finished');

  const activeStockG = r2(
    activePackages.reduce((a, p) => a + Math.max(0, p.remainingWeightG), 0)
  );
  const unopenedStockG = r2(
    unopenedPackages.reduce((a, p) => a + Math.max(0, p.remainingWeightG), 0)
  );
  const totalAllStockG = r2(activeStockG + unopenedStockG);
  const forecastTargetG = includeUnopened ? totalAllStockG : activeStockG;
  const totalValueKc = getTotalStockValueKc(packages);
  const avgPricePerG =
    totalAllStockG > 0 ? r2(totalValueKc / totalAllStockG) : settings.defaultPricePerG || 8;

  // Build daily consumption over windowDays
  const t0 = startOfToday(dayStartHour, now);
  let totalWindowG = 0;
  let weightedSumG = 0;
  let weightTotal = 0;
  let recent7dSumG = 0;

  // Per-strain consumption accumulators
  const strainRawG: Record<string, number> = {};
  const strainWeightedG: Record<string, number> = {};

  for (let daysAgo = 0; daysAgo < windowDays; daysAgo++) {
    const dayStart = t0 - daysAgo * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    const dayDoses = doses.filter((d) => d.timestamp >= dayStart && d.timestamp < dayEnd);
    const dayG = dayDoses.reduce((a, d) => a + d.amountG, 0);

    const w = Math.exp((-daysAgo * Math.LN2) / decayHalfLifeDays);
    totalWindowG += dayG;
    weightedSumG += dayG * w;
    weightTotal += w;

    if (daysAgo < 7) {
      recent7dSumG += dayG;
    }

    dayDoses.forEach((d) => {
      const sid = d.strainId || 'unknown';
      strainRawG[sid] = (strainRawG[sid] || 0) + d.amountG;
      strainWeightedG[sid] = (strainWeightedG[sid] || 0) + d.amountG * w;
    });
  }

  const simpleDailyAvgG = r2(totalWindowG / windowDays);
  const weightedDailyBurnG = weightTotal > 0 ? r2(weightedSumG / weightTotal) : 0;
  const recent7dAvgG = r2(recent7dSumG / Math.min(7, windowDays));

  const effectiveDailyBurnG = mode === 'smart' ? weightedDailyBurnG : simpleDailyAvgG;
  const burnVelocityDeltaPct =
    simpleDailyAvgG > 0
      ? Math.round(((weightedDailyBurnG - simpleDailyAvgG) / simpleDailyAvgG) * 100)
      : 0;

  const totalRunwayDays =
    effectiveDailyBurnG > 0 ? Math.round(forecastTargetG / effectiveDailyBurnG) : null;
  const activeOnlyRunwayDays =
    effectiveDailyBurnG > 0 ? Math.round(activeStockG / effectiveDailyBurnG) : null;
  const estimatedRunoutTs =
    totalRunwayDays !== null ? now + totalRunwayDays * 86_400_000 : null;
  const dailyCostEstimateKc = r1(effectiveDailyBurnG * avgPricePerG);

  // Collect all strain IDs present in packages or strains
  const strainIds = new Set<string>();
  strains.forEach((s) => strainIds.add(s.id));
  packages.forEach((p) => {
    if (p.strainId) strainIds.add(p.strainId);
  });

  const totalWeightedAllStrains = Object.values(strainWeightedG).reduce((a, b) => a + b, 0);
  const totalRawAllStrains = Object.values(strainRawG).reduce((a, b) => a + b, 0);

  const strainForecasts: StrainStockForecast[] = [];

  strainIds.forEach((sid) => {
    const st = strains.find((s) => s.id === sid);
    const sPkgs = packages.filter((p) => p.strainId === sid);
    const sActivePkgs = sPkgs.filter((p) => p.status === 'active');
    const sUnopenedPkgs = sPkgs.filter((p) => p.status === 'unopened');
    const sFinishedPkgs = sPkgs.filter((p) => p.status === 'finished');

    const sActiveG = r2(sActivePkgs.reduce((a, p) => a + Math.max(0, p.remainingWeightG), 0));
    const sUnopenedG = r2(
      sUnopenedPkgs.reduce((a, p) => a + Math.max(0, p.remainingWeightG), 0)
    );
    const sTotalG = r2(sActiveG + sUnopenedG);
    const sForecastTargetG = includeUnopened ? sTotalG : sActiveG;
    const sValKc = r2(
      sPkgs
        .filter((p) => p.status !== 'finished')
        .reduce((acc, p) => {
          if (p.initialWeightG <= 0) return acc;
          return acc + (Math.max(0, p.remainingWeightG) / p.initialWeightG) * p.costTotal;
        }, 0)
    );

    const rawG = r2(strainRawG[sid] || 0);
    const wG = strainWeightedG[sid] || 0;

    let usageShare = 0;
    if (mode === 'smart') {
      usageShare = totalWeightedAllStrains > 0 ? wG / totalWeightedAllStrains : 0;
    } else {
      usageShare = totalRawAllStrains > 0 ? rawG / totalRawAllStrains : 0;
    }

    const usageSharePct = Math.round(usageShare * 100);
    const dailyStrainBurnG =
      mode === 'smart'
        ? r2(effectiveDailyBurnG * usageShare)
        : r2(rawG / windowDays);

    const parallelRunwayDays =
      dailyStrainBurnG > 0.02 ? Math.round(sForecastTargetG / dailyStrainBurnG) : null;
    const soloRunwayDays =
      effectiveDailyBurnG > 0.02 ? Math.round(sForecastTargetG / effectiveDailyBurnG) : null;
    const sRunoutTs =
      parallelRunwayDays !== null ? now + parallelRunwayDays * 86_400_000 : null;

    // Include if it has stock or recent consumption or packages
    if (sTotalG > 0 || rawG > 0 || sPkgs.length > 0) {
      const isLowStock =
        sTotalG > 0 &&
        (sTotalG <= lowStockWarningG ||
          (parallelRunwayDays !== null && parallelRunwayDays <= lowDaysWarning));

      strainForecasts.push({
        strainId: sid,
        strainName: st?.name || sPkgs[0]?.name || 'Neznámý druh',
        strainColor: st?.color || '#30D158',
        mitPct: st?.mitPct || settings.defaultMitPct || 1.45,
        sevenOhPct: st?.sevenOhPct || settings.defaultSevenOhPct || 0.025,
        activeG: sActiveG,
        unopenedG: sUnopenedG,
        totalG: sTotalG,
        forecastTargetG: sForecastTargetG,
        valueKc: sValKc,
        shareOfStockPct: totalAllStockG > 0 ? Math.round((sTotalG / totalAllStockG) * 100) : 0,
        activePackagesCount: sActivePkgs.length,
        unopenedPackagesCount: sUnopenedPkgs.length,
        finishedPackagesCount: sFinishedPkgs.length,
        windowConsumedG: rawG,
        usageSharePct,
        dailyStrainBurnG,
        parallelRunwayDays,
        soloRunwayDays,
        estimatedRunoutTs: sRunoutTs,
        isLowStock,
      });
    }
  });

  // Sort by totalG desc, then usageSharePct desc
  strainForecasts.sort((a, b) => b.totalG - a.totalG || b.usageSharePct - a.usageSharePct);

  const lowStockStrainsCount = strainForecasts.filter((s) => s.isLowStock).length;

  return {
    mode,
    windowDays,
    decayHalfLifeDays,
    includeUnopened,
    activeStockG,
    unopenedStockG,
    totalAllStockG,
    forecastTargetG,
    totalValueKc,
    avgPricePerG,
    activePackagesCount: activePackages.length,
    unopenedPackagesCount: unopenedPackages.length,
    finishedPackagesCount: finishedPackages.length,
    simpleDailyAvgG,
    weightedDailyBurnG,
    effectiveDailyBurnG,
    recent7dAvgG,
    burnVelocityDeltaPct,
    dailyCostEstimateKc,
    totalRunwayDays,
    activeOnlyRunwayDays,
    estimatedRunoutTs,
    lowStockStrainsCount,
    strainForecasts,
  };
}

export interface PackageDetailedStats {
  pkg: Package;
  strain: Strain | null;
  pkgDoses: Dose[];
  dosesCount: number;
  loggedG: number;
  consumedG: number;
  unaccountedG: number; // rozdíl mezi úbytkem váhy a zapsanými dávkami
  remainingPct: number;
  consumedPct: number;
  avgDoseG: number;
  minDoseG: number;
  maxDoseG: number;
  medianDoseG: number;
  firstDoseTs: number | null;
  lastDoseTs: number | null;
  daysOpen: number;
  activeDaysWithPkg: number;
  pkgDailyBurnG: number;
  etaDays: number | null;
  etaDateTs: number | null;
  soloEtaDays: number | null;
  costConsumedKc: number;
  costRemainingKc: number;
  avgCostPerDoseKc: number;
  avgCostPerDayKc: number;
  totalMitMg: number;
  totalSevenOhMg: number;
  avgRating: number | null;
  topEffect: EffectType | null;
  dailySeries: Array<{ ts: number; dayKey: string; g: number; count: number }>;
}

export function calcPackageDetailedStats(
  pkg: Package,
  strain: Strain | null,
  allDoses: Dose[],
  settings: Partial<Settings> = {},
  overallBurnG = 0,
  now = Date.now()
): PackageDetailedStats {
  const dayStartHour = settings.dayStartHour || 0;
  const pkgDoses = allDoses
    .filter((d) => d.packageId === pkg.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  const dosesCount = pkgDoses.length;
  const loggedG = r2(pkgDoses.reduce((a, d) => a + d.amountG, 0));
  const consumedG = r2(Math.max(0, pkg.initialWeightG - pkg.remainingWeightG));
  const unaccountedG = r2(consumedG - loggedG);

  const remainingPct =
    pkg.initialWeightG > 0
      ? clamp(Math.round((pkg.remainingWeightG / pkg.initialWeightG) * 100), 0, 100)
      : 0;
  const consumedPct = 100 - remainingPct;

  const amounts = pkgDoses.map((d) => d.amountG).sort((a, b) => a - b);
  const avgDoseG = dosesCount > 0 ? r2(loggedG / dosesCount) : 0;
  const minDoseG = dosesCount > 0 ? amounts[0] : 0;
  const maxDoseG = dosesCount > 0 ? amounts[amounts.length - 1] : 0;
  const mid = Math.floor(dosesCount / 2);
  const medianDoseG =
    dosesCount > 0
      ? r2(dosesCount % 2 === 0 ? (amounts[mid - 1] + amounts[mid]) / 2 : amounts[mid])
      : 0;

  const firstDoseTs = dosesCount > 0 ? pkgDoses[dosesCount - 1].timestamp : null;
  const lastDoseTs = dosesCount > 0 ? pkgDoses[0].timestamp : null;

  const startRefTs = pkg.openedAt || firstDoseTs || now;
  const endRefTs = pkg.status === 'finished' && pkg.finishedAt ? pkg.finishedAt : now;
  const daysOpen = Math.max(
    1,
    Math.ceil((endRefTs - startOfDay(startRefTs, dayStartHour)) / 86_400_000)
  );

  const uniqueDays = new Set(pkgDoses.map((d) => dayKey(d.timestamp, dayStartHour)));
  const activeDaysWithPkg = uniqueDays.size;

  // Smart burn rate for this package
  const t0 = startOfToday(dayStartHour, now);
  const windowDays = clamp(settings.stockForecastWindowDays || 14, 3, 90);
  const halfLife = clamp(settings.stockDecayHalfLifeDays || 7, 1, 60);

  let wSum = 0;
  let wTotal = 0;
  for (let i = 0; i < windowDays; i++) {
    const ds = t0 - i * 86_400_000;
    const de = ds + 86_400_000;
    // Count doses from this package OR same strain if package was recently opened
    const dG = allDoses
      .filter(
        (d) =>
          d.timestamp >= ds &&
          d.timestamp < de &&
          (d.packageId === pkg.id || (pkg.status !== 'finished' && d.strainId === pkg.strainId))
      )
      .reduce((a, d) => a + d.amountG, 0);
    const w = Math.exp((-i * Math.LN2) / halfLife);
    wSum += dG * w;
    wTotal += w;
  }

  const recentStrainBurnG = wTotal > 0 ? r2(wSum / wTotal) : 0;
  const historicalPkgBurnG = r2(consumedG / daysOpen);

  const pkgDailyBurnG =
    (settings.stockForecastMode || 'smart') === 'smart'
      ? recentStrainBurnG > 0
        ? recentStrainBurnG
        : historicalPkgBurnG
      : historicalPkgBurnG > 0
      ? historicalPkgBurnG
      : recentStrainBurnG;

  const etaDays =
    pkg.status !== 'finished' && pkgDailyBurnG > 0.02
      ? Math.round(pkg.remainingWeightG / pkgDailyBurnG)
      : null;
  const etaDateTs = etaDays !== null ? now + etaDays * 86_400_000 : null;
  const soloEtaDays =
    pkg.status !== 'finished' && overallBurnG > 0.02
      ? Math.round(pkg.remainingWeightG / overallBurnG)
      : null;

  const costRemainingKc =
    pkg.initialWeightG > 0
      ? r2((Math.max(0, pkg.remainingWeightG) / pkg.initialWeightG) * pkg.costTotal)
      : 0;
  const costConsumedKc = r2(Math.max(0, pkg.costTotal - costRemainingKc));
  const avgCostPerDoseKc = dosesCount > 0 ? r1(loggedG * pkg.pricePerG / dosesCount) : 0;
  const avgCostPerDayKc = r1(pkgDailyBurnG * pkg.pricePerG);

  const totalMitMg = r1(pkgDoses.reduce((a, d) => a + (d.mitMg || 0), 0));
  const totalSevenOhMg = r2(pkgDoses.reduce((a, d) => a + (d.sevenOhMg || 0), 0));

  const ratedDoses = pkgDoses.filter((d) => d.rating > 0);
  const avgRating =
    ratedDoses.length > 0
      ? r1(ratedDoses.reduce((a, d) => a + d.rating, 0) / ratedDoses.length)
      : null;

  const effMap: Record<string, number> = {};
  pkgDoses.forEach((d) => {
    if (d.effect) effMap[d.effect] = (effMap[d.effect] || 0) + 1;
  });
  let topEffect: EffectType | null = null;
  let maxEffCnt = 0;
  Object.entries(effMap).forEach(([eff, cnt]) => {
    if (cnt > maxEffCnt) {
      maxEffCnt = cnt;
      topEffect = eff as EffectType;
    }
  });

  // 14-day series for package detail mini chart
  const dailySeries: Array<{ ts: number; dayKey: string; g: number; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const ds = t0 - i * 86_400_000;
    const de = ds + 86_400_000;
    const dk = dayKey(ds, dayStartHour);
    const dayPkgDoses = pkgDoses.filter((d) => d.timestamp >= ds && d.timestamp < de);
    dailySeries.push({
      ts: ds,
      dayKey: dk,
      g: r2(dayPkgDoses.reduce((a, d) => a + d.amountG, 0)),
      count: dayPkgDoses.length,
    });
  }

  return {
    pkg,
    strain,
    pkgDoses,
    dosesCount,
    loggedG,
    consumedG,
    unaccountedG,
    remainingPct,
    consumedPct,
    avgDoseG,
    minDoseG,
    maxDoseG,
    medianDoseG,
    firstDoseTs,
    lastDoseTs,
    daysOpen,
    activeDaysWithPkg,
    pkgDailyBurnG,
    etaDays,
    etaDateTs,
    soloEtaDays,
    costConsumedKc,
    costRemainingKc,
    avgCostPerDoseKc,
    avgCostPerDayKc,
    totalMitMg,
    totalSevenOhMg,
    avgRating,
    topEffect,
    dailySeries,
  };
}
