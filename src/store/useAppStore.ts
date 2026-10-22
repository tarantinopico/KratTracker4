import { create } from 'zustand';
import { LEGACY_LS_KEY, LS_KEY } from '../constants/defaults';
import { defaultState } from '../constants/seeds';
import { predictNextCraving } from '../lib/cravingPrediction';
import { getLastSession } from '../lib/cravingSessions';
import { r1, r2, uid } from '../lib/format';
import { calcActiveMitAtTime } from '../lib/pharmacokinetics';
import { performReconciliation, revertReconciliation } from '../lib/reconcile';
import { getActivePackage } from '../lib/stock';
import {
  AnalyticsPeriod,
  AnalyticsSubTab,
  AppState,
  Beverage,
  CravingLog,
  CravingSeverity,
  Dose,
  HistoryFilterState,
  NavTab,
  Package,
  ReconcileMethod,
  Settings,
  Strain,
  ToastItem,
} from '../types';
import { migrateState } from './migrations';

function loadInitialState(): AppState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultState();
  }
  try {
    const rawV3 = window.localStorage.getItem(LS_KEY);
    const rawV2 = !rawV3 ? window.localStorage.getItem(LEGACY_LS_KEY) : null;
    const rawStr = rawV3 || rawV2;
    if (!rawStr) {
      const def = defaultState();
      if (window.location.search.includes('autostart=1')) {
        def.settings.onboarded = true;
      }
      window.localStorage.setItem(LS_KEY, JSON.stringify(def));
      return def;
    }
    const parsed = JSON.parse(rawStr);
    const candidate = parsed && parsed.state && parsed.state.settings ? parsed.state : parsed;
    const migrated = migrateState(candidate);
    if (window.location.search.includes('autostart=1')) {
      migrated.settings.onboarded = true;
    }
    window.localStorage.setItem(LS_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    const def = defaultState();
    return def;
  }
}

function extractPureState(s: AppState): AppState {
  return {
    settings: s.settings,
    strains: s.strains,
    packages: s.packages,
    beverages: s.beverages,
    doses: s.doses,
    waterLogs: s.waterLogs,
    tbreakHistory: s.tbreakHistory,
    achievements: s.achievements,
    cravingLogs: s.cravingLogs || [],
  };
}

function saveToLocalStorage(s: AppState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(extractPureState(s)));
  } catch {
    // ignore quota errors
  }
}

