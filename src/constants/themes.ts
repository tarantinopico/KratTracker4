import { ThemeId } from '../types';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  hex: string | null;
}

export const THEMES: ThemeDef[] = [
  { id: 'emerald', name: 'Emerald',      hex: '#30D158' },
  { id: 'cyan',    name: 'Cyber Cyan',   hex: '#64D2FF' },
  { id: 'purple',  name: 'Royal Violet', hex: '#BF5AF2' },
  { id: 'amber',   name: 'Warm Amber',   hex: '#FF9F0A' },
  { id: 'rose',    name: 'Neon Rose',    hex: '#FF375F' },
  { id: 'gold',    name: 'Solar Gold',   hex: '#FFD60A' },
  { id: 'custom',  name: 'Vlastní',      hex: null },
];
