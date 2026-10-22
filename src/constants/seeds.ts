import { AppState, Beverage, Dose, EffectType, Package, Strain, WaterLog } from '../types';
import { DEFAULT_SETTINGS } from './defaults';
import { r1 } from '../lib/format';
import { calcActiveMitAtTime } from '../lib/pharmacokinetics';

export function seedStrains(now = Date.now()): Strain[] {
  return [
    {
      id: 's_gbo',
      name: 'Zelený Borneo',
      pricePerG: 8,
      packageSizeG: 100,
      mitPct: 1.55,
      sevenOhPct: 0.025,
      color: '#30D158',
      note: 'Vyvážený střed a čistá nálada',
      createdAt: now,
    },
    {
      id: 's_bth',
      name: 'Bílý Thailand',
      pricePerG: 7,
      packageSizeG: 50,
      mitPct: 1.45,
      sevenOhPct: 0.02,
      color: '#E5E5EA',
      note: 'Ranní energie a soustředění',
      createdAt: now,
    },
    {
      id: 's_rba',
      name: 'Červený Bali',
      pricePerG: 7,
      packageSizeG: 50,
      mitPct: 1.20,
      sevenOhPct: 0.035,
      color: '#FF453A',
      note: 'Večerní zklidnění a úleva',
      createdAt: now,
    },
    {
      id: 's_yvi',
      name: 'Žlutý Vietnam',
      pricePerG: 8,
      packageSizeG: 50,
      mitPct: 1.35,
      sevenOhPct: 0.02,
      color: '#FF9F0A',
      note: 'Pohoda a relax',
      createdAt: now,
    },
  ];
}

export function seedPackages(_strains?: Strain[], now = Date.now()): Package[] {
  const day = 86400000;
  return [
    {
      id: 'pkg_gbo',
      strainId: 's_gbo',
      name: 'Velké balení 100g',
      initialWeightG: 100,
      remainingWeightG: 76.5,
      costTotal: 800,
      pricePerG: 8,
      status: 'active',
      openedAt: now - 4 * day,
      finishedAt: null,
      note: 'Šarže G-2024',
      calibrated: false,
    },
    {
      id: 'pkg_bth',
      strainId: 's_bth',
      name: 'Sáček 50g',
      initialWeightG: 50,
      remainingWeightG: 41,
      costTotal: 350,
      pricePerG: 7,
      status: 'active',
      openedAt: now - 2 * day,
      finishedAt: null,
      note: '',
      calibrated: false,
    },
    {
      id: 'pkg_rba',
      strainId: 's_rba',
      name: 'Zásoba Bali 50g',
      initialWeightG: 50,
      remainingWeightG: 50,
      costTotal: 350,
      pricePerG: 7,
      status: 'unopened',
      openedAt: null,
      finishedAt: null,
      note: 'Nerozbaleno',
      calibrated: false,
    },
  ];
}

export function seedBeverages(): Beverage[] {
  return [
    { id: 'bev_water', name: 'Voda', icon: '💧', cost: 0, note: 'Základní tekutina', color: '#0A84FF' },
    { id: 'bev_orange', name: 'Pomerančový džus', icon: '🍊', cost: 15, note: 'Zjemňuje chuť a podporuje vstřebávání', color: '#FF9F0A' },
    { id: 'bev_grapefruit', name: 'Grepový džus', icon: '🍋', cost: 20, note: 'Přírodní podpora', color: '#FFD60A' },
    { id: 'bev_tea', name: 'Teplý bylinný čaj', icon: '🍵', cost: 8, note: 'Šetrný k žaludku', color: '#30D158' },
    { id: 'bev_soda', name: 'Limonáda / Kofola', icon: '🥤', cost: 18, note: 'Sladký nápoj', color: '#BF5AF2' },
  ];
}