export interface ConfirmOptions {
  title: string;
  message: string;
  okText?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface AppStore extends AppState {
  // UI transient state
  activeTab: NavTab;
  anaSubTab: AnalyticsSubTab;
  anaPeriod: AnalyticsPeriod;
  stockFilter: 'active' | 'unopened' | 'finished';
  histFilter: HistoryFilterState;
  tickCount: number;
  cravingNotifiedForCurrentSession: boolean;

  // Modals & sheets
  doseModalOpen: boolean;
  editingDoseId: string | null;
  strainSheetOpen: boolean;
  editingStrainId: string | null;
  packageSheetOpen: boolean;
  editingPackageId: string | null;
  beverageSheetOpen: boolean;
  editingBeverageId: string | null;
  cravingSheetOpen: boolean;
  editingCravingId: string | null;
  reconcilePkgId: string | null;
  detailPackageId: string | null;
  helpSheetOpen: boolean;
  onboardingOpen: boolean;
  confirmDialog: ConfirmOptions | null;
  toasts: ToastItem[];

  // UI Actions
  setActiveTab: (tab: NavTab) => void;
  setAnaSubTab: (sub: AnalyticsSubTab) => void;
  setAnaPeriod: (p: AnalyticsPeriod) => void;
  setStockFilter: (f: 'active' | 'unopened' | 'finished') => void;
  setHistFilter: (patch: Partial<HistoryFilterState>) => void;
  tick: () => void;
  setCravingNotifiedForCurrentSession: (val: boolean) => void;

  openDoseModal: (doseId?: string | null) => void;
  closeDoseModal: () => void;
  openStrainSheet: (strainId?: string | null) => void;
  closeStrainSheet: () => void;
  openPackageSheet: (pkgId?: string | null) => void;
  closePackageSheet: () => void;
  openBeverageSheet: (bevId?: string | null) => void;
  closeBeverageSheet: () => void;
  openCravingSheet: (cravingId?: string | null) => void;
  closeCravingSheet: () => void;
  openReconcileSheet: (pkgId: string) => void;
  closeReconcileSheet: () => void;
  openPackageDetailSheet: (pkgId: string) => void;
  closePackageDetailSheet: () => void;
  setHelpSheetOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  askConfirm: (opts: ConfirmOptions) => void;
  closeConfirm: () => void;
  addToast: (message: string, opts?: Partial<Omit<ToastItem, 'id' | 'message'>>) => void;
  removeToast: (id: string) => void;

  // Domain Actions
  addDose: (dose: Dose) => void;
  updateDose: (id: string, patch: Partial<Dose>) => void;
  deleteDose: (id: string) => Dose | null;
  restoreDose: (dose: Dose) => void;
  quickLogDose: (amountG: number, strainId?: string) => Dose | null;

  addWater: (ml: number) => void;

  logCraving: (severity?: CravingSeverity, note?: string, strainId?: string | null) => void;
  updateCravingLog: (id: string, patch: Partial<CravingLog>) => void;
  deleteCravingLog: (id: string) => void;

  addStrain: (strain: Strain) => void;
  updateStrain: (id: string, patch: Partial<Strain>) => void;
  deleteStrain: (id: string) => void;

  addPackage: (pkg: Package) => void;
  updatePackage: (id: string, patch: Partial<Package>) => void;
  deletePackage: (id: string) => void;

  addBeverage: (bev: Beverage) => void;
  updateBeverage: (id: string, patch: Partial<Beverage>) => void;
  deleteBeverage: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  unlockAchievement: (id: string) => void;

  startTbreak: () => void;
  endTbreak: (completed: boolean) => void;

  applyReconciliation: (
    pkgId: string,
    selectedDoseIds: Set<string>,
    targetG: number,
    method: ReconcileMethod,
    calibrate: boolean
  ) => void;
  undoReconciliation: (pkgId: string) => void;

  markBackupDone: () => void;
  replaceState: (newState: AppState) => void;
  resetAll: () => void;
}

const initialState = loadInitialState();

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  activeTab: initialState.settings.startTab || 'dashboard',
  anaSubTab: initialState.settings.defaultAnalyticsSubTab || 'home',
  anaPeriod: 30,
  stockFilter: 'active',
  histFilter: {
    strain: 'all',
    days: 30,
    q: '',
    filterDayKey: null,
    view: 'list',
    calMonth: null,
  },
  tickCount: 0,
  cravingNotifiedForCurrentSession: false,

  doseModalOpen: false,
  editingDoseId: null,
  strainSheetOpen: false,
  editingStrainId: null,
  packageSheetOpen: false,
  editingPackageId: null,
  beverageSheetOpen: false,
  editingBeverageId: null,
  cravingSheetOpen: false,
  editingCravingId: null,
  reconcilePkgId: null,
  detailPackageId: null,
  helpSheetOpen: false,
  onboardingOpen: !initialState.settings.onboarded,
  confirmDialog: null,
  toasts: [],

  setActiveTab: (tab) =>
    set((s) => ({
      activeTab: tab,
      ...(tab === 'analytics' && s.settings.analyticsResetToHomeOnOpen !== false
        ? { anaSubTab: s.settings.defaultAnalyticsSubTab || 'home' }
        : {}),
    })),
  setAnaSubTab: (sub) => set({ anaSubTab: sub }),
  setAnaPeriod: (p) => set({ anaPeriod: p }),
  setStockFilter: (f) => set({ stockFilter: f }),
  setHistFilter: (patch) => set((s) => ({ histFilter: { ...s.histFilter, ...patch } })),
  tick: () => set((s) => ({ tickCount: s.tickCount + 1 })),
  setCravingNotifiedForCurrentSession: (val) => set({ cravingNotifiedForCurrentSession: val }),

