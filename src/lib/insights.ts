import { AnalyticsContext, CravingLog, Dose, Settings, SmartInsight } from '../types';
import { calcStrainDiversityIndex } from './analytics';
import { predictNextCraving } from './cravingPrediction';
import { dayKey, startOfToday } from './date';
import { fmtG, fmtKc } from './format';
import { calcActiveMitAtTime } from './pharmacokinetics';

export function getSmartInsights(ctx: AnalyticsContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { st } = ctx;

  if (ctx.curDoses.length === 0) {
    return [
      {
        icon: '🌿',
        cls: 'good',
        text: 'Čisté období — v tomto časovém okně nejsou zaznamenány žádné dávky.',
      },
    ];
  }

  // 1. Změna průměru ≥ ±15 % vs předchozí období
  if (ctx.priorAvgG > 0) {
    const pctDiff = Math.round(((ctx.curAvgG - ctx.priorAvgG) / ctx.priorAvgG) * 100);
    if (pctDiff >= 15) {
      insights.push({
        icon: '📈',
        cls: 'warn',
        text: `Průměrná spotřeba stoupla o +${pctDiff} % oproti předchozímu období (${fmtG(ctx.curAvgG)} g/den).`,
      });
    } else if (pctDiff <= -15) {
      insights.push({
        icon: '📉',
        cls: 'good',
        text: `Skvělý trend: denní průměr klesl o ${Math.abs(pctDiff)} % oproti minulému období.`,
      });
    }
  }

  // 2. Peak den nad limitem
  if (ctx.L > 0 && ctx.peakDayG > ctx.L) {
    insights.push({
      icon: '⚠️',
      cls: 'warn',
      text: `Nejvyšší denní odběr (${fmtG(ctx.peakDayG)} g) překročil cílový limit ${fmtG(ctx.L)} g.`,
    });
  }

  // 3. Projekce měsíční útraty
  const projMonthly = (ctx.curCost / ctx.days) * 30.44;
  if (st.monthlyBudgetKc > 0) {
    if (projMonthly > st.monthlyBudgetKc * 1.15) {
      insights.push({
        icon: '💸',
        cls: 'danger',
        text: `Projekce měsíční útraty (${fmtKc(projMonthly, st.currency)}) výrazně převyšuje rozpočet ${fmtKc(st.monthlyBudgetKc, st.currency)}.`,
      });
    } else if (projMonthly > st.monthlyBudgetKc) {
      insights.push({
        icon: '💰',
        cls: 'warn',
        text: `Měsíční tempo útraty (${fmtKc(projMonthly, st.currency)}) mírně překračuje stanovený rozpočet.`,
      });
    } else {
      insights.push({
        icon: '✅',
        cls: 'good',
        text: `Finanční tempo (${fmtKc(projMonthly, st.currency)}/měs.) držíš bezpečně pod rozpočtem.`,
      });
    }
  }

  // 4. Runway skladu
  if (typeof ctx.runwayDays === 'number') {
    if (ctx.runwayDays <= 7) {
      insights.push({
        icon: '📦',
        cls: 'danger',
        text: `Nízká zásoba ve skladu (${fmtG(ctx.stockTotalG)} g) — při současném tempu vystačí jen na ~${ctx.runwayDays} d.`,
      });
    } else if (ctx.runwayDays <= 14) {
      insights.push({
        icon: '📦',
        cls: 'warn',
        text: `Skladová zásoba vystačí přibližně na ${ctx.runwayDays} dní.`,
      });
    }
  }

  // 5. Průměrný cooldown
  const th = st.intervalComplianceThresholdH || 4;
  if (ctx.avgCooldownH !== null) {
    if (ctx.avgCooldownH < th) {
      insights.push({
        icon: '⏱️',
        cls: 'warn',
        text: `Průměrný odstup mezi dávkami (${ctx.avgCooldownH} h) je kratší než doporučených ${th} h.`,
      });
    } else {
      insights.push({
        icon: '⏱️',
        cls: 'good',
        text: `Průměrný rozestup dávek ${ctx.avgCooldownH} h splňuje nastavený práh disciplíny.`,
      });
    }
  }

  // 6. mg MIT / kg > 1.5
  if (ctx.mgPerKg > 1.5) {
    insights.push({
      icon: '🧬',
      cls: 'warn',
      text: `Denní zátěž mitragyninu (${ctx.mgPerKg} mg/kg) přesahuje orientační hranici 1,5 mg/kg.`,
    });
  }

  // 7. Rotace odrůd
  const div = calcStrainDiversityIndex(ctx.curDoses, st.diversityWarningThreshold || 3);
  if (div.streak >= (st.diversityWarningThreshold || 3)) {
    insights.push({
      icon: '🔄',
      cls: 'warn',
      text: `Druh ${div.lastStrainName} byl použit ${div.streak}× v řadě — zvaž rotaci odrůdy.`,
    });
  }

  // 8. Citlivost receptorů
  if (ctx.curTolScore < 60) {
    insights.push({
      icon: '🧠',
      cls: 'danger',
      text: `Citlivost receptorů klesla na ${ctx.curTolScore} % — krátký T-Break pomůže s regenerací.`,
    });
  } else if (ctx.curTolScore >= 90) {
    insights.push({
      icon: '⚡',
      cls: 'good',
      text: `Vysoká citlivost receptorů (${ctx.curTolScore} %) — nízká tolerance a dobrá odezva.`,
    });
  }

  return insights.slice(0, 6);
}

