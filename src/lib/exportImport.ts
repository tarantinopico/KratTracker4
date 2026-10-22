import { migrateState } from '../store/migrations';
import { AppState } from '../types';
import { dayKey, fmtTime } from './date';

export function exportJSON(state: AppState): string {
  const pure: AppState = {
    settings: state.settings,
    strains: state.strains,
    packages: state.packages,
    beverages: state.beverages,
    doses: state.doses,
    waterLogs: state.waterLogs,
    tbreakHistory: state.tbreakHistory,
    achievements: state.achievements,
    cravingLogs: state.cravingLogs || [],
  };
  return JSON.stringify(pure, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const withBom = mimeType.includes('csv') ? `\uFEFF${content}` : content;
  const blob = new Blob([withBom], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV(state: AppState): string {
  const dayStartHour = state.settings.dayStartHour || 0;
  const cravingsByDay = new Map<string, (typeof state.cravingLogs)[number]>();
  for (const c of state.cravingLogs || []) {
    const dk = dayKey(c.timestamp, dayStartHour);
    if (!cravingsByDay.has(dk)) {
      cravingsByDay.set(dk, c);
    }
  }

  const headers = [
    'ID',
    'Datum',
    'Čas',
    'Druh',
    'Gramáž (g)',
    'MIT (%)',
    'MIT (mg)',
    '7-OH (mg)',
    'Cena kratom',
    'Nápoj',
    'Cena nápoj',
    'Hodnocení',
    'Efekt',
    'Kalibrováno',
    'Poznámka',
    'Chuť_čas',
    'Chuť_severity',
    'Chuť_h_od_session',
    'Chuť_MIT_mg',
  ];

  const rows = [...state.doses]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((d) => {
      const dk = dayKey(d.timestamp, dayStartHour);
      const cr = cravingsByDay.get(dk);
      return [
        d.id,
        dk,
        fmtTime(d.timestamp, true),
        `"${(d.strainName || '').replace(/"/g, '""')}"`,
        d.amountG,
        d.mitPct,
        d.mitMg,
        d.sevenOhMg,
        d.cost,
        `"${(d.beverageName || '').replace(/"/g, '""')}"`,
        d.beverageCost,
        d.rating,
        d.effect,
        d.calibrated ? 'ANO' : 'NE',
        `"${(d.note || '').replace(/"/g, '""')}"`,
        cr ? fmtTime(cr.timestamp, true) : '',
        cr ? cr.severity : '',
        cr ? cr.hoursSinceSessionEnd : '',
        cr ? cr.activeMitAtCraving : '',
      ];
    });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function parseImportedJSON(raw: string): AppState {
  const parsed = JSON.parse(raw);
  // Support both direct AppState format and Zustand persist wrapper { state: AppState }
  const candidate = parsed && parsed.state && parsed.state.settings ? parsed.state : parsed;
  return migrateState(candidate);
}
