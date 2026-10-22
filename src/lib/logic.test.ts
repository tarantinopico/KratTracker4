import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState } from '../constants/seeds';
import {
  calcAdvancedAnalyticsMetrics,
  calcCumulativeTrajectory,
  calcDoseDistribution,
  calcRadarDisciplineProfile,
  calcStrainDiversityIndex,
  calcWeekdayProfile,
  getAnalyticsContext,
} from './analytics';
import { dayKey } from './date';
import { r1, r2 } from './format';
import { calcActiveMitAtTime } from './pharmacokinetics';
import { performReconciliation, revertReconciliation } from './reconcile';
import { calcPackageDetailedStats, calcSmartStockForecast } from './stock';
import { calcLimitStreak } from './streaks';
import { tbreakInfo } from './tbreak';
import {
  calcClassicReceptorScore,
  calcReceptorSensitivityScore,
  calcSmartReceptorAnalysis,
} from './tolerance';
import {
  calcCravingPredictionStreak,
  predictNextCraving,
} from './cravingPrediction';
import { buildSessions } from './cravingSessions';
import type { CravingLog, Dose } from '../types';

test('formatting and rounding helpers work accurately', () => {
  assert.equal(r1(2.34), 2.3);
  assert.equal(r2(2.346), 2.35);
});

test('dayKey respects dayStartHour offset for night doses', () => {
  const noon = new Date(2026, 2, 21, 12, 0, 0).getTime();
  const twoAmNextDay = new Date(2026, 2, 22, 2, 0, 0).getTime();
  assert.equal(dayKey(noon, 4), '2026-03-21');
  // 2:00 AM with dayStartHour=4 still belongs to 2026-03-21
  assert.equal(dayKey(twoAmNextDay, 4), '2026-03-21');
});

test('pharmacokinetics two-phase model peaks at Tmax and decays afterwards', () => {
  const state = defaultState(100000000);
  const doseTs = 100000000;
  const doses = [
    {
      ...state.doses[0],
      timestamp: doseTs,
      amountG: 2.0,
      mitPct: 1.5,
      mitMg: 30,
    },
  ];
  const atZero = calcActiveMitAtTime(doses, state.settings, doseTs);
  const atPeak = calcActiveMitAtTime(
    doses,
    state.settings,
    doseTs + state.settings.mitTMaxH * 3600000
  );
  const after10h = calcActiveMitAtTime(doses, state.settings, doseTs + 10 * 3600000);
  assert.equal(atZero, 0);
  assert.equal(atPeak, 30);
  assert.ok(after10h < 30 && after10h > 0);
});

test('receptor sensitivity score stays clamped between 10 and 100 in both smart and classic modes', () => {
  const state = defaultState();
  const smartScore = calcReceptorSensitivityScore({
    ...state,
    settings: { ...state.settings, toleranceModelMode: 'smart' },
  });
  const classicScore = calcReceptorSensitivityScore({
    ...state,
    settings: { ...state.settings, toleranceModelMode: 'classic' },
  });
  assert.ok(smartScore >= 10 && smartScore <= 100);
  assert.ok(classicScore >= 10 && classicScore <= 100);
  assert.equal(classicScore, calcClassicReceptorScore(state));

  // Verify 7-OH multiplier affects smart analysis when high 7-OH doses exist
  const high7OhDoses = state.doses.map((d) => ({
    ...d,
    sevenOhPct: 0.15,
    sevenOhMg: r2(d.amountG * 1.5),
  }));
  const lowWeightAnalysis = calcSmartReceptorAnalysis({
    doses: high7OhDoses,
    settings: { ...state.settings, toleranceSevenOhMultiplier: 2 },
  });
  const highWeightAnalysis = calcSmartReceptorAnalysis({
    doses: high7OhDoses,
    settings: { ...state.settings, toleranceSevenOhMultiplier: 35 },
  });
  assert.ok(highWeightAnalysis.weightedDailyEqG > lowWeightAnalysis.weightedDailyEqG);
  assert.ok(highWeightAnalysis.equivalentDoseFor2g >= 2.0);
});

