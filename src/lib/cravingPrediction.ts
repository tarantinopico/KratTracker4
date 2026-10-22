import { CravingLog, Dose, Settings } from '../types';
import { getLastSession } from './cravingSessions';
import { clamp, r1, r2 } from './format';
import { calcActiveMitAtTime } from './pharmacokinetics';

export interface CravingPrediction {
  available: boolean;                    // false při cold startu
  reason?: string;                       // důvod, proč není dostupná
  predictedAt: number | null;            // timestamp predikované chuti
  hoursFromNow: number | null;
  confidenceHours: number | null;        // ± směrodatná odchylka v hodinách
  mitThresholdMg: number | null;         // naučený práh MIT
  avgHoursAfterSession: number | null;   // průměrná doba od konce session
  logCount: number;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';  // trend hours-to-craving
  trendDeltaH: number | null;
  method: 'mit-threshold' | 'regression' | 'combined' | 'none';
}

export function filterModelCravingLogs(cravingLogs: CravingLog[]): CravingLog[] {
  if (!Array.isArray(cravingLogs)) return [];
  return cravingLogs
    .filter(
      (l) =>
        l &&
        typeof l.timestamp === 'number' &&
        !isNaN(l.timestamp) &&
        !(l.note || '').startsWith('T-break')
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function calcWeightedRegression(
  logs: CravingLog[],
  now = Date.now()
): { a: number; b: number } {
  if (logs.length === 0) return { a: 5, b: 1 };

  let sumW = 0;
  let sumWX = 0;
  let sumWY = 0;
  let sumWXX = 0;
  let sumWXY = 0;

  for (const log of logs) {
    const daysAgo = Math.max(0, (now - log.timestamp) / 86400000);
    const w = Math.exp(-daysAgo / 7);
    const x = Math.max(0.1, Number(log.lastSessionTotalG) || 2);
    const y = Math.max(0.2, Number(log.hoursSinceSessionEnd) || 4);

    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXX += w * x * x;
    sumWXY += w * x * y;
  }

  if (sumW <= 0) return { a: 5, b: 1 };

  const meanX = sumWX / sumW;
  const meanY = sumWY / sumW;
  const denom = sumWXX - sumW * meanX * meanX;

  if (Math.abs(denom) < 1e-6) {
    return { a: r2(meanY), b: 0 };
  }

  const b = (sumWXY - sumW * meanX * meanY) / denom;
  const a = meanY - b * meanX;

  return { a: r2(a), b: r2(b) };
}

export function computeCravingTrend(validLogs: CravingLog[]): {
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  trendDeltaH: number | null;
} {
  if (validLogs.length < 6) {
    return { trend: 'unknown', trendDeltaH: null };
  }

  const recent5 = validLogs.slice(-5);
  const older5 = validLogs.slice(Math.max(0, validLogs.length - 10), validLogs.length - 5);

  if (older5.length === 0) {
    return { trend: 'unknown', trendDeltaH: null };
  }

  const avgRecent =
    recent5.reduce((s, l) => s + (Number(l.hoursSinceSessionEnd) || 0), 0) / recent5.length;
  const avgOlder =
    older5.reduce((s, l) => s + (Number(l.hoursSinceSessionEnd) || 0), 0) / older5.length;

  const delta = r1(avgRecent - avgOlder);

  if (avgRecent < avgOlder * 0.8) {
    return { trend: 'rising', trendDeltaH: delta };
  }
  if (avgRecent > avgOlder * 1.2) {
    return { trend: 'falling', trendDeltaH: delta };
  }
  return { trend: 'stable', trendDeltaH: delta };
}

export function predictNextCraving(
  cravingLogs: CravingLog[],
  doses: Dose[],
  settings: Settings,
  now = Date.now()
): CravingPrediction {
  const validLogs = filterModelCravingLogs(cravingLogs);
  const logCount = validLogs.length;
  const minLogs = Math.max(1, settings.cravingPredictionThresholdMin || 3);
  const windowMin = settings.cravingSessionWindowMin || 60;

  const { trend, trendDeltaH } = computeCravingTrend(validLogs);

  // Weighted stats from logs if any exist
  let mitThresholdMg: number | null = null;
  let avgHoursAfterSession: number | null = null;
  let confidenceHours: number | null = null;

  if (logCount > 0) {
    let sumW = 0;
    let sumWMit = 0;
    let sumWHours = 0;

    const weights: number[] = [];
    for (const log of validLogs) {
      const daysAgo = Math.max(0, (now - log.timestamp) / 86400000);
      const w = Math.exp(-daysAgo / 7);
      weights.push(w);
      sumW += w;
      sumWMit += w * Math.max(0, Number(log.activeMitAtCraving) || 0);
      sumWHours += w * Math.max(0, Number(log.hoursSinceSessionEnd) || 0);
    }

    if (sumW > 0) {
      mitThresholdMg = r1(sumWMit / sumW);
      avgHoursAfterSession = r1(sumWHours / sumW);

      let sumWVar = 0;
      for (let i = 0; i < validLogs.length; i++) {
        const diff = (Number(validLogs[i].activeMitAtCraving) || 0) - mitThresholdMg;
        sumWVar += weights[i] * diff * diff;
      }
      const stdDevMg = Math.sqrt(Math.max(0, sumWVar / sumW));
      const denom = Math.max(0.5, 0.3 * Math.max(1, mitThresholdMg));
      confidenceHours = r1(clamp(stdDevMg / denom, 0.3, 12));
    }
  }

  // Check if there is any dose session
  const dosesUpToNow = Array.isArray(doses)
    ? doses.filter((d) => d && d.timestamp <= now)
    : [];
  const lastSession = getLastSession(dosesUpToNow, windowMin);

  if (!lastSession) {
    return {
      available: false,
      reason: 'Zaznamenej dávku.',
      predictedAt: null,
      hoursFromNow: null,
      confidenceHours,
      mitThresholdMg,
      avgHoursAfterSession,
      logCount,
      trend,
      trendDeltaH,
      method: 'none',
    };
  }

  // Cold start check
  if (logCount < minLogs || mitThresholdMg === null || avgHoursAfterSession === null) {
    return {
      available: false,
      reason:
        minLogs === 3
          ? 'Zaznamenej alespoň 3 chuti a začnu predikovat.'
          : `Zaznamenej alespoň ${minLogs} chuti a začnu predikovat.`,
      predictedAt: null,
      hoursFromNow: null,
      confidenceHours,
      mitThresholdMg,
      avgHoursAfterSession,
      logCount,
      trend,
      trendDeltaH,
      method: 'none',
    };
  }

  // Less than 30 min since last dose check
  if (now - lastSession.endTime < 30 * 60_000 && now >= lastSession.endTime) {
    return {
      available: false,
      reason: 'Chvíli po dávce — dej tomu čas.',
      predictedAt: null,
      hoursFromNow: null,
      confidenceHours,
      mitThresholdMg,
      avgHoursAfterSession,
      logCount,
      trend,
      trendDeltaH,
      method: 'none',
    };
  }

  // Level 1: MIT Threshold search
  const curMit = calcActiveMitAtTime(dosesUpToNow, settings, now);
  const tMaxMs = (settings.mitTMaxH || 1.2) * 3600_000;
  const pastPeakNow = now - lastSession.endTime >= tMaxMs * 0.5;

  let predictedAtMit: number;

  if (pastPeakNow && curMit <= mitThresholdMg) {
    predictedAtMit = now;
  } else {
    const stepMs = 15 * 60_000; // 15 minutes
    const maxHorizonMs = 48 * 3600_000; // 48 hours
    let foundTs: number | null = null;

    for (let dt = stepMs; dt <= maxHorizonMs; dt += stepMs) {
      const candidateTs = now + dt;
      // Ensure we check after absorption peak of the last session
      if (candidateTs - lastSession.endTime < tMaxMs * 0.6) continue;
      const mitAtCandidate = calcActiveMitAtTime(dosesUpToNow, settings, candidateTs);
      if (mitAtCandidate < mitThresholdMg) {
        foundTs = candidateTs;
        break;
      }
    }

    if (foundTs !== null) {
      predictedAtMit = foundTs;
    } else {
      predictedAtMit = lastSession.endTime + avgHoursAfterSession * 3600_000;
    }
  }

  let finalPredictedAt = predictedAtMit;
  let method: 'mit-threshold' | 'regression' | 'combined' = 'mit-threshold';

  // Level 2: 10+ logs -> Combined model (50% MIT + 50% weighted linear regression)
  if (logCount >= 10) {
    const { a, b } = calcWeightedRegression(validLogs, now);
    const hoursRegression = clamp(a + b * lastSession.totalG, 1, 30);
    const predictedAtRegression = lastSession.endTime + hoursRegression * 3600_000;
    finalPredictedAt = Math.round(0.5 * predictedAtMit + 0.5 * predictedAtRegression);
    method = 'combined';
  }

  if (finalPredictedAt <= now) {
    finalPredictedAt = now;
  }

  const hoursFromNow =
    finalPredictedAt <= now ? 0 : r1((finalPredictedAt - now) / 3600_000);

  return {
    available: true,
    predictedAt: finalPredictedAt,
    hoursFromNow,
    confidenceHours: confidenceHours ?? 1.2,
    mitThresholdMg,
    avgHoursAfterSession,
    logCount,
    trend,
    trendDeltaH,
    method,
  };
}

export function calcCravingPredictionStreak(
  cravingLogs: CravingLog[],
  doses: Dose[] = [],
  settings?: Settings
): number {
  const valid = filterModelCravingLogs(cravingLogs);
  if (valid.length === 0) return 0;

  let streak = 0;
  const tolMs = 45 * 60_000;

  for (let i = 0; i < valid.length; i++) {
    const log = valid[i];
    let predTs: number | null =
      log.previousPredictionAt !== undefined ? log.previousPredictionAt : null;

    if (predTs === null && i >= 3 && settings && doses.length > 0) {
      const priorLogs = valid.slice(0, i);
      const evalTime = Math.max(log.lastSessionEnd + 35 * 60_000, log.timestamp - 3600_000);
      const pred = predictNextCraving(priorLogs, doses, settings, evalTime);
      predTs = pred.predictedAt;
    }

    if (predTs === null && i < 3) {
      continue;
    }

    if (predTs !== null && Math.abs(predTs - log.timestamp) <= tolMs) {
      streak += 1;
    } else {
      streak = 0;
    }
  }

  return streak;
}
