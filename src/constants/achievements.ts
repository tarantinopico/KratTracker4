import { AppState } from '../types';
import {
  calcCravingPredictionStreak,
  predictNextCraving,
} from '../lib/cravingPrediction';
import {
  calcBudgetStreak,
  calcCleanStreak,
  calcIntervalStreak,
  calcLimitStreak,
  calcWaterStreak,
} from '../lib/streaks';

export interface AchievementDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  target: number;
  get: (state: AppState) => number;
}

export const ACH_DEFS: AchievementDef[] = [
  {
    id: 'first_dose',
    icon: '🌱',
    name: 'První záznam',
    desc: 'Zapiš svou úplně první dávku.',
    target: 1,
    get: (s) => s.doses.length,
  },
  {
    id: 'doses_50',
    icon: '📒',
    name: 'Pečlivý deník',
    desc: 'Zaznamenej celkem 50 dávek.',
    target: 50,
    get: (s) => s.doses.length,
  },
  {
    id: 'doses_200',
    icon: '📚',
    name: 'Archivář',
    desc: 'Zaznamenej celkem 200 dávek.',
    target: 200,
    get: (s) => s.doses.length,
  },
  {
    id: 'streak_3',
    icon: '🎯',
    name: 'Rozjezd disciplíny',
    desc: '3 dny v řadě pod denním limitem.',
    target: 3,
    get: (s) => calcLimitStreak(s),
  },
  {
    id: 'streak_7',
    icon: '🔥',
    name: 'Týden v limitech',
    desc: '7 dní v řadě pod denním limitem.',
    target: 7,
    get: (s) => calcLimitStreak(s),
  },
  {
    id: 'streak_30',
    icon: '👑',
    name: 'Mistr disciplíny',
    desc: '30 dní v řadě pod denním limitem.',
    target: 30,
    get: (s) => calcLimitStreak(s),
  },
  {
    id: 'clean_3',
    icon: '🌿',
    name: 'Čistý víkend+',
    desc: '3 dny v kuse úplně bez dávky.',
    target: 3,
    get: (s) => calcCleanStreak(s),
  },
  {
    id: 'water_7',
    icon: '💧',
    name: 'Hydratační rytmus',
    desc: '7 dní po sobě splněný denní cíl vody.',
    target: 7,
    get: (s) => calcWaterStreak(s),
  },
  {
    id: 'strains_5',
    icon: '🌈',
    name: 'Kolektor odrůd',
    desc: 'Použij alespoň 5 různých druhů.',
    target: 5,
    get: (s) => new Set(s.doses.map((d) => d.strainId).filter(Boolean)).size,
  },
  {
    id: 'budget_14',
    icon: '💰',
    name: 'Spořivá dvoutýdenní',
    desc: '14 dní v řadě s útratou pod denním rozpočtem.',
    target: 14,
    get: (s) => calcBudgetStreak(s),
  },
  {
    id: 'interval_pro',
    icon: '⏱️',
    name: 'Pán rozestupů',
    desc: '10 dávek v řadě se zdrženlivostí nad prahem.',
    target: 10,
    get: (s) => calcIntervalStreak(s),
  },
  {
    id: 'tbreak_done',
    icon: '🧘',
    name: 'Reset receptorů',
    desc: 'Dokonči jednu plnou T-Break pauzu.',
    target: 1,
    get: (s) => s.tbreakHistory.filter((t) => t.completed).length,
  },
  {
    id: 'tbreak_2',
    icon: '🧠',
    name: 'Veterán pauz',
    desc: 'Dokonči 2 plné T-Break pauzy.',
    target: 2,
    get: (s) => s.tbreakHistory.filter((t) => t.completed).length,
  },
  {
    id: 'backup_pro',
    icon: '💾',
    name: 'Data v bezpečí',
    desc: 'Proveď aspoň jednu zálohu dat (export).',
    target: 1,
    get: (s) => (s.settings.lastBackupAt ? 1 : 0),
  },
  {
    id: 'craving_aware',
    icon: '🤤',
    name: 'Znalec svého těla',
    desc: 'Zaznamenej 10 chutí.',
    target: 10,
    get: (s) => (s.cravingLogs || []).length,
  },
  {
    id: 'craving_accurate',
    icon: '🎯',
    name: 'Přesný jako hodinky',
    desc: '5× po sobě trefíš predikci chuti ± 45 minut.',
    target: 5,
    get: (s) => calcCravingPredictionStreak(s.cravingLogs || [], s.doses, s.settings),
  },
  {
    id: 'craving_trend_good',
    icon: '📉',
    name: 'Chuť pod kontrolou',
    desc: 'Trend chuti rostoucí (prodlužuje se) alespoň 14 dní.',
    target: 1,
    get: (s) => {
      const pred = predictNextCraving(s.cravingLogs || [], s.doses, s.settings);
      return pred.trend === 'falling' ? 1 : 0;
    },
  },
];