test('smart stock forecast and package detailed stats compute weighted burn and per-strain runway', () => {
  const now = 1_700_500_000_000;
  const state = defaultState(now);
  const smartForecast = calcSmartStockForecast(
    state.packages,
    state.strains,
    state.doses,
    { ...state.settings, stockForecastMode: 'smart', stockIncludeUnopenedInEta: true },
    now
  );
  const activeOnlyForecast = calcSmartStockForecast(
    state.packages,
    state.strains,
    state.doses,
    { ...state.settings, stockForecastMode: 'smart', stockIncludeUnopenedInEta: false },
    now
  );
  const classicForecast = calcSmartStockForecast(
    state.packages,
    state.strains,
    state.doses,
    { ...state.settings, stockForecastMode: 'classic', stockIncludeUnopenedInEta: true },
    now
  );

  assert.ok(smartForecast.totalAllStockG >= smartForecast.activeStockG);
  assert.ok(smartForecast.effectiveDailyBurnG > 0);
  assert.ok(classicForecast.effectiveDailyBurnG > 0);
  assert.ok(smartForecast.totalRunwayDays !== null && smartForecast.totalRunwayDays > 0);
  assert.ok(
    activeOnlyForecast.totalRunwayDays! <= smartForecast.totalRunwayDays!
  );
  assert.equal(activeOnlyForecast.totalRunwayDays, smartForecast.activeOnlyRunwayDays);
  assert.ok(smartForecast.strainForecasts.length > 0);

  const pkg = state.packages[0];
  const strain = state.strains.find((s) => s.id === pkg.strainId) || null;
  const pkgStats = calcPackageDetailedStats(
    pkg,
    strain,
    state.doses,
    state.settings,
    smartForecast.effectiveDailyBurnG,
    now
  );
  assert.equal(pkgStats.pkg.id, pkg.id);
  assert.equal(pkgStats.dailySeries.length, 14);
  assert.ok(pkgStats.remainingPct >= 0 && pkgStats.remainingPct <= 100);
});

test('reconcile proportional and undo restores original dose amounts', () => {
  const state = defaultState();
  const pkg = state.packages.find((p) => p.id === 'pkg_gbo')!;
  const pkgDoseIds = new Set(
    state.doses.filter((d) => d.packageId === pkg.id).map((d) => d.id)
  );
  const origSum = r2(
    state.doses.filter((d) => pkgDoseIds.has(d.id)).reduce((a, d) => a + d.amountG, 0)
  );

  const reconciled = performReconciliation(
    state,
    pkg.id,
    pkgDoseIds,
    100,
    'proportional',
    true
  );
  const updatedPkg = reconciled.packages.find((p) => p.id === pkg.id)!;
  assert.equal(updatedPkg.status, 'finished');
  assert.equal(updatedPkg.calibrated, true);
  assert.equal(updatedPkg.remainingWeightG, 0);

  const newSum = r2(
    reconciled.doses.filter((d) => pkgDoseIds.has(d.id)).reduce((a, d) => a + d.amountG, 0)
  );
  assert.ok(Math.abs(newSum - 100) < 0.5);

  const reverted = revertReconciliation(reconciled, pkg.id);
  const revertedPkg = reverted.packages.find((p) => p.id === pkg.id)!;
  assert.equal(revertedPkg.status, 'active');
  assert.equal(revertedPkg.calibrated, false);
  const restoredSum = r2(
    reverted.doses.filter((d) => pkgDoseIds.has(d.id)).reduce((a, d) => a + d.amountG, 0)
  );
  assert.equal(restoredSum, origSum);
});