export function getCravingInsights(
  cravingLogs: CravingLog[],
  doses: Dose[],
  settings: Settings,
  now = Date.now()
): SmartInsight[] {
  if (!settings.enableCravingTracker) return [];
  const res: SmartInsight[] = [];
  const pred = predictNextCraving(cravingLogs, doses, settings, now);

  // 1. Trend zkracování
  if (pred.trend === 'rising' && pred.trendDeltaH !== null && pred.trendDeltaH < -1) {
    res.push({
      icon: '🔥',
      cls: 'warn',
      text: `Tvoje chutě přicházejí o ${fmtG(Math.abs(pred.trendDeltaH))} h dříve než minulý týden. Tolerance roste — zvaž T-break nebo snížení dávky.`,
    });
  }

  const sortedCravings = [...(cravingLogs || [])].sort((a, b) => b.timestamp - a.timestamp);
  const lastCraving = sortedCravings[0] || null;

  // 2. Nedávná chuť bez záznamu
  if (pred.mitThresholdMg !== null && doses.length > 0) {
    const curMit = calcActiveMitAtTime(doses, settings, now);
    const hoursSinceLastCraving = lastCraving
      ? (now - lastCraving.timestamp) / 3600_000
      : 999;
    if (curMit < pred.mitThresholdMg && hoursSinceLastCraving > 12) {
      res.push({
        icon: '🌿',
        cls: 'good',
        text: 'MIT je pod tvým prahem, ale chuť jsi dlouho nezaznamenal. Dobrý stav.',
      });
    }
  }

  // 3. Nad limitem
  const dayStartHour = settings.dayStartHour || 0;
  const todayKey = dayKey(startOfToday(dayStartHour, now), dayStartHour);
  const todayG = doses
    .filter((d) => dayKey(d.timestamp, dayStartHour) === todayKey)
    .reduce((a, d) => a + d.amountG, 0);
  const dailyLimitG = settings.dailyLimitG || 10;

  if (
    dailyLimitG > 0 &&
    todayG > dailyLimitG &&
    lastCraving &&
    dayKey(lastCraving.timestamp, dayStartHour) === todayKey
  ) {
    res.push({
      icon: '⚠️',
      cls: 'warn',
      text: 'Dnes jsi nad limitem a už jsi zaznamenal chuť. Dej tělu pauzu.',
    });
  }

  return res;
}
