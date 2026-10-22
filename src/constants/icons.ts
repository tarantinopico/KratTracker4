export type IconName =
  | 'home'
  | 'history'
  | 'chart'
  | 'settings'
  | 'plus'
  | 'x'
  | 'trash'
  | 'pencil'
  | 'leaf'
  | 'wallet'
  | 'package'
  | 'alert'
  | 'check'
  | 'chev'
  | 'download'
  | 'upload'
  | 'search'
  | 'calc'
  | 'star'
  | 'clock'
  | 'droplet'
  | 'shield'
  | 'pulse'
  | 'repeat'
  | 'calendar'
  | 'eye'
  | 'eyeOff'
  | 'target'
  | 'sparkles'
  | 'drop'
  | 'flame'
  | 'trophy'
  | 'bell'
  | 'bellOff'
  | 'zap'
  | 'keyboard'
  | 'info'
  | 'refresh'
  | 'timer'
  | 'sun'
  | 'moon'
  | 'list'
  | 'grid'
  | 'pie'
  | 'sliders'
  | 'award'
  | 'activity'
  | 'play'
  | 'stop'
  | 'bookmark'
  | 'database'
  | 'gauge';

export const SVG_ICONS: Record<IconName, string> = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2.6"/>',
  chart: '<path d="M5 20v-7M12 20V5.5M19 20v-10M3.5 21.5h17"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
  pencil: '<path d="M15.5 5.5l3 3M4 20l3.8-.8L19 8a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20z"/>',
  leaf: '<path d="M4.5 19.5C4.5 11 10 5 20 4c-.5 10-5.5 15.5-13 15.5-1 0-1.8 0-2.5 0z"/><path d="M4.5 19.5C7 13 11 9 16 7"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 12.5h5"/><circle cx="16.5" cy="12.5" r="1" fill="currentColor"/>',
  package: '<path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5z"/><path d="M4 8l8 4.5L20 8"/><path d="M12 12.5v8"/>',
  alert: '<path d="M12 4 3 19.5h18L12 4z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r=".8" fill="currentColor"/>',
  check: '<path d="M4.5 12.5l5 5L19.5 7.5"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M4 19h16"/>',
  upload: '<path d="M12 15V4m0 0-4 4m4-4 4 4M4 19h16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/>',
  star: '<polygon points="12 3.5 14.7 9 20.8 9.8 16.4 14 17.5 20 12 17.1 6.5 20 7.6 14 3.2 9.8 9.3 9 12 3.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><polyline points="12 7.5 12 12 15 14"/>',
  droplet: '<path d="M12 3.5C12 3.5 6 10.2 6 14.5a6 6 0 0 0 12 0C18 10.2 12 3.5 12 3.5z"/>',
  shield: '<path d="M12 3.5 19 6.5v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6.5l7-3z"/>',
  pulse: '<polyline points="3 12 7 12 9.5 6 14.5 18 17 12 21 12"/>',
  repeat: '<polyline points="17 2 21 6 17 10"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><polyline points="7 22 3 18 7 14"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3.5v3M16 3.5v3M3.5 9.5h17"/>',
  eye: '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.2 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.2 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="2" y1="2" x2="22" y2="22"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  sparkles: '<path d="M12 3l1.8 4.6L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.9L12 3z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
  drop: '<path d="M12 3.5C12 3.5 6 10.2 6 14.5a6 6 0 0 0 12 0C18 10.2 12 3.5 12 3.5z"/>',
  flame: '<path d="M12 3c1.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4.5 2.5-6 0 2 1.5 3 2.5 3-.5-2.5 0-5 0-7z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  bellOff: '<path d="M13.73 21a2 2 0 0 1-3.46 0M18.63 13A17.89 17.89 0 0 1 18 8M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.33-5"/><line x1="2" y1="2" x2="22" y2="22"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  keyboard: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M18 12h.01M10 12h4M7 15h10"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r=".8" fill="currentColor"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  award: '<circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M20 12c0 1.66-3.58 3-8 3s-8-1.34-8-3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/>',
  gauge: '<path d="M12 14l3.5-3.5"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
};
