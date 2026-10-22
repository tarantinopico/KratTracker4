import { EffectType } from '../types';

export const EFFECT_MAP: Record<EffectType, { label: string; icon: string }> = {
  energy: { label: 'Energie',      icon: '⚡' },
  focus:  { label: 'Soustředění',  icon: '🎯' },
  relax:  { label: 'Relaxace',     icon: '🍃' },
  pain:   { label: 'Úleva',        icon: '🛡️' },
  sleep:  { label: 'Spánek',       icon: '🌙' },
};

export const EFFECT_KEYS: EffectType[] = ['energy', 'focus', 'relax', 'pain', 'sleep'];