test('analytics context, advanced metrics, radar, weekday, and cumulative helpers compute valid aggregates', () => {
  const state = defaultState();
  const ctx = getAnalyticsContext(state, 30);
  assert.equal(ctx.days, 30);
  assert.ok(ctx.curG > 0);
  assert.equal(ctx.doseDist.total, ctx.curDoses.length);

  const adv = calcAdvancedAnalyticsMetrics(ctx, state);
  assert.ok(adv.stabilityIndexPct >= 10 && adv.stabilityIndexPct <= 100);
  assert.ok(adv.limitCompliancePct >= 0 && adv.limitCompliancePct <= 100);
  assert.ok(adv.strainEfficiencyList.length > 0);

  const weekday = calcWeekdayProfile(ctx.daily, ctx.curDoses);
  assert.equal(weekday.entries.length, 7);
  assert.ok(weekday.maxAvgG >= 0);

  const radar = calcRadarDisciplineProfile(ctx, state);
  assert.equal(radar.axes.length, 6);
  assert.ok(radar.overallScore >= 0 && radar.overallScore <= 100);

  const cum = calcCumulativeTrajectory(ctx.daily, ctx.L);
  assert.equal(cum.points.length, 30);
  assert.equal(cum.totalBudgetG, 30 * ctx.L);

  const div = calcStrainDiversityIndex(state.doses, 3);
  assert.ok(div.pct >= 0 && div.pct <= 100);
  assert.ok(calcLimitStreak(state) >= 0);

  const tb = tbreakInfo({
    tbreakActive: true,
    tbreakStartedAt: Date.now() - 36 * 3600000,
    tbreakGoalHours: 72,
  });
  assert.equal(tb.pct, 50);
});

test('buildSessions clusters doses within 60-minute window and computes weighted effectiveTime and dominantStrain', () => {
  const baseTs = 1_700_000_000_000;
  const baseDose = defaultState(baseTs).doses[0];
  const doses: Dose[] = [
    {
      ...baseDose,
      id: 'd1',
      timestamp: baseTs,
      amountG: 2.0,
      strainId: 'str_green',
      strainName: 'Green Maeng Da',
      strainColor: '#34C759',
      mitPct: 1.5,
      mitMg: 30,
    },
    {
      ...baseDose,
      id: 'd2',
      timestamp: baseTs + 30 * 60_000, // 30 min later -> same session
      amountG: 2.0,
      strainId: 'str_red',
      strainName: 'Red Bali',
      strainColor: '#FF453A',
      mitPct: 1.5,
      mitMg: 30,
    },
    {
      ...baseDose,
      id: 'd3',
      timestamp: baseTs + 50 * 60_000, // 20 min after d2 -> still same session
      amountG: 1.0,
      strainId: 'str_red',
      strainName: 'Red Bali',
      strainColor: '#FF453A',
      mitPct: 1.5,
      mitMg: 15,
    },
    {
      ...baseDose,
      id: 'd4',
      timestamp: baseTs + 150 * 60_000, // 100 min after d3 -> new session
      amountG: 2.5,
      strainId: 'str_white',
      strainName: 'White Borneo',
      strainColor: '#64D2FF',
      mitPct: 1.5,
      mitMg: 37.5,
    },
  ];

  const sessions = buildSessions(doses, 60);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].totalG, 5.0);
  assert.equal(sessions[0].doseIds.length, 3);
  assert.equal(sessions[0].dominantStrainId, 'str_red'); // 3g Red vs 2g Green
  const expectedEff =
    (baseTs * 2 + (baseTs + 30 * 60_000) * 2 + (baseTs + 50 * 60_000) * 1) / 5;
  assert.equal(sessions[0].effectiveTime, expectedEff);
  assert.equal(sessions[1].totalG, 2.5);
});

