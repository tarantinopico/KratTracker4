import { Dose } from '../types';
import { r2 } from './format';

export interface DoseSession {
  startTime: number;
  endTime: number;
  effectiveTime: number;   // Σ(timestamp × amountG) / Σ(amountG) — vážený průměr
  totalG: number;
  doseIds: string[];
  dominantStrainId: string | null;
  dominantStrainName: string;
  dominantStrainColor: string;
}

interface SessionBuilder {
  startTime: number;
  endTime: number;
  weightedTsSum: number;
  totalG: number;
  doseIds: string[];
  strainTotals: Map<
    string,
    { id: string | null; name: string; color: string; g: number }
  >;
}

function finalizeSession(b: SessionBuilder): DoseSession {
  let domId: string | null = null;
  let domName = 'Neznámý druh';
  let domColor = '#30D158';
  let maxG = -1;

  b.strainTotals.forEach((entry) => {
    if (entry.g > maxG) {
      maxG = entry.g;
      domId = entry.id;
      domName = entry.name;
      domColor = entry.color;
    }
  });

  const effectiveTime =
    b.totalG > 0 ? Math.round(b.weightedTsSum / b.totalG) : b.endTime;

  return {
    startTime: b.startTime,
    endTime: b.endTime,
    effectiveTime,
    totalG: r2(b.totalG),
    doseIds: b.doseIds,
    dominantStrainId: domId,
    dominantStrainName: domName,
    dominantStrainColor: domColor,
  };
}

export function buildSessions(doses: Dose[], windowMin = 60): DoseSession[] {
  if (!Array.isArray(doses) || doses.length === 0) return [];

  const windowMs = Math.max(1, windowMin) * 60_000;
  const sorted = [...doses]
    .filter((d) => d && typeof d.timestamp === 'number' && !isNaN(d.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length === 0) return [];

  const builders: SessionBuilder[] = [];

  for (const dose of sorted) {
    const amt = Math.max(0, Number(dose.amountG) || 0);
    const key = dose.strainId || dose.strainName || 'unknown';
    const last = builders[builders.length - 1];

    if (last && dose.timestamp - last.endTime < windowMs) {
      last.endTime = Math.max(last.endTime, dose.timestamp);
      last.totalG += amt;
      last.weightedTsSum += dose.timestamp * amt;
      last.doseIds.push(dose.id);

      const prevStrain = last.strainTotals.get(key);
      if (prevStrain) {
        prevStrain.g += amt;
      } else {
        last.strainTotals.set(key, {
          id: dose.strainId || null,
          name: dose.strainName || 'Neznámý druh',
          color: dose.strainColor || '#30D158',
          g: amt,
        });
      }
    } else {
      const strainTotals = new Map<
        string,
        { id: string | null; name: string; color: string; g: number }
      >();
      strainTotals.set(key, {
        id: dose.strainId || null,
        name: dose.strainName || 'Neznámý druh',
        color: dose.strainColor || '#30D158',
        g: amt,
      });

      builders.push({
        startTime: dose.timestamp,
        endTime: dose.timestamp,
        weightedTsSum: dose.timestamp * amt,
        totalG: amt,
        doseIds: [dose.id],
        strainTotals,
      });
    }
  }

  return builders.map(finalizeSession);
}

export function getLastSession(doses: Dose[], windowMin = 60): DoseSession | null {
  const sessions = buildSessions(doses, windowMin);
  return sessions.length > 0 ? sessions[sessions.length - 1] : null;
}
