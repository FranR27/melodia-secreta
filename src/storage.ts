import { STORAGE_KEY } from './config';
import type { Stats } from './types';

const fresh = (): Stats => ({ streak: 0, best: 0, seen: [] });

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Stats>;
    return {
      streak: Number(p.streak) || 0,
      best: Number(p.best) || 0,
      seen: Array.isArray(p.seen) ? p.seen.filter((x): x is string => typeof x === 'string').slice(-5000) : [],
    };
  } catch {
    return fresh();
  }
}

export function saveStats(stats: Stats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    /* sin almacenamiento: el juego sigue funcionando sin guardar la racha */
  }
}