test('predictNextCraving handles cold start, exponential time decay weighting, T-break filtering, and combined regression', () => {
  const now = 1_700_500_000_000;
  const state = defaultState(now);
  const lastDoseTs = now - 2 * 3600_000; // 2h ago
  const doses: Dose[] = [
    {
      ...state.doses[0],
      id: 'dose_recent',
      timestamp: lastDoseTs,
      amountG: 3.0,
      mitPct: 1.5,
      mitMg: 45,
    },
  ];

  // 1) Cold start (< 3 logs)
  const cold = predictNextCraving([], doses, state.settings, now);
  assert.equal(cold.available, false);
  assert.ok(cold.reason?.includes('Zaznamenej alespoň'));

  // 2) T-break logs are ignored by the model
  const tbreakLogs: CravingLog[] = [1, 2, 3].map((i) => ({
    id: `tb_${i}`,
    timestamp: now - i * 86_400_000,
    lastSessionEnd: now - i * 86_400_000 - 4 * 3600_000,
    lastSessionTotalG: 3,
    lastSessionCount: 1,
    hoursSinceSessionEnd: 4,
    activeMitAtCraving: 10,
    severity: 3,
    strainId: null,
    note: 'T-break · zkouška',
  }));
  const afterTbreakOnly = predictNextCraving(tbreakLogs, doses, state.settings, now);
  assert.equal(afterTbreakOnly.available, false);

  // 3) Exponential weighting: 14-day old logs with 20 mg vs 5 recent logs with 12 mg
  const mixedLogs: CravingLog[] = [
    // 3 old logs (14 days ago) with activeMitAtCraving = 24 mg
    ...[14, 15, 16].map((daysAgo, idx) => ({
      id: `old_${idx}`,
      timestamp: now - daysAgo * 86_400_000,
      lastSessionEnd: now - daysAgo * 86_400_000 - 3.5 * 3600_000,
      lastSessionTotalG: 2.0,
      lastSessionCount: 1,
      hoursSinceSessionEnd: 3.5,
      activeMitAtCraving: 24,
      severity: 3 as const,
      strainId: 'str_gbo',
      note: '',
    })),
    // 5 recent logs (1-5 days ago) with activeMitAtCraving = 12 mg
    ...[1, 2, 3, 4, 5].map((daysAgo, idx) => ({
      id: `rec_${idx}`,
      timestamp: now - daysAgo * 86_400_000,
      lastSessionEnd: now - daysAgo * 86_400_000 - 5.5 * 3600_000,
      lastSessionTotalG: 3.0,
      lastSessionCount: 1,
      hoursSinceSessionEnd: 5.5,
      activeMitAtCraving: 12,
      severity: 3 as const,
      strainId: 'str_gbo',
      note: '',
    })),
  ];

  const level1 = predictNextCraving(mixedLogs, doses, state.settings, now);
  assert.equal(level1.available, true);
  assert.equal(level1.method, 'mit-threshold');
  assert.ok(level1.mitThresholdMg !== null);
  // Unweighted mean of (3*24 + 5*12)/8 = 16.5, weighted mean must be closer to 12 (< 15)
  assert.ok(level1.mitThresholdMg! < 15);
  assert.equal(level1.trend, 'falling');

  // 4) 10+ logs switches to combined regression + MIT threshold
  const tenLogs: CravingLog[] = [
    ...mixedLogs,
    {
      id: 'rec_6',
      timestamp: now - 6 * 86_400_000,
      lastSessionEnd: now - 6 * 86_400_000 - 6.0 * 3600_000,
      lastSessionTotalG: 3.5,
      lastSessionCount: 1,
      hoursSinceSessionEnd: 6.0,
      activeMitAtCraving: 11.5,
      severity: 3,
      strainId: 'str_gbo',
      note: '',
    },
    {
      id: 'rec_7',
      timestamp: now - 7 * 86_400_000,
      lastSessionEnd: now - 7 * 86_400_000 - 6.2 * 3600_000,
      lastSessionTotalG: 3.8,
      lastSessionCount: 1,
      hoursSinceSessionEnd: 6.2,
      activeMitAtCraving: 11.2,
      severity: 3,
      strainId: 'str_gbo',
      note: '',
    },
  ];
  const level2 = predictNextCraving(tenLogs, doses, state.settings, now);
  assert.equal(level2.available, true);
  assert.equal(level2.method, 'combined');
  assert.ok(level2.predictedAt !== null && level2.predictedAt > now);

  // 5) Accuracy streak calculation (±45 min)
  const streakLogs: CravingLog[] = [1, 2, 3, 4, 5].map((i) => ({
    id: `str_${i}`,
    timestamp: now - i * 10_000_000,
    lastSessionEnd: now - i * 10_000_000 - 4 * 3600_000,
    lastSessionTotalG: 2.5,
    lastSessionCount: 1,
    hoursSinceSessionEnd: 4,
    activeMitAtCraving: 12,
    severity: 3,
    strainId: null,
    note: '',
    previousPredictionAt: now - i * 10_000_000 + 20 * 60_000, // 20 min difference (<= 45 min)
  }));
  assert.equal(calcCravingPredictionStreak(streakLogs), 5);
});

