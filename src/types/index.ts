export type EffectType = 'energy' | 'focus' | 'relax' | 'pain' | 'sleep';
export type ThemeId = 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose' | 'gold' | 'custom';
export type PackageStatus = 'active' | 'unopened' | 'finished';
export type ReconcileMethod = 'proportional' | 'uniform';
export type DialStyle = 'precision' | 'concentric';
export type Density = 'normal' | 'compact';
export type FontScale = 'normal' | 'large' | 'xlarge';
export type StartTab = 'dashboard' | 'stock' | 'history' | 'analytics';
export type NavTab = 'dashboard' | 'stock' | 'history' | 'analytics' | 'settings';
export type AnalyticsSubTab = 'home' | 'summary' | 'intervals' | 'strains' | 'craving' | 'health' | 'achievements';
export type SettingsSubTab =
  | 'hub'
  | 'appearance'
  | 'limits'
  | 'kinetics'
  | 'stock'
  | 'analytics'
  | 'modules'
  | 'catalogs'
  | 'data'
  | 'about';
export type CardRadiusScale = 'sharp' | 'normal' | 'rounded';
export type BorderContrast = 'subtle' | 'normal' | 'high';
export type HapticIntensity = 'light' | 'medium' | 'heavy';
export type AnalyticsPeriod = 7 | 14 | 30 | 90 | 'all';
export type CravingSeverity = 1 | 2 | 3 | 4 | 5;

export interface CravingLog {
  id: string;
  timestamp: number;                    // kdy uživatel zmáčkl tlačítko

  // Snapshot při záznamu — neměnit při pozdějších úpravách dávek:
  lastSessionEnd: number;               // čas konce poslední "session"
  lastSessionTotalG: number;            // součet dávek v session
  lastSessionCount: number;
  hoursSinceSessionEnd: number;

  // Klíčový fyziologický prediktor:
  activeMitAtCraving: number;           // calcActiveMitAtTime(timestamp)

  // Volitelné:
  severity: CravingSeverity;            // default 3
  strainId: string | null;              // dominantní strain poslední session
  note: string;
  previousPredictionAt?: number | null; // pro vyhodnocení přesnosti predikce
}

export interface Strain {
  id: string;
  name: string;
  pricePerG: number;
  packageSizeG: number;
  mitPct: number;          // % MIT (typically 1.45)
  sevenOhPct: number;      // % 7-OH (typically 0.025)
  color: string;           // hex
  note: string;
  createdAt: number;       // timestamp ms
}

export interface PackageReconciliation {
  date: number;
  method: ReconcileMethod;
  targetWeightG: number;
  diff: number;            // positive = doses increased, negative = decreased
  factor: number;
  delta: number;
  doseIds: string[];
  originalAmounts: Record<string, number>;
}

export interface Package {
  id: string;
  strainId: string;
  name: string;
  initialWeightG: number;
  remainingWeightG: number;
  costTotal: number;
  pricePerG: number;
  status: PackageStatus;
  openedAt: number | null;
  finishedAt: number | null;
  note: string;
  calibrated: boolean;
  reconciliation?: PackageReconciliation;
}

export interface Beverage {
  id: string;
  name: string;
  icon: string;   // emoji
  cost: number;
  note: string;
  color?: string;
}

export interface Dose {
  id: string;
  strainId: string;
  strainName: string;      // snapshot for history
  strainColor: string;     // snapshot
  packageId: string | null;
  amountG: number;
  timestamp: number;
  pricePerG: number;
  cost: number;            // amountG * pricePerG
  beverageId: string;
  beverageName: string;
  beverageIcon: string;
  beverageCost: number;
  rating: number;          // 0-5
  effect: EffectType;
  mitPct: number;
  sevenOhPct: number;
  mitMg: number;           // amountG * mitPct * 10
  sevenOhMg: number;       // amountG * sevenOhPct * 10
  note: string;
  calibrated?: boolean;
  calibrationDiff?: number;
  originalAmountG?: number;
}

export interface WaterLog {
  id: string;
  timestamp: number;
  amountMl: number;
}

export interface TBreakRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  goalHours: number;
  hoursDone: number;
  completed: boolean;
}

export type CalculationMode = 'smart' | 'classic';