  openDoseModal: (doseId = null) => set({ doseModalOpen: true, editingDoseId: doseId }),
  closeDoseModal: () => set({ doseModalOpen: false, editingDoseId: null }),
  openStrainSheet: (strainId = null) => set({ strainSheetOpen: true, editingStrainId: strainId }),
  closeStrainSheet: () => set({ strainSheetOpen: false, editingStrainId: null }),
  openPackageSheet: (pkgId = null) => set({ packageSheetOpen: true, editingPackageId: pkgId }),
  closePackageSheet: () => set({ packageSheetOpen: false, editingPackageId: null }),
  openBeverageSheet: (bevId = null) => set({ beverageSheetOpen: true, editingBeverageId: bevId }),
  closeBeverageSheet: () => set({ beverageSheetOpen: false, editingBeverageId: null }),
  openCravingSheet: (cravingId = null) =>
    set({ cravingSheetOpen: true, editingCravingId: cravingId }),
  closeCravingSheet: () => set({ cravingSheetOpen: false, editingCravingId: null }),
  openReconcileSheet: (pkgId) => set({ reconcilePkgId: pkgId }),
  closeReconcileSheet: () => set({ reconcilePkgId: null }),
  openPackageDetailSheet: (pkgId) => set({ detailPackageId: pkgId }),
  closePackageDetailSheet: () => set({ detailPackageId: null }),
  setHelpSheetOpen: (open) => set({ helpSheetOpen: open }),
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  askConfirm: (opts) => set({ confirmDialog: opts }),
  closeConfirm: () => set({ confirmDialog: null }),

