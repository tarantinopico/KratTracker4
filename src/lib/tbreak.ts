import { Settings } from '../types';
import { clamp } from './format';

export interface TBreakInfo {
  active: boolean;
  goalMs: number;
  elapsedMs: number;
  pct: number;
  remainMs: number;
  done: boolean;
  startedAt?: number;
}

export function tbreakInfo(
  settings: Pick<Settings, 'tbreakActive' | 'tbreakStartedAt' | 'tbreakGoalHours'>,
  now = Date.now()
): TBreakInfo {
  const goalMs = (settings.tbreakGoalHours || 72) * 3600000;
  if (!settings.tbreakActive || !settings.tbreakStartedAt) {
    return { active: false, goalMs, elapsedMs: 0, pct: 0, remainMs: goalMs, done: false };
  }
  const elapsedMs = Math.max(0, now - settings.tbreakStartedAt);
  return {
    active: true,
    goalMs,
    elapsedMs,
    pct: clamp(Math.round((elapsedMs / goalMs) * 100), 0, 100),
    remainMs: Math.max(0, goalMs - elapsedMs),
    done: elapsedMs >= goalMs,
    startedAt: settings.tbreakStartedAt,
  };
}
