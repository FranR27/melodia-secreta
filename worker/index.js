const CACHE_KEY = 'melodia-secreta:youtube-catalog:v1';
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const MAX_CATALOG_SIZE = 450;
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
];

const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin') || '*';
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map((v) => v.trim());
  const permitted = allowed.includes('*') || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': permitted ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

function json(data, status, cors, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...cors, ...extra },
  });
}

function cleanTitle(rawTitle) {
  return rawTitle
    .replace(/^\s*\[[^\]]*(?:4k|hd|official)[^\]]*\]\s*/i, '')
    .replace(/\s*[-|–—]\s*(official\s*)?(music\s*)?video.*$/i, '')
    .replace(/\s*\((official\s*)?(music\s*)?(video|audio|lyrics?|lyric video|visualizer|4k|hd)[^)]*\)/ig, '')
    .replace(/\s*\[(official\s*)?(music\s*)?(video|audio|lyrics?|lyric video|visualizer|4k|hd)[^\]]*\]/ig, '')
    .replace(/\s+(official audio|official video|lyrics?|lyric video|visualizer|audio oficial|video oficial)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSong(item) {
  const videoId = item?.id?.videoId;
  const raw = item?.snippet?.title?.trim();
  const channel = item?.snippet?.channelTitle?.trim();
  if (!videoId || !raw || !channel || / - topic$/i.test(channel)) {
    if (!videoId || !raw || !channel) return null;
  }
  let title = cleanTitle(raw);
  let artist = channel.replace(/VEVO$/i, '').replace(/\s*-\s*Topic$/i, '').trim();
  const split = raw.match(/^(.{2,80}?)\s+[|–—-]\s+(.{2,100})$/);
  if (split) {
    const left = cleanTitle(split[1]);
    const right = cleanTitle(split[2]);
    // Most music videos use Artist - Title. Ignore separators embedded in long generic titles.
    if (left && right && !/official|lyrics|video|audio/i.test(right)) {
      artist = left.replace(/VEVO$/i, '').replace(/\s*-\s*Topic$/i, '').trim();
      title = right;
    }
  }
  title = title.replace(/\s*\(feat\..*$/i, '').trim();
  if (!title || !artist || title.length > 140 || artist.length > 100) return null;
  return {
    id: `yt-${videoId}`,
    title,
    artist,
    youtubeId: videoId,
    startAt: 0,
  };
}

async function youtubeSearch(query, apiKey) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoCategoryId: '10',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    maxResults: '50',
    q: query,
    key: apiKey,
  }).toString();
  const response = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
  const data = await response.json();
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason || 'youtube_api_error';
    throw new Error(`YouTube API error: ${reason}`);
  }
  return Array.isArray(data.items) ? data.items : [];
}

async function getCatalog(env) {
  // KV is optional but recommended: unlike edge Cache, it survives Worker instances and regions.
  if (env.CATALOG_KV) {
    const stored = await env.CATALOG_KV.get(CACHE_KEY, 'json');
    if (stored?.songs?.length) return { songs: stored.songs, generatedAt: stored.generatedAt, cached: true };
  }

  const cache = caches.default;
  const cacheRequest = new Request('https://melodia-secreta.internal/catalog-v1');
  const cached = await cache.match(cacheRequest);
  if (cached) {
    const value = await cached.json();
    if (Array.isArray(value.songs) && value.songs.length) return { ...value, cached: true };
  }

  if (!env.YOUTUBE_API_KEY) throw new Error('missing_api_key');
  const ids = new Set();
  const songs = [];
  // Queries are sequential to avoid bursts and make quota use predictable.
  for (const query of SEARCH_QUERIES) {
    let items;
    try {
      items = await youtubeSearch(query, env.YOUTUBE_API_KEY);
    } catch (error) {
      if (songs.length) break;
      throw error;
    }
    for (const item of items) {
      const song = parseSong(item);
      if (!song || ids.has(song.youtubeId)) continue;
      ids.add(song.youtubeId);
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