export interface Settings {
  currency: string;
  theme: ThemeId;
  // Limits & budgets
  dailyLimitG: number;
  dailyHardLimitG: number;
  dailyBudgetKc: number;
  monthlyBudgetKc: number;
  cooldownMin: number;
  haptics: boolean;
  // Pharmacokinetics
  bodyWeightKg: number;
  mitHalfLifeAlphaH: number;
  mitHalfLifeBetaH: number;
  mitTMaxH: number;
  defaultMitPct: number;
  defaultSevenOhPct: number;
  mitBioavailabilityPct: number;
  mitAlphaSharePct: number;
  // Tolerance
  toleranceRecoveryPerDay: number;
  tolerancePenaltyLimit: number;
  tolerancePenaltyInterval: number;
  toleranceConsecutiveDaysPenalty: number;
  tbreakActive: boolean;
  tbreakStartedAt: number | null;
  tbreakGoalHours: number;
  // Smart Tolerance & Receptor Load Model
  toleranceModelMode: CalculationMode;
  toleranceWindowDays: number;
  toleranceDecayHalfLifeDays: number;
  toleranceSevenOhMultiplier: number;
  toleranceSpacingBonusPct: number;
  toleranceRotationBonusPct: number;
  toleranceBaselineG: number;
  acuteHillMidpointMg: number;
  acuteHillSlope: number;
  acuteWashoutThresholdMg: number;
  idealFastingWindowH: number;
  toleranceAcuteWeightPct: number;
  // Tapering
  taperingEnabled: boolean;
  taperingStartG: number;
  taperingTargetG: number;
  taperingStepG: number;
  taperingDaysInterval: number;
  taperingStartedAt: number | null;
  taperingWeeklyReductionPct: number;
  // Hydration
  dailyWaterGoalMl: number;
  waterPerGramKratomMl: number;
  waterQuickMl1: number;
  waterQuickMl2: number;
  // Dosing
  defaultDoseG: number;
  quickDosePresets: number[];
  autoSelectActivePackage: boolean;
  doseStepDefault: number;
  // Inventory
  defaultReconcileMethod: ReconcileMethod;
  reconcileAutoIncludeUnassigned: boolean;
  lowStockWarningG: number;
  defaultPackageWeightG: number;
  defaultPricePerG: number;
  // Smart Stock & Visualization
  stockShowVisualization: boolean;
  stockShowStrainBreakdown: boolean;
  stockEnablePackageDetails: boolean;
  stockForecastMode: CalculationMode;
  stockForecastWindowDays: number;
  stockDecayHalfLifeDays: number;
  stockIncludeUnopenedInEta: boolean;
  stockLowDaysWarning: number;
  // Module switches
  showAlkaloids: boolean;
  showFinances: boolean;
  enableBeverages: boolean;
  enableHydration: boolean;
  enableMoodRating: boolean;
  enableHeatmap: boolean;
  enableQuickLog: boolean;
  enablePharmacokinetics: boolean;
  enableReceptorScore: boolean;
  enableHourlyDistribution: boolean;
  enableStrainRotationAdvice: boolean;
  enableAchievements: boolean;
  enableCalendarView: boolean;
  enableSmartInsights: boolean;
  enableNotifications: boolean;
  // Advanced Analytics & New Chart switches
  anaShowAdvancedStats: boolean;
  anaShowReceptorBreakdown: boolean;
  anaShowStrainEfficiency: boolean;
  anaShowRadarChart: boolean;
  anaShowCumulativeChart: boolean;
  anaShowWeekdayChart: boolean;
  anaShowAlkaloidRatioChart: boolean;
  anaShowDoseEfficiencyScatter: boolean;
  // Bento Home Hub switches
  analyticsResetToHomeOnOpen: boolean;
  bentoShowLivePlasma: boolean;
  bentoShow7dSparkline: boolean;
  bentoShowReceptorGauge: boolean;
  bentoShowRadarProfile: boolean;
  bentoShowWeekdayStrip: boolean;
  bentoShowStrainMix: boolean;
  bentoShowStockRunway: boolean;
  bentoShowFinancePace: boolean;
  bentoShowHydrationCraving: boolean;
  bentoShowCircadianMini: boolean;
  bentoShowQuickJumps: boolean;
  // Chart visual parameters
  chartLineThickness: number;
  chartShowGridLines: boolean;
  chartFillOpacityPct: number;
  // Analytics
  intervalComplianceThresholdH: number;
  diversityWarningThreshold: number;
  defaultAnalyticsSubTab: AnalyticsSubTab;
  dashboardShowSparklines: boolean;
  dashboardDialStyle: DialStyle;
  // Privacy & appearance
  privacyMode: boolean;
  uiDensity: Density;
  fontScale: FontScale;
  glassBlurPx: number;
  cardRadiusScale: CardRadiusScale;
  borderContrast: BorderContrast;
  animationsEnabled: boolean;
  decimalPrecision: 1 | 2;
  startTab: StartTab;
  timeFormat24: boolean;
  weekStartsMonday: boolean;
  customAccentHex: string;
  // Behavior
  confirmBeforeDelete: boolean;
  soundsEnabled: boolean;
  soundFrequencyHz: number;
  hapticIntensity: HapticIntensity;
  dayStartHour: number;
  dashRecentDosesCount: number;
  // State shortcuts
  lastStrainId: string | null;
  lastAmount: number;
  lastBeverageId: string;
  // Backup
  lastBackupAt: number | null;
  autoBackupReminderDays: number;
  onboarded: boolean;
  settingsSchemaVersion: number;
  // Dashboard layout
  dashShowQuickRow: boolean;
  dashShowHud: boolean;
  dashShowInsight: boolean;
  dashShowHero: boolean;
  dashShowTelem: boolean;
  dashShowTimeline: boolean;
  dashShowWater: boolean;
  dashShowActivity: boolean;
  dashShowStats: boolean;
  // History
  histCompactRows: boolean;
  histShowFilters: boolean;
  // Dose modal
  modalShowPreview: boolean;
  modalShowMitEstimate: boolean;
  quickLogConfirm: boolean;
  modalShowNoteTags: boolean;
  // Craving tracker
  enableCravingTracker: boolean;
  cravingSeverityRequired: boolean;
  cravingSessionWindowMin: number;
  cravingPredictionThresholdMin: number;
  cravingNotificationEnabled: boolean;
  cravingNotificationLeadMin: number;
  cravingShowOnDashboard: boolean;
}