export function seedDoses(
  strains: Strain[] = seedStrains(),
  packages: Package[] = seedPackages(strains),
  beverages: Beverage[] = seedBeverages(),
  now = Date.now()
): Dose[] {
  const day = 86400000;
  const hour = 3600000;

  const raw: Array<{
    id: string;
    strainId: string;
    packageId: string | null;
    amountG: number;
    timestamp: number;
    cost: number;
    bevId: string;
    rating: number;
    effect: EffectType;
    note: string;
  }> = [
    { id: 'd_1',  strainId: 's_bth', packageId: 'pkg_bth', amountG: 2.0, timestamp: now - 3.5 * hour,          cost: 14,   bevId: 'bev_orange', rating: 5, effect: 'energy', note: 'Ranní probuzení' },
    { id: 'd_2',  strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 2.5, timestamp: now - 8 * hour,            cost: 20,   bevId: 'bev_water',  rating: 4, effect: 'focus',  note: 'Pracovní fokus' },
    { id: 'd_3',  strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 2.0, timestamp: now - 1 * day - 5 * hour,  cost: 16,   bevId: 'bev_water',  rating: 4, effect: 'focus',  note: '' },
    { id: 'd_4',  strainId: 's_rba', packageId: null,      amountG: 3.0, timestamp: now - 1 * day - 10 * hour, cost: 21,   bevId: 'bev_tea',    rating: 5, effect: 'relax',  note: 'Pohodový večer' },
    { id: 'd_5',  strainId: 's_bth', packageId: 'pkg_bth', amountG: 2.5, timestamp: now - 2 * day - 4 * hour,  cost: 17.5, bevId: 'bev_orange', rating: 4, effect: 'energy', note: '' },
    { id: 'd_6',  strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 2.0, timestamp: now - 3 * day - 6 * hour,  cost: 16,   bevId: 'bev_water',  rating: 4, effect: 'focus',  note: '' },
    { id: 'd_7',  strainId: 's_bth', packageId: 'pkg_bth', amountG: 2.5, timestamp: now - 1 * day - 8 * hour,  cost: 17.5, bevId: 'bev_orange', rating: 5, effect: 'energy', note: '' },
    { id: 'd_8',  strainId: 's_bth', packageId: 'pkg_bth', amountG: 2.0, timestamp: now - 2 * day - 9 * hour,  cost: 14,   bevId: 'bev_water',  rating: 4, effect: 'energy', note: '' },
    { id: 'd_9',  strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 3.0, timestamp: now - 1 * day - 2 * hour,  cost: 24,   bevId: 'bev_water',  rating: 4, effect: 'focus',  note: '' },
    { id: 'd_10', strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 3.0, timestamp: now - 2 * day - 2 * hour,  cost: 24,   bevId: 'bev_water',  rating: 5, effect: 'focus',  note: '' },
    { id: 'd_11', strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 2.5, timestamp: now - 2 * day - 7 * hour,  cost: 20,   bevId: 'bev_tea',    rating: 4, effect: 'relax',  note: '' },
    { id: 'd_12', strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 3.0, timestamp: now - 3 * day - 2 * hour,  cost: 24,   bevId: 'bev_water',  rating: 4, effect: 'focus',  note: '' },
    { id: 'd_13', strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 2.5, timestamp: now - 4 * day - 4 * hour,  cost: 20,   bevId: 'bev_water',  rating: 4, effect: 'focus',  note: '' },
    { id: 'd_14', strainId: 's_gbo', packageId: 'pkg_gbo', amountG: 3.0, timestamp: now - 4 * day - 9 * hour,  cost: 24,   bevId: 'bev_water',  rating: 5, effect: 'focus',  note: 'Otevření balení' },
  ];

  return raw.map((r) => {
    const s = strains.find((x) => x.id === r.strainId) || strains[0];
    const pkg = r.packageId ? packages.find((p) => p.id === r.packageId) : null;
    const bev = beverages.find((b) => b.id === r.bevId) || beverages[0];
    const pricePerG = pkg ? pkg.pricePerG : s.pricePerG;
    const mitPct = s.mitPct || 1.45;
    const sevenOhPct = s.sevenOhPct || 0.025;
    return {
      id: r.id,
      strainId: s.id,
      strainName: s.name,
      strainColor: s.color,
      packageId: r.packageId,
      amountG: r.amountG,
      timestamp: Math.round(r.timestamp),
      pricePerG,
      cost: Math.round(r.cost * 100) / 100,
      beverageId: bev.id,
      beverageName: bev.name,
      beverageIcon: bev.icon,
      beverageCost: bev.cost,
      rating: r.rating,
      effect: r.effect,
      mitPct,
      sevenOhPct,
      mitMg: Math.round(r.amountG * mitPct * 10 * 100) / 100,
      sevenOhMg: Math.round(r.amountG * sevenOhPct * 10 * 100) / 100,
      note: r.note,
      calibrated: false,
    };
  });
}

