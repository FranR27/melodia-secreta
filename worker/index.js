// Catálogo de canciones para Melodía Secreta.
// Busca videos musicales en la YouTube Data API, descarta lo que no sirve para jugar
// (mixes, en vivo, playlists, canales que no son artistas, videos muy largos o no incrustables)
// y guarda el resultado en caché 24 horas.

const CACHE_KEY = 'melodia-secreta:youtube-catalog:v2';
const CACHE_URL = 'https://melodia-secreta.internal/catalog-v2';
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const MAX_CATALOG_SIZE = 450;
const MIN_SECONDS = 120;
const MAX_SECONDS = 540;

const SEARCH_QUERIES = [
  'official music video pop hits',
  'rock en español video oficial',
  'rock classics official music video',
  'reggaeton video oficial',
  'latin pop official music video',
  'cumbia argentina video oficial',
  'hip hop official music video',
  'indie alternative official music video',
  'argentina rock nacional clásicos video oficial',
  'pop argentino video oficial',
  'trap argentino video oficial',
  'baladas en español video oficial',
];

/* ---------- filtros ---------- */

// Títulos que indican que no es una canción sola.
const BAD_TITLE = new RegExp(
  [
    '\\b(?:mega)?mix(?:es)?\\b', 'mashup', 'playlist', 'compilation', 'compilaci[oó]n', 'enganchad',
    'full album', '[aá]lbum completo', 'disco completo', 'greatest hits', 'best of', '\\btop\\s*\\d+',
    '\\b(?:19|20)?\\d0s\\b', '\\b\\d+\\s*(?:hours?|horas?|hrs?)\\b',
    'live (?:at|from|in|on|session|version|performance)\\b', '[(\\[]\\s*live\\b', '\\blive\\s*$', 'en vivo',
    'karaoke', 'instrumental', 'type beat', 'reaction', 'reacci[oó]n',
    '[(\\[][^)\\]]*\\bcover\\b[^)\\]]*[)\\]]', '\\bcover by\\b', 'tutorial', '\\bremix\\b',
    'sped up', 'slowed', 'nightcore', '\\b8d\\b', 'reverb', 'concert', 'concierto',
    'behind the scenes', 'making of', 'trailer', 'teaser', 'entrevista', 'interview', '#shorts?', 'http',
  ].join('|'),
  'i',
);
// Nombres que no son un artista (servicios, listas, canales de letras).
const BAD_ARTIST = /\b(?:spotify|playlist|mix|hits|lyrics?|letras?|karaoke|radio|compilation|official|worldstar\w*|records?|entertainment)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const MOJIBAKE = /�|â”|â€|Ã./;

function decodeEntities(s) {
  return s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|quot|lt|gt|apos));/gi, (m, dec, hex, name) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return { amp: '&', quot: '"', lt: '<', gt: '>', apos: "'" }[name.toLowerCase()];
  });
}

function cleanTitle(s) {
  return s
    .replace(/\s*[(\[][^)\]]*\b(?:official|oficial|video|v[ií]deo|videoclip|clip|audio|lyrics?|letra|visuali[sz]er|4k|hd|remaster(?:ed)?|remasterizado)\b[^)\]]*[)\]]/gi, '')
    .replace(/\s+(?:official|oficial)\s+(?:music\s+)?(?:video|audio|v[ií]deo)\s*$/i, '')
    .replace(/\s*[(\[]\s*(?:ft\.?|feat\.?|featuring)[^)\]]*[)\]]/gi, '')
    .replace(/\s+(?:ft\.?|feat\.?|featuring)\s+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanArtist(s) {
  return s.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
}

/** Devuelve { id, title, artist, youtubeId, startAt } o null si el resultado no sirve. */
function parseSong(item) {
  const videoId = item?.id?.videoId;
  const rawTitle = item?.snippet?.title;
  const rawChannel = item?.snippet?.channelTitle;
  if (!videoId || !rawTitle || !rawChannel) return null;
  const raw = decodeEntities(rawTitle).trim();
  const channel = decodeEntities(rawChannel).trim();
  if (BAD_TITLE.test(raw) || EMOJI.test(raw) || MOJIBAKE.test(raw)) return null;

  const parts = raw.split(/\s+[-–—|]\s+/);
  let artist;
  let title;
  if (parts.length === 2) {
    artist = cleanArtist(parts[0]);
    title = cleanTitle(parts[1]);
  } else if (parts.length === 1 && (/VEVO$/i.test(channel) || /\s-\sTopic$/i.test(channel))) {
    // Sin "Artista - Título": solo confiamos en canales VEVO o "Artista - Topic".
    artist = cleanArtist(channel);
    title = cleanTitle(raw);
  } else {
    return null;
  }
  if (!title || !artist || title.length > 80 || artist.length > 60) return null;
  if (BAD_ARTIST.test(artist) || BAD_TITLE.test(title)) return null;
  if (/^\d+\s*[.)-]\s/.test(title) || /^\d+\s*[.)-]\s/.test(artist)) return null;
  return { id: `yt-${videoId}`, title, artist, youtubeId: videoId, startAt: 0 };
}