export interface AppState {
  settings: Settings;
  strains: Strain[];
  packages: Package[];
  beverages: Beverage[];
  doses: Dose[];
  waterLogs: WaterLog[];
  tbreakHistory: TBreakRecord[];
  achievements: Record<string, number>;
  cravingLogs: CravingLog[];
}

export interface HistoryFilterState {
  strain: string;              // 'all' | strainId
  days: number | 'all';
  q: string;
  filterDayKey: string | null;
  view: 'list' | 'cal';
  calMonth: string | null;     // 'YYYY-M'
}

export interface DoseDistributionBin {
  label: string;
  color: string;
  count: number;
  pct: number;
}

export interface DoseDistributionResult {
  bins: DoseDistributionBin[];
  total: number;
  median: number;
  mode: number;
  stdDev: number;
  mean: number;
}

export interface DailyAnalyticsEntry {
  ts: number;
  dayKey: string;
  g: number;
  mitMg: number;
  sevenOhMg: number;
  kratomCost: number;
  bevCost: number;
  dosesCount: number;
}

export interface StrainPartSummary {
  id: string;
  name: string;
  color: string;
  g: number;
  cost: number;
  count: number;
  avgRating: number | null;
}

export interface AnalyticsContext {
  days: number;
  curStart: number;
  curEnd: number;
  curDoses: Dose[];
  priorDoses: Dose[];
  curG: number;
  priorG: number;
  curMit: number;
  priorMit: number;
  cur7Oh: number;
  prior7Oh: number;
  curCost: number;
  priorCost: number;
  curKratomCost: number;
  curBevCost: number;
  curAvgG: number;
  priorAvgG: number;
  curAvgDoseG: number;
  priorAvgDoseG: number;
  daily: DailyAnalyticsEntry[];
  peakDayG: number;
  peakDayMit: number;
  activeDaysCount: number;
  last7Days: DailyAnalyticsEntry[];
  last7AvgG: number;
  ma7vsAvgDiff: number;
  stockTotalG: number;
  runwayDays: number | string;
  projAnnualKg: number;
  projAnnualKc: number;
  costPerG: number;
  costPerDose: number;
  mgPerKg: number;
  toleranceHistory: Array<{ ts: number; score: number }>;
  curTolScore: number;
  recPerDay: number;
  daysTo90: number;
  doseDist: DoseDistributionResult;
  strainParts: StrainPartSummary[];
  sortedCurDoses: Dose[];
  avgCooldownH: number | null;
  st: Settings;
  L: number;
  hardL: number;
  B: number;
}

export interface SmartInsight {
  icon: string;
  cls: 'good' | 'warn' | 'danger';
  title?: string;
  text: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type?: 'default' | 'good' | 'warn' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}
