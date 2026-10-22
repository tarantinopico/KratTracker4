import { ACH_DEFS, AchievementDef } from '../constants/achievements';
import { AppState } from '../types';

export function getNewlyUnlockedAchievements(state: AppState): AchievementDef[] {
  if (!state.settings.enableAchievements) return [];
  const newlyUnlocked: AchievementDef[] = [];
  for (const def of ACH_DEFS) {
    if (state.achievements[def.id]) continue;
    const progress = def.get(state);
    if (progress >= def.target) {
      newlyUnlocked.push(def);
    }
  }
  return newlyUnlocked;
}

export function achUnlockedCount(state: AppState): number {
  return ACH_DEFS.filter((d) => Boolean(state.achievements[d.id])).length;
}
