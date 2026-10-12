import raw from '../data/songs.json';
import type { CatalogEntry, Song } from './types';

const STATIC_CATALOG = raw as unknown as CatalogEntry[];
const CLIENT_CACHE_KEY = 'melodia-secreta:catalog:v1';
const CLIENT_CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_REMOTE_ENTRIES = 1500;

let catalog: CatalogEntry[] = mergeCatalog(STATIC_CATALOG, []);

export const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function validEntry(value: unknown): value is CatalogEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Partial<CatalogEntry>;
  return typeof e.id === 'string' && e.id.length > 0 &&
    typeof e.title === 'string' && e.title.trim().length > 0 &&
    typeof e.artist === 'string' && e.artist.trim().length > 0 &&
    (!e.youtubeId || /^[\w-]{11}$/.test(e.youtubeId));
}

function mergeCatalog(base: CatalogEntry[], incoming: unknown[]): CatalogEntry[] {
  const byVideo = new Map<string, CatalogEntry>();
  const bySong = new Map<string, CatalogEntry>();
  for (const candidate of [...base, ...incoming.filter(validEntry)]) {
    const entry: CatalogEntry = {
      ...candidate,
      title: candidate.title.trim(),
      artist: candidate.artist.trim(),
      startAt: Math.max(0, Number(candidate.startAt) || 0),
    };
    const videoKey = entry.youtubeId ? `yt:${entry.youtubeId}` : '';
    const songKey = `${normalize(entry.title)}::${normalize(entry.artist)}`;
    if (videoKey && byVideo.has(videoKey)) continue;
    const previous = bySong.get(songKey);
    if (previous?.youtubeId) continue; // one playable version per normalized title/artist
    if (previous && !entry.youtubeId) continue;
    if (previous && entry.youtubeId) {
      bySong.set(songKey, entry);
      if (previous.youtubeId) byVideo.delete(`yt:${previous.youtubeId}`);
    } else {
      bySong.set(songKey, entry);
    }
    if (videoKey) byVideo.set(videoKey, entry);
  }
  return [...bySong.values()].sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

export function getCatalog(): CatalogEntry[] {
  return catalog;
}

export function getPlayable(): Song[] {
  return catalog.flatMap((entry) =>
    entry.youtubeId ? [{ ...entry, youtubeId: entry.youtubeId, startAt: entry.startAt ?? 0 }] : [],
  );
}

/** Loads the remote catalogue if an API endpoint has been configured. Static songs remain available offline. */
export async function loadRemoteCatalog(): Promise<{ count: number; source: 'remote' | 'cache' | 'static' }> {
  const endpoint = document.querySelector<HTMLMetaElement>('meta[name="melodia-api-base"]')?.content.trim();
  if (!endpoint) return { count: getPlayable().length, source: 'static' };

  try {
    const cached = localStorage.getItem(CLIENT_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { savedAt?: number; songs?: unknown[] };
      if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt < CLIENT_CACHE_TTL && Array.isArray(parsed.songs)) {
        catalog = mergeCatalog(STATIC_CATALOG, parsed.songs);
        // Refresh in the background; don't delay a new round for the cached catalogue.
        void fetchRemote(endpoint).catch(() => undefined);
        return { count: getPlayable().length, source: 'cache' };
      }
    }
  } catch {
    // Storage can be disabled; the network request can still proceed.
  }

  try {
    await fetchRemote(endpoint);
    return { count: getPlayable().length, source: 'remote' };
  } catch {
    return { count: getPlayable().length, source: 'static' };
  }
}

async function fetchRemote(endpoint: string): Promise<void> {
  const url = endpoint.replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Catálogo remoto: HTTP ${response.status}`);
    const payload: unknown = await response.json();
    const songs = Array.isArray(payload) ? payload :
      payload && typeof payload === 'object' && Array.isArray((payload as { songs?: unknown[] }).songs)
        ? (payload as { songs: unknown[] }).songs : null;
    if (!songs) throw new Error('La API devolvió un catálogo con formato incorrecto.');
    catalog = mergeCatalog(STATIC_CATALOG, songs).slice(0, MAX_REMOTE_ENTRIES + STATIC_CATALOG.length);
    try {
      localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), songs }));
    } catch {
      // Caching is an optimization, never a requirement for playing.
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

export function search(query: string, exclude: ReadonlySet<string>, limit = 6): CatalogEntry[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return catalog
    .filter((entry) => !exclude.has(entry.id) &&
      tokens.every((token) => normalize(`${entry.title} ${entry.artist}`).includes(token)))
    .slice(0, limit);
}