export function seedWaterLogs(now = Date.now()): WaterLog[] {
  const hour = 3600000;
  return [
    { id: 'w_1', timestamp: now - 2 * hour, amountMl: 500 },
    { id: 'w_2', timestamp: now - 6 * hour, amountMl: 400 },
    { id: 'w_3', timestamp: now - 86400000, amountMl: 1500 },
  ];
}

export function defaultState(now = Date.now()): AppState {
  const strains = seedStrains(now);
  const packages = seedPackages(strains, now);
  const beverages = seedBeverages();
  const doses = seedDoses(strains, packages, beverages, now);
  const day = 86400000;
  const hour = 3600000;

  return {
    settings: { ...DEFAULT_SETTINGS },
    strains,
    packages,
    beverages,
    doses,
    waterLogs: seedWaterLogs(now),
    tbreakHistory: [],
    achievements: {
      first_dose: now - 4 * day,
    },
    cravingLogs: [
      {
        id: 'cr_1',
        timestamp: Math.round(now - 2 * day - 4.1 * hour),
        lastSessionEnd: Math.round(now - 2 * day - 9 * hour),
        lastSessionTotalG: 2.0,
        lastSessionCount: 1,
        hoursSinceSessionEnd: 4.9,
        activeMitAtCraving: r1(
          calcActiveMitAtTime(doses, DEFAULT_SETTINGS, Math.round(now - 2 * day - 4.1 * hour))
        ),
        severity: 3,
        strainId: 's_bth',
        note: 'Odpolední pokles soustředění',
        previousPredictionAt: null,
      },
      {
        id: 'cr_2',
        timestamp: Math.round(now - 1 * day - 5.1 * hour),
        lastSessionEnd: Math.round(now - 1 * day - 10 * hour),
        lastSessionTotalG: 3.0,
        lastSessionCount: 1,
        hoursSinceSessionEnd: 4.9,
        activeMitAtCraving: r1(
          calcActiveMitAtTime(doses, DEFAULT_SETTINGS, Math.round(now - 1 * day - 5.1 * hour))
        ),
        severity: 3,
        strainId: 's_rba',
        note: '',
        previousPredictionAt: null,
      },
      {
        id: 'cr_3',
        timestamp: Math.round(now - 8.1 * hour),
        lastSessionEnd: Math.round(now - 1 * day - 2 * hour),
        lastSessionTotalG: 3.0,
        lastSessionCount: 1,
        hoursSinceSessionEnd: 6.2,
        activeMitAtCraving: r1(
          calcActiveMitAtTime(doses, DEFAULT_SETTINGS, Math.round(now - 8.1 * hour))
        ),
        severity: 2,
        strainId: 's_gbo',
        note: 'Lehká chuť ráno',
        previousPredictionAt: null,
      },
      {
        id: 'cr_4',
        timestamp: Math.round(now - 3.6 * hour),
        lastSessionEnd: Math.round(now - 8 * hour),
        lastSessionTotalG: 2.5,
        lastSessionCount: 1,
        hoursSinceSessionEnd: 4.4,
        activeMitAtCraving: r1(
          calcActiveMitAtTime(doses, DEFAULT_SETTINGS, Math.round(now - 3.6 * hour))
        ),
        severity: 4,
        strainId: 's_gbo',
        note: 'Před dopolední dávkou',
        previousPredictionAt: Math.round(now - 3.5 * hour),
      },
    ],
  };
}
