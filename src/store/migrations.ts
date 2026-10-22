import { DEFAULT_SETTINGS } from '../constants/defaults';
import {
  defaultState,
  seedBeverages,
  seedDoses,
  seedPackages,
  seedStrains,
  seedWaterLogs,
} from '../constants/seeds';
import { r2 } from '../lib/format';
import { AppState, Dose } from '../types';

export function migrateState(raw: Partial<AppState> | null | undefined): AppState {
  if (!raw || typeof raw !== 'object') {
    return defaultState();
  }

  const rawSettings: Partial<AppState['settings']> = raw.settings || {};
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
  };

  if (!rawSettings.settingsSchemaVersion || rawSettings.settingsSchemaVersion < 43) {
    if (!rawSettings.defaultAnalyticsSubTab || rawSettings.defaultAnalyticsSubTab === 'summary') {
      mergedSettings.defaultAnalyticsSubTab = 'home';
    }
    mergedSettings.settingsSchemaVersion = 43;
  }

  // Sanitize quickDosePresets
  const rawPresets = (mergedSettings as { quickDosePresets?: unknown }).quickDosePresets;
  if (typeof rawPresets === 'string') {
    const parsed = rawPresets
      .split(',')
      .map((s) => parseFloat(s.trim().replace(',', '.')))
      .filter((n) => !isNaN(n) && n > 0);
    mergedSettings.quickDosePresets = parsed.length > 0 ? parsed : [1, 2, 2.5, 3];
  } else if (!Array.isArray(rawPresets) || rawPresets.length === 0) {
    mergedSettings.quickDosePresets = [1, 2, 2.5, 3];
  } else {
    const valid = rawPresets.map((n) => Number(n)).filter((n) => !isNaN(n) && n > 0);
    mergedSettings.quickDosePresets = valid.length > 0 ? valid : [1, 2, 2.5, 3];
  }

  if (mergedSettings.tbreakActive && !mergedSettings.tbreakStartedAt) {
    mergedSettings.tbreakActive = false;
  }

  const strains = Array.isArray(raw.strains) && raw.strains.length > 0 ? raw.strains : seedStrains();
  const packages = Array.isArray(raw.packages) ? raw.packages : seedPackages(strains);
  const beverages = Array.isArray(raw.beverages) && raw.beverages.length > 0 ? [...raw.beverages] : seedBeverages();

  if (!beverages.some((b) => b.id === 'bev_water')) {
    beverages.unshift({
      id: 'bev_water',
      name: 'Voda',
      icon: '💧',
      cost: 0,
      note: 'Základní tekutina',
      color: '#0A84FF',
    });
  }

  const rawDoses = Array.isArray(raw.doses) ? raw.doses : seedDoses(strains, packages, beverages);
  const doses: Dose[] = rawDoses.map((d) => {
    const amountG = Number(d.amountG) || 0;
    const pricePerG = Number(d.pricePerG) || mergedSettings.defaultPricePerG || 8;
    const cost = d.cost !== undefined ? Number(d.cost) : r2(amountG * pricePerG);
    const beverageCost = Number(d.beverageCost) || 0;
    const timestamp = Number(d.timestamp) || Date.now();
    const mitPct = Number(d.mitPct) || mergedSettings.defaultMitPct || 1.45;
    const sevenOhPct = Number(d.sevenOhPct) || mergedSettings.defaultSevenOhPct || 0.025;
    const mitMg = d.mitMg !== undefined ? Number(d.mitMg) : r2(amountG * mitPct * 10);
    const sevenOhMg = d.sevenOhMg !== undefined ? Number(d.sevenOhMg) : r2(amountG * sevenOhPct * 10);

    return {
      ...d,
      amountG: r2(amountG),
      pricePerG: r2(pricePerG),
      cost: r2(cost),
      beverageCost: r2(beverageCost),
      timestamp,
      mitPct,
      sevenOhPct,
      mitMg: r2(mitMg),
      sevenOhMg: r2(sevenOhMg),
      rating: d.rating ?? 4,
      effect: d.effect || 'energy',
      note: d.note || '',
    };
  });

  const waterLogs = Array.isArray(raw.waterLogs) ? raw.waterLogs : seedWaterLogs();
  const tbreakHistory = Array.isArray(raw.tbreakHistory) ? raw.tbreakHistory : [];
  const achievements = raw.achievements && typeof raw.achievements === 'object' ? raw.achievements : {};
  const rawCravings = Array.isArray(raw.cravingLogs) ? raw.cravingLogs : [];
  const cravingLogs = rawCravings
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      const sevRaw = Math.round(Number(c.severity) || 3);
      const severity = (sevRaw < 1 ? 1 : sevRaw > 5 ? 5 : sevRaw) as 1 | 2 | 3 | 4 | 5;
      return {
        id: String(c.id || `cr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
        timestamp: Number(c.timestamp) || Date.now(),
        lastSessionEnd: Number(c.lastSessionEnd) || Number(c.timestamp) || Date.now(),
        lastSessionTotalG: r2(Number(c.lastSessionTotalG) || 0),
        lastSessionCount: Math.max(1, Math.round(Number(c.lastSessionCount) || 1)),
        hoursSinceSessionEnd: r2(Number(c.hoursSinceSessionEnd) || 0),
        activeMitAtCraving: r2(Number(c.activeMitAtCraving) || 0),
        severity,
        strainId: c.strainId ?? null,
        note: String(c.note || ''),
        previousPredictionAt:
          c.previousPredictionAt !== undefined && c.previousPredictionAt !== null
            ? Number(c.previousPredictionAt)
            : null,
      };
    });

  return {
    settings: mergedSettings,
    strains,
    packages,
    beverages,
    doses,
    waterLogs,
    tbreakHistory,
    achievements,
    cravingLogs,
  };
}