/** "PT3M45S" -> 225. Devuelve null si el formato no es el esperado (por ejemplo, videos de días). */
function parseDuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

const songKey = (s) =>
  `${s.title}::${s.artist}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9:]+/g, '');

/* ---------- YouTube Data API ---------- */

async function youtubeGet(path, params, apiKey) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.search = new URLSearchParams({ ...params, key: apiKey }).toString();
  const response = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
  const data = await response.json();
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason || 'youtube_api_error';
    throw new Error(`YouTube API error: ${reason}`);
  }
  return data;
}

async function youtubeSearch(query, apiKey) {
  const data = await youtubeGet(
    'search',
    {
      part: 'snippet',
      type: 'video',
      videoCategoryId: '10',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      order: 'viewCount',
      maxResults: '50',
      q: query,
    },
    apiKey,
  );
  return Array.isArray(data.items) ? data.items : [];
}

/** Deja solo los videos públicos, incrustables y de duración razonable para una canción. */
async function keepPlayable(candidates, apiKey) {
  const playable = [];
  for (let i = 0; i < candidates.length; i += 50) {
    const chunk = candidates.slice(i, i + 50);
    const data = await youtubeGet(
      'videos',
      { part: 'contentDetails,status', id: chunk.map((c) => c.youtubeId).join(',') },
      apiKey,
    );
    const info = new Map((data.items || []).map((v) => [v.id, v]));
    for (const song of chunk) {
      const v = info.get(song.youtubeId);
      const seconds = parseDuration(v?.contentDetails?.duration);
      if (!v || !v.status?.embeddable || v.status?.privacyStatus !== 'public') continue;
      if (seconds === null || seconds < MIN_SECONDS || seconds > MAX_SECONDS) continue;
      playable.push(song);
    }
  }
  return playable;
}

async function getCatalog(env) {
  // KV es opcional pero recomendado: sobrevive entre instancias y regiones.
  if (env.CATALOG_KV) {
    const stored = await env.CATALOG_KV.get(CACHE_KEY, 'json');
    if (stored?.songs?.length) return { songs: stored.songs, generatedAt: stored.generatedAt, cached: true };
  }

  const cache = caches.default;
  const cacheRequest = new Request(CACHE_URL);
  const cached = await cache.match(cacheRequest);
  if (cached) {
    const value = await cached.json();
    if (Array.isArray(value.songs) && value.songs.length) return { ...value, cached: true };
  }

  if (!env.YOUTUBE_API_KEY) throw new Error('missing_api_key');
  const ids = new Set();
  const keys = new Set();
  const songs = [];
  // Las consultas van de a una para que el gasto de cuota sea predecible.
  for (const query of SEARCH_QUERIES) {
    let candidates;
    try {
      const items = await youtubeSearch(query, env.YOUTUBE_API_KEY);
      candidates = items.map(parseSong).filter((s) => s && !ids.has(s.youtubeId));
      candidates = await keepPlayable(candidates, env.YOUTUBE_API_KEY);
    } catch (error) {
      if (songs.length) break;
      throw error;
    }
    for (const song of candidates) {
      const key = songKey(song);
      if (ids.has(song.youtubeId) || keys.has(key)) continue;
      ids.add(song.youtubeId);
      keys.add(key);
      songs.push(song);
      if (songs.length >= MAX_CATALOG_SIZE) break;
    }
    if (songs.length >= MAX_CATALOG_SIZE) break;
  }
  if (!songs.length) throw new Error('empty_catalog');

  const result = { songs, generatedAt: new Date().toISOString(), cached: false };
  const response = new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
  });
  await cache.put(cacheRequest, response.clone());
  if (env.CATALOG_KV) {
    await env.CATALOG_KV.put(CACHE_KEY, JSON.stringify(result), { expirationTtl: CACHE_TTL_SECONDS });
  }
  return result;
}

/* ---------- HTTP ---------- */

const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin') || '*';
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map((v) => v.trim());
  const permitted = allowed.includes('*') || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': permitted ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

function json(data, status, cors, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...cors, ...extra },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);
    if (url.pathname !== '/api/catalog') return json({ error: 'not_found' }, 404, cors);

    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map((v) => v.trim());
    if (!allowed.includes('*') && !allowed.includes(origin)) return json({ error: 'origin_not_allowed' }, 403, cors);

    try {
      const catalog = await getCatalog(env);
      return json(catalog, 200, cors, { 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      const status = message === 'missing_api_key' ? 503 : 502;
      return json({ error: message, songs: [] }, status, cors, { 'Cache-Control': 'no-store' });
    }
  },
};