  addToast: (message, opts = {}) => {
    const id = uid('t');
    const duration = opts.duration || 3200;
    set((s) => ({
      toasts: [...s.toasts.slice(-3), { id, message, ...opts }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),

  addDose: (dose) => {
    set((s) => {
      const packages = s.packages.map((p) => {
        if (p.id !== dose.packageId) return p;
        return {
          ...p,
          remainingWeightG: r2(Math.max(0, p.remainingWeightG - dose.amountG)),
          status: p.status === 'unopened' ? ('active' as const) : p.status,
          openedAt: p.status === 'unopened' ? Date.now() : p.openedAt,
        };
      });
      const settings = {
        ...s.settings,
        lastStrainId: dose.strainId,
        lastAmount: dose.amountG,
        lastBeverageId: dose.beverageId,
      };
      const next = {
        ...s,
        doses: [dose, ...s.doses],
        packages,
        settings,
        cravingNotifiedForCurrentSession: false,
      };
      saveToLocalStorage(next);
      return next;
    });
  },

  updateDose: (id, patch) => {
    set((s) => {
      const oldDose = s.doses.find((d) => d.id === id);
      if (!oldDose) return s;

      let packages = s.packages.map((p) => {
        if (p.id === oldDose.packageId) {
          return {
            ...p,
            remainingWeightG: r2(p.remainingWeightG + oldDose.amountG),
          };
        }
        return p;
      });

      const merged: Dose = { ...oldDose, ...patch };
      if (patch.amountG !== undefined && patch.amountG !== oldDose.amountG) {
        merged.calibrated = false;
        delete merged.calibrationDiff;
        delete merged.originalAmountG;
      }

      if (merged.packageId) {
        packages = packages.map((p) => {
          if (p.id === merged.packageId) {
            return {
              ...p,
              remainingWeightG: r2(Math.max(0, p.remainingWeightG - merged.amountG)),
              status: p.status === 'unopened' ? ('active' as const) : p.status,
              openedAt: p.status === 'unopened' ? Date.now() : p.openedAt,
            };
          }
          return p;
        });
      }

      const doses = s.doses.map((d) => (d.id === id ? merged : d));
      const next = { ...s, doses, packages };
      saveToLocalStorage(next);
      return next;
    });
  },

  deleteDose: (id) => {
    const s = get();
    const target = s.doses.find((d) => d.id === id);
    if (!target) return null;

    set((state) => {
      const packages = state.packages.map((p) => {
        if (p.id === target.packageId) {
          return {
            ...p,
            remainingWeightG: r2(p.remainingWeightG + target.amountG),
          };
        }
        return p;
      });
      const doses = state.doses.filter((d) => d.id !== id);
      const next = { ...state, doses, packages };
      saveToLocalStorage(next);
      return next;
    });
    return target;
  },

  restoreDose: (dose) => {
    set((s) => {
      const packages = s.packages.map((p) => {
        if (p.id === dose.packageId) {
          return {
            ...p,
            remainingWeightG: r2(Math.max(0, p.remainingWeightG - dose.amountG)),
          };
        }
        return p;
      });
      const doses = [dose, ...s.doses];
      const next = { ...s, doses, packages };
      saveToLocalStorage(next);
      return next;
    });
  },

  quickLogDose: (amountG, strainIdArg) => {
    const s = get();
    const sid = strainIdArg || s.settings.lastStrainId || s.strains[0]?.id;
    const strain = s.strains.find((x) => x.id === sid) || s.strains[0];
    if (!strain) return null;

    const pkg = s.settings.autoSelectActivePackage ? getActivePackage(s.packages, strain.id) : null;
    const bev = s.beverages.find((b) => b.id === 'bev_water') || s.beverages[0];
    const pricePerG = pkg ? pkg.pricePerG : strain.pricePerG || s.settings.defaultPricePerG;
    const mitPct = strain.mitPct || s.settings.defaultMitPct || 1.45;
    const sevenOhPct = strain.sevenOhPct || s.settings.defaultSevenOhPct || 0.025;
    const amt = r2(amountG);

    const newDose: Dose = {
      id: uid('d'),
      strainId: strain.id,
      strainName: strain.name,
      strainColor: strain.color,
      packageId: pkg ? pkg.id : null,
      amountG: amt,
      timestamp: Date.now(),
      pricePerG,
      cost: r2(amt * pricePerG),
      beverageId: bev?.id || 'bev_water',
      beverageName: bev?.name || 'Voda',
      beverageIcon: bev?.icon || '💧',
      beverageCost: bev?.cost || 0,
      rating: 4,
      effect: 'energy',
      mitPct,
      sevenOhPct,
      mitMg: r2(amt * mitPct * 10),
      sevenOhMg: r2(amt * sevenOhPct * 10),
      note: '',
      calibrated: false,
    };

    get().addDose(newDose);
    return newDose;
  },

  addWater: (ml) => {
    set((s) => {
      const next = {
        ...s,
        waterLogs: [
          { id: uid('w'), timestamp: Date.now(), amountMl: Math.round(ml) },
          ...s.waterLogs,
        ],
      };
      saveToLocalStorage(next);
      return next;
    });
  },

  logCraving: (severity = 3, note = '', strainId) => {
    const s = get();
    const now = Date.now();
    const windowMin = s.settings.cravingSessionWindowMin || 60;
    const lastSession = getLastSession(s.doses, windowMin);

    if (!lastSession) {
      s.addToast('Nejdřív zaznamenej dávku', { type: 'danger' });
      return;
    }

    const trimmedNote = note.trim();
    const finalNote = s.settings.tbreakActive
      ? trimmedNote.startsWith('T-break')
        ? trimmedNote
        : trimmedNote
        ? `T-break: ${trimmedNote}`
        : 'T-break'
      : trimmedNote;

    const sortedCravings = [...(s.cravingLogs || [])].sort((a, b) => b.timestamp - a.timestamp);
    const lastLog = sortedCravings[0];

    if (lastLog && now - lastLog.timestamp < 30 * 60_000) {
      const minsAgo = Math.max(1, Math.round((now - lastLog.timestamp) / 60_000));
      s.askConfirm({
        title: 'Aktualizovat nedávný záznam?',
        message: `Před ${minsAgo} min jsi už chuť zaznamenal. Aktualizovat intenzitu?`,
        okText: 'Aktualizovat',
        danger: false,
        onConfirm: () => {
          get().updateCravingLog(lastLog.id, {
            severity,
            note: finalNote || lastLog.note,
            ...(strainId !== undefined ? { strainId } : {}),
          });
          get().closeCravingSheet();
          get().addToast('Záznam chuti aktualizován', { type: 'good' });
        },
      });
      return;
    }

    const activeMitAtCraving = calcActiveMitAtTime(s.doses, s.settings, now);
    const hoursSinceSessionEnd = r2(Math.max(0, (now - lastSession.endTime) / 3600_000));

    // Evaluate what the prediction was for this session
    const evalTs = Math.min(now, lastSession.endTime + 31 * 60_000);
    const sessionPred = predictNextCraving(s.cravingLogs || [], s.doses, s.settings, evalTs);
    const previousPredictionAt = sessionPred.available ? sessionPred.predictedAt : null;

    const newLog: CravingLog = {
      id: uid('cr'),
      timestamp: now,
      lastSessionEnd: lastSession.endTime,
      lastSessionTotalG: lastSession.totalG,
      lastSessionCount: lastSession.doseIds.length,
      hoursSinceSessionEnd,
      activeMitAtCraving,
      severity,
      strainId: strainId !== undefined ? strainId : lastSession.dominantStrainId,
      note: finalNote,
      previousPredictionAt,
    };

    set((state) => {
      const next = {
        ...state,
        cravingLogs: [newLog, ...(state.cravingLogs || [])],
        cravingSheetOpen: false,
        editingCravingId: null,
      };
      saveToLocalStorage(next);
      return next;
    });

    get().addToast('Chuť zaznamenána', { type: 'good' });
  },

  updateCravingLog: (id, patch) => {
    set((s) => {
      const cravingLogs = (s.cravingLogs || []).map((c) =>
        c.id === id ? { ...c, ...patch } : c
      );
      const next = { ...s, cravingLogs };
      saveToLocalStorage(next);
      return next;
    });
  },

  deleteCravingLog: (id) => {
    set((s) => {
      const cravingLogs = (s.cravingLogs || []).filter((c) => c.id !== id);
      const next = { ...s, cravingLogs };
      saveToLocalStorage(next);
      return next;
    });
  },

  addStrain: (strain) => {
    set((s) => {
      const next = { ...s, strains: [...s.strains, strain] };
      saveToLocalStorage(next);
      return next;
    });
  },

  updateStrain: (id, patch) => {
    set((s) => {
      const strains = s.strains.map((st) => (st.id === id ? { ...st, ...patch } : st));
      const next = { ...s, strains };
      saveToLocalStorage(next);
      return next;
    });
  },

  deleteStrain: (id) => {
    set((s) => {
      if (s.strains.length <= 1) return s;
      const strains = s.strains.filter((st) => st.id !== id);
      const next = { ...s, strains };
      saveToLocalStorage(next);
      return next;
    });
  },

  addPackage: (pkg) => {
    set((s) => {
      const next = { ...s, packages: [pkg, ...s.packages] };
      saveToLocalStorage(next);
      return next;
    });
  },

  updatePackage: (id, patch) => {
    set((s) => {
      const packages = s.packages.map((p) => {
        if (p.id !== id) return p;
        let remainingWeightG = patch.remainingWeightG ?? p.remainingWeightG;
        if (patch.initialWeightG !== undefined && patch.remainingWeightG === undefined) {
          remainingWeightG = Math.max(
            0,
            r2(p.remainingWeightG + (patch.initialWeightG - p.initialWeightG))
          );
        }
        return { ...p, ...patch, remainingWeightG };
      });
      const next = { ...s, packages };
      saveToLocalStorage(next);
      return next;
    });
  },

  deletePackage: (id) => {
    set((s) => {
      const packages = s.packages.filter((p) => p.id !== id);
      const doses = s.doses.map((d) => (d.packageId === id ? { ...d, packageId: null } : d));
      const next = { ...s, packages, doses };
      saveToLocalStorage(next);
      return next;
    });
  },

  addBeverage: (bev) => {
    set((s) => {
      const next = { ...s, beverages: [...s.beverages, bev] };
      saveToLocalStorage(next);
      return next;
    });
  },

  updateBeverage: (id, patch) => {
    set((s) => {
      const beverages = s.beverages.map((b) => (b.id === id ? { ...b, ...patch } : b));
      const next = { ...s, beverages };
      saveToLocalStorage(next);
      return next;
    });
  },

  deleteBeverage: (id) => {
    if (id === 'bev_water') return;
    set((s) => {
      const beverages = s.beverages.filter((b) => b.id !== id);
      const next = { ...s, beverages };
      saveToLocalStorage(next);
      return next;
    });
  },

  updateSettings: (patch) => {
    set((s) => {
      const next = { ...s, settings: { ...s.settings, ...patch } };
      saveToLocalStorage(next);
      return next;
    });
  },

  unlockAchievement: (id) => {
    set((s) => {
      if (s.achievements[id]) return s;
      const next = {
        ...s,
        achievements: { ...s.achievements, [id]: Date.now() },
      };
      saveToLocalStorage(next);
      return next;
    });
  },

  startTbreak: () => {
    set((s) => {
      const next = {
        ...s,
        settings: {
          ...s.settings,
          tbreakActive: true,
          tbreakStartedAt: Date.now(),
        },
      };
      saveToLocalStorage(next);
      return next;
    });
  },

  endTbreak: (completed) => {
    set((s) => {
      const now = Date.now();
      const startedAt = s.settings.tbreakStartedAt || now;
      const elapsedMs = Math.max(0, now - startedAt);
      const rec = {
        id: uid('tb'),
        startedAt,
        endedAt: now,
        goalHours: s.settings.tbreakGoalHours || 72,
        hoursDone: r1(elapsedMs / 3600000),
        completed,
      };
      const next = {
        ...s,
        tbreakHistory: [rec, ...s.tbreakHistory],
        settings: {
          ...s.settings,
          tbreakActive: false,
          tbreakStartedAt: null,
        },
      };
      saveToLocalStorage(next);
      return next;
    });
  },

  applyReconciliation: (pkgId, selectedDoseIds, targetG, method, calibrate) => {
    set((s) => {
      const { packages, doses } = performReconciliation(
        s,
        pkgId,
        selectedDoseIds,
        targetG,
        method,
        calibrate
      );
      const next = { ...s, packages, doses };
      saveToLocalStorage(next);
      return next;
    });
  },

  undoReconciliation: (pkgId) => {
    set((s) => {
      const { packages, doses } = revertReconciliation(s, pkgId);
      const next = { ...s, packages, doses };
      saveToLocalStorage(next);
      return next;
    });
  },

  markBackupDone: () => {
    set((s) => {
      const next = {
        ...s,
        settings: { ...s.settings, lastBackupAt: Date.now() },
      };
      saveToLocalStorage(next);
      return next;
    });
  },

  replaceState: (newState) => {
    const migrated = migrateState(newState);
    saveToLocalStorage(migrated);
    set({
      ...migrated,
    });
  },

  resetAll: () => {
    const fresh = defaultState();
    fresh.settings.onboarded = true;
    saveToLocalStorage(fresh);
    set({
      ...fresh,
    });
  },
}));
