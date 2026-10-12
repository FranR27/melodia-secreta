(function(){
'use strict';
const __modules = {
"data/songs.json": function(module, exports, __require) {
module.exports = [
    { "id": "de-musica-ligera", "title": "De música ligera", "artist": "Soda Stereo", "youtubeId": "T_FkEw27XJ0", "startAt": 0 },
    { "id": "matador", "title": "Matador", "artist": "Los Fabulosos Cadillacs", "youtubeId": "pjPA7CXutDw", "startAt": 0 },
    { "id": "mariposa-tecknicolor", "title": "Mariposa Tecknicolor", "artist": "Fito Páez", "youtubeId": "CRBincBc_8k", "startAt": 0 },
    { "id": "flaca", "title": "Flaca", "artist": "Andrés Calamaro", "youtubeId": "UCF9oHXhDMU", "startAt": 0 },
    { "id": "crimen", "title": "Crimen", "artist": "Gustavo Cerati", "youtubeId": "uLIs0j2WnlM", "startAt": 0 },
    { "id": "bohemian-rhapsody", "title": "Bohemian Rhapsody", "artist": "Queen", "youtubeId": "fJ9rUzIMcZQ", "startAt": 0 },
    { "id": "billie-jean", "title": "Billie Jean", "artist": "Michael Jackson", "youtubeId": "Zi_XLOBDo_Y", "startAt": 0 },
    { "id": "smells-like-teen-spirit", "title": "Smells Like Teen Spirit", "artist": "Nirvana", "youtubeId": "hTWKbfoikeg", "startAt": 0 },
    { "id": "wonderwall", "title": "Wonderwall", "artist": "Oasis", "youtubeId": "bx1Bh8ZvH84", "startAt": 0 },
    { "id": "despacito", "title": "Despacito", "artist": "Luis Fonsi", "youtubeId": "kJQP7kiw5Fk", "startAt": 0 },
    { "id": "waka-waka", "title": "Waka Waka (This Time for Africa)", "artist": "Shakira", "youtubeId": "pRpeEdMmmQ0", "startAt": 0 },
    { "id": "take-on-me", "title": "Take On Me", "artist": "a-ha", "youtubeId": "djV11Xbc914", "startAt": 0 },
    { "id": "persiana-americana", "title": "Persiana Americana", "artist": "Soda Stereo" },
    { "id": "cuando-pase-el-temblor", "title": "Cuando pase el temblor", "artist": "Soda Stereo" },
    { "id": "demoliendo-hoteles", "title": "Demoliendo hoteles", "artist": "Charly García" },
    { "id": "rezo-por-vos", "title": "Rezo por vos", "artist": "Charly García" },
    { "id": "mal-bicho", "title": "Mal bicho", "artist": "Los Fabulosos Cadillacs" },
    { "id": "vasos-vacios", "title": "Vasos vacíos", "artist": "Los Fabulosos Cadillacs" },
    { "id": "al-lado-del-camino", "title": "Al lado del camino", "artist": "Fito Páez" },
    { "id": "yo-vengo-a-ofrecer", "title": "Yo vengo a ofrecer mi corazón", "artist": "Fito Páez" },
    { "id": "puente", "title": "Puente", "artist": "Gustavo Cerati" },
    { "id": "adios", "title": "Adiós", "artist": "Gustavo Cerati" },
    { "id": "crimenes-perfectos", "title": "Crímenes perfectos", "artist": "Andrés Calamaro" },
    { "id": "spaghetti-del-rock", "title": "Spaghetti del rock", "artist": "Divididos" },
    { "id": "dont-stop-me-now", "title": "Don't Stop Me Now", "artist": "Queen" },
    { "id": "we-will-rock-you", "title": "We Will Rock You", "artist": "Queen" },
    { "id": "thriller", "title": "Thriller", "artist": "Michael Jackson" },
    { "id": "come-as-you-are", "title": "Come as You Are", "artist": "Nirvana" },
    { "id": "dont-look-back-in-anger", "title": "Don't Look Back in Anger", "artist": "Oasis" },
    { "id": "hips-dont-lie", "title": "Hips Don't Lie", "artist": "Shakira" },
    { "id": "whenever-wherever", "title": "Whenever, Wherever", "artist": "Shakira" },
    { "id": "echame-la-culpa", "title": "Échame la culpa", "artist": "Luis Fonsi" },
    { "id": "titi-me-pregunto", "title": "Tití Me Preguntó", "artist": "Bad Bunny" },
    { "id": "me-porto-bonito", "title": "Me Porto Bonito", "artist": "Bad Bunny" },
    { "id": "gasolina", "title": "Gasolina", "artist": "Daddy Yankee" },
    { "id": "the-sun-always-shines-on-tv", "title": "The Sun Always Shines on T.V.", "artist": "a-ha" }
]
;
},
"src/catalog": function(module, exports, __require) {
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = void 0;
exports.getCatalog = getCatalog;
exports.getPlayable = getPlayable;
exports.loadRemoteCatalog = loadRemoteCatalog;
exports.search = search;
const songs_json_1 = __importDefault(__require("data/songs.json"));
const STATIC_CATALOG = songs_json_1.default;
const CLIENT_CACHE_KEY = 'melodia-secreta:catalog:v1';
const CLIENT_CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_REMOTE_ENTRIES = 1500;
let catalog = mergeCatalog(STATIC_CATALOG, []);
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
exports.normalize = normalize;
function validEntry(value) {
    if (!value || typeof value !== 'object')
        return false;
    const e = value;
    return typeof e.id === 'string' && e.id.length > 0 &&
        typeof e.title === 'string' && e.title.trim().length > 0 &&
        typeof e.artist === 'string' && e.artist.trim().length > 0 &&
        (!e.youtubeId || /^[\w-]{11}$/.test(e.youtubeId));
}
function mergeCatalog(base, incoming) {
    const byVideo = new Map();
    const bySong = new Map();
    for (const candidate of [...base, ...incoming.filter(validEntry)]) {
        const entry = {
            ...candidate,
            title: candidate.title.trim(),
            artist: candidate.artist.trim(),
            startAt: Math.max(0, Number(candidate.startAt) || 0),
        };
        const videoKey = entry.youtubeId ? `yt:${entry.youtubeId}` : '';
        const songKey = `${(0, exports.normalize)(entry.title)}::${(0, exports.normalize)(entry.artist)}`;
        if (videoKey && byVideo.has(videoKey))
            continue;
        const previous = bySong.get(songKey);
        if (previous?.youtubeId)
            continue; // one playable version per normalized title/artist
        if (previous && !entry.youtubeId)
            continue;
        if (previous && entry.youtubeId) {
            bySong.set(songKey, entry);
            if (previous.youtubeId)
                byVideo.delete(`yt:${previous.youtubeId}`);
        }
        else {
            bySong.set(songKey, entry);
        }
        if (videoKey)
            byVideo.set(videoKey, entry);
    }
    return [...bySong.values()].sort((a, b) => a.title.localeCompare(b.title, 'es'));
}
function getCatalog() {
    return catalog;
}
function getPlayable() {
    return catalog.flatMap((entry) => entry.youtubeId ? [{ ...entry, youtubeId: entry.youtubeId, startAt: entry.startAt ?? 0 }] : []);
}
/** Loads the remote catalogue if an API endpoint has been configured. Static songs remain available offline. */
async function loadRemoteCatalog() {
    const endpoint = document.querySelector('meta[name="melodia-api-base"]')?.content.trim();
    if (!endpoint)
        return { count: getPlayable().length, source: 'static' };
    try {
        const cached = localStorage.getItem(CLIENT_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt < CLIENT_CACHE_TTL && Array.isArray(parsed.songs)) {
                catalog = mergeCatalog(STATIC_CATALOG, parsed.songs);
                // Refresh in the background; don't delay a new round for the cached catalogue.
                void fetchRemote(endpoint).catch(() => undefined);
                return { count: getPlayable().length, source: 'cache' };
            }
        }
    }
    catch {
        // Storage can be disabled; the network request can still proceed.
    }
    try {
        await fetchRemote(endpoint);
        return { count: getPlayable().length, source: 'remote' };
    }
    catch {
        return { count: getPlayable().length, source: 'static' };
    }
}
async function fetchRemote(endpoint) {
    const url = endpoint.replace(/\/$/, '');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok)
            throw new Error(`Catálogo remoto: HTTP ${response.status}`);
        const payload = await response.json();
        const songs = Array.isArray(payload) ? payload :
            payload && typeof payload === 'object' && Array.isArray(payload.songs)
                ? payload.songs : null;
        if (!songs)
            throw new Error('La API devolvió un catálogo con formato incorrecto.');
        catalog = mergeCatalog(STATIC_CATALOG, songs).slice(0, MAX_REMOTE_ENTRIES + STATIC_CATALOG.length);
        try {
            localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), songs }));
        }
        catch {
            // Caching is an optimization, never a requirement for playing.
        }
    }
    finally {
        window.clearTimeout(timeout);
    }
}
function search(query, exclude, limit = 6) {
    const q = (0, exports.normalize)(query);
    if (!q)
        return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return catalog
        .filter((entry) => !exclude.has(entry.id) &&
        tokens.every((token) => (0, exports.normalize)(`${entry.title} ${entry.artist}`).includes(token)))
        .slice(0, limit);
}

},
"src/config": function(module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_KEY = exports.TOTAL_SECONDS = exports.MAX_GUESSES = exports.STAGES = void 0;
/** Segundos acumulados que se desbloquean en cada intento: 1, 2, 4, 7, 11 y 16. */
exports.STAGES = [1, 2, 4, 7, 11, 16];
exports.MAX_GUESSES = exports.STAGES.length;
exports.TOTAL_SECONDS = exports.STAGES[exports.STAGES.length - 1];
exports.STORAGE_KEY = 'melodia-secreta:v2';

},
"src/game": function(module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const config_1 = __require("src/config");
/** Lógica pura de una ronda. No toca el DOM ni el reproductor. */
class Game {
    constructor(song) {
        this.song = song;
        this.guesses = [];
        this.over = false;
        this.won = false;
    }
    /** Índice del tramo actual (0 a 5). */
    get stage() {
        return Math.min(this.guesses.length, config_1.MAX_GUESSES - 1);
    }
    /** Segundos de canción que se pueden escuchar ahora. */
    get clipSeconds() {
        return config_1.STAGES[this.stage];
    }
    /** Segundos extra que suma saltar, o null si ya es el último tramo. */
    get nextIncrement() {
        return this.stage < config_1.MAX_GUESSES - 1 ? config_1.STAGES[this.stage + 1] - config_1.STAGES[this.stage] : null;
    }
    get usedIds() {
        return new Set(this.guesses.flatMap((g) => (g.id ? [g.id] : [])));
    }
    guess(entry) {
        const right = entry.id === this.song.id;
        const sameArtist = entry.artist.toLowerCase() === this.song.artist.toLowerCase();
        const g = {
            kind: right ? 'right' : sameArtist ? 'close' : 'wrong',
            id: entry.id,
            title: entry.title,
            artist: entry.artist,
        };
        return this.push(g);
    }
    skip() {
        return this.push({ kind: 'skip' });
    }
    push(g) {
        if (this.over)
            return g;
        this.guesses.push(g);
        if (g.kind === 'right') {
            this.over = true;
            this.won = true;
        }
        else if (this.guesses.length >= config_1.MAX_GUESSES) {
            this.over = true;
        }
        return g;
    }
}
exports.Game = Game;

},
"src/main": function(module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_1 = __require("src/catalog");
const config_1 = __require("src/config");
const game_1 = __require("src/game");
const player_1 = __require("src/player");
const storage_1 = __require("src/storage");
const ui_1 = __require("src/ui");
const stats = (0, storage_1.loadStats)();
const player = new player_1.ClipPlayer();
/** Canciones que YouTube no dejó incrustar en esta sesión. */
const blocked = new Set();
let game = null;
const ui = new ui_1.UI({ onPlay: togglePlay, onSkip: skip, onPick: pick, onNext: newRound });
player.onError = (err) => ui.toast(err.message);
function pickSong() {
    const available = (0, catalog_1.getPlayable)().filter((s) => !blocked.has(s.id));
    if (!available.length)
        return null;
    const seen = new Set(stats.seen);
    let pool = available.filter((s) => !seen.has(s.id));
    if (!pool.length) {
        stats.seen = [];
        pool = available;
    }
    return pool[Math.floor(Math.random() * pool.length)];
}
async function newRound() {
    player.stop();
    ui.hideResult();
    ui.reveal(false);
    ui.setPlaying(false);
    const maxTries = (0, catalog_1.getPlayable)().length;
    for (let tries = 0; tries <= maxTries; tries++) {
        const song = pickSong();
        if (!song)
            break;
        ui.setLoading(true, 'Cargando canción…');
        try {
            await player.load(song);
        }
        catch (e) {
            blocked.add(song.id);
            const reason = e instanceof Error ? e.message : 'No se pudo cargar.';
            ui.toast(`Salté "${song.title}": ${reason}`);
            continue;
        }
        stats.seen.push(song.id);
        // Keep browser storage bounded even after many sessions.
        if (stats.seen.length > 5000)
            stats.seen = stats.seen.slice(-5000);
        (0, storage_1.saveStats)(stats);
        game = new game_1.Game(song);
        ui.setLoading(false);
        ui.renderGame(game, stats);
        return;
    }
    ui.fatal('No se pudo cargar ninguna canción. Revisá la conexión y que el juego esté abierto desde un servidor web.');
}
function togglePlay() {
    if (!game)
        return;
    if (player.playing) {
        player.stop();
        return;
    }
    ui.setPlaying(true);
    const stop = () => ui.setPlaying(false);
    if (game.over) {
        player.playFull((elapsed, span) => {
            ui.setFill(elapsed / span);
            ui.setClock(elapsed, span);
        }, stop);
    }
    else {
        const limit = game.clipSeconds;
        player.playClip(limit, (elapsed) => {
            ui.setFill(elapsed / config_1.TOTAL_SECONDS);
            ui.setClock(elapsed, limit);
        }, stop);
    }
}
function skip() {
    if (!game || game.over)
        return;
    player.stop();
    game.skip();
    afterGuess();
}
function pick(entry) {
    if (!game || game.over)
        return;
    player.stop();
    game.guess(entry);
    afterGuess();
}
function afterGuess() {
    if (!game)
        return;
    if (game.over) {
        if (game.won) {
            stats.streak += 1;
            stats.best = Math.max(stats.best, stats.streak);
        }
        else {
            stats.streak = 0;
        }
        (0, storage_1.saveStats)(stats);
        ui.reveal(true);
        ui.renderGame(game, stats);
        ui.showResult(game);
    }
    else {
        ui.renderGame(game, stats);
    }
}
async function boot() {
    ui.setLoading(true, 'Cargando reproductor…');
    try {
        await player.mount('player');
    }
    catch (e) {
        ui.fatal(e instanceof Error ? e.message : 'No se pudo cargar el reproductor de YouTube.');
        return;
    }
    const catalogue = await (0, catalog_1.loadRemoteCatalog)();
    if (catalogue.source === 'static') {
        ui.toast('Catálogo dinámico no disponible; usando las canciones locales.');
    }
    else {
        ui.toast(`Catálogo listo: ${catalogue.count} canciones disponibles.`);
    }
    await newRound();
}
void boot();

},
"src/player": function(module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipPlayer = exports.PlayerError = void 0;
const w = window;
/** Estados del reproductor de YouTube que usamos. */
const ST = { ENDED: 0, PLAYING: 1, CUED: 5 };
class PlayerError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.PlayerError = PlayerError;
function describe(code) {
    switch (code) {
        case 2:
            return 'El ID del video no es válido.';
        case 5:
            return 'El reproductor de YouTube tuvo un error.';
        case 100:
            return 'El video no existe o es privado.';
        case 101:
        case 150:
            return 'El dueño del video no permite reproducirlo fuera de YouTube.';
        case 153:
            return 'YouTube no pudo verificar el origen de la página. Abrí el juego desde su enlace publicado o desde un servidor local.';
        default:
            return 'No se pudo reproducir el video.';
    }
}
let apiPromise = null;
function loadApi() {
    if (apiPromise)
        return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        if (w.YT && w.YT.Player) {
            resolve();
            return;
        }
        const previous = w.onYouTubeIframeAPIReady;
        w.onYouTubeIframeAPIReady = () => {
            previous?.();
            resolve();
        };
        const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
        if (existing)
            return;
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = () => reject(new Error('No se pudo cargar la API de YouTube. Revisá tu conexión.'));
        document.head.appendChild(script);
    });
    return apiPromise;
}
/**
 * Envuelve el reproductor oficial de YouTube (IFrame API) para reproducir
 * fragmentos que arrancan en `startAt` y se cortan a los N segundos.
 * El audio se transmite desde YouTube; la app no descarga ni guarda nada.
 */
class ClipPlayer {
    constructor() {
        this.playing = false;
        this.startAt = 0;
        this.limit = Infinity;
        this.pollId = 0;
        this.armed = false;
        this.session = 0;
    }
    async mount(hostId) {
        await loadApi();
        await new Promise((resolve) => {
            this.yt = new w.YT.Player(hostId, {
                width: '100%',
                height: '100%',
                playerVars: {
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    playsinline: 1,
                    modestbranding: 1,
                    iv_load_policy: 3,
                    origin: location.origin,
                },
                events: {
                    onReady: () => resolve(),
                    onStateChange: (e) => this.onState(e.data),
                    onError: (e) => this.onPlayerError(e.data),
                },
            });
        });
    }
    /** Prepara el video (sin reproducirlo). Rechaza si no se puede incrustar. */
    load(song) {
        this.halt(false);
        this.startAt = song.startAt;
        return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
                this.pending = undefined;
                reject(new PlayerError(0, 'El video tardó demasiado en cargar.'));
            }, 10000);
            this.pending = { resolve, reject, timer };
            this.yt.cueVideoById({ videoId: song.youtubeId, startSeconds: song.startAt });
        });
    }
    playClip(seconds, tick, done) {
        this.begin(seconds, tick, done);
    }
    playFull(tick, done) {
        this.begin(Infinity, tick, done);
    }
    stop() {
        this.halt(true);
    }
    begin(limit, tick, done) {
        this.halt(false);
        this.limit = limit;
        this.tick = tick;
        this.done = done;
        this.armed = true;
        this.playing = true;
        const token = ++this.session;
        this.yt.seekTo(this.startAt, true);
        this.yt.playVideo();
        // Si el navegador bloquea el audio o el video no arranca, no dejamos el botón trabado.
        window.setTimeout(() => {
            if (token === this.session && this.armed) {
                this.halt(true);
                this.onError?.(new PlayerError(0, 'No se pudo iniciar la reproducción. Probá de nuevo.'));
            }
        }, 8000);
    }
    onState(state) {
        if (state === ST.CUED && this.pending) {
            window.clearTimeout(this.pending.timer);
            this.pending.resolve();
            this.pending = undefined;
        }
        else if (state === ST.PLAYING && this.armed) {
            this.armed = false;
            this.startPolling();
        }
        else if (state === ST.ENDED && this.playing) {
            this.halt(true);
        }
    }
    onPlayerError(code) {
        const err = new PlayerError(code, describe(code));
        if (this.pending) {
            window.clearTimeout(this.pending.timer);
            this.pending.reject(err);
            this.pending = undefined;
        }
        else {
            this.halt(true);
            this.onError?.(err);
        }
    }
    startPolling() {
        window.clearInterval(this.pollId);
        this.pollId = window.setInterval(() => {
            const elapsed = Math.max(0, this.yt.getCurrentTime() - this.startAt);
            const span = Math.max(1, this.yt.getDuration() - this.startAt);
            this.tick?.(Math.min(elapsed, this.limit), span);
            if (elapsed >= this.limit)
                this.halt(true);
        }, 200);
    }
    halt(notify) {
        window.clearInterval(this.pollId);
        this.pollId = 0;
        const wasActive = this.playing || this.armed;
        this.playing = false;
        this.armed = false;
        const done = this.done;
        this.done = undefined;
        this.tick = undefined;
        if (wasActive && this.yt) {
            try {
                this.yt.pauseVideo();
                this.yt.seekTo(this.startAt, true);
            }
            catch {
                /* el reproductor puede no estar listo todavía */
            }
        }
        if (notify)
            done?.();
    }
}
exports.ClipPlayer = ClipPlayer;

},
"src/storage": function(module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadStats = loadStats;
exports.saveStats = saveStats;
const config_1 = __require("src/config");
const fresh = () => ({ streak: 0, best: 0, seen: [] });
function loadStats() {
    try {
        const raw = localStorage.getItem(config_1.STORAGE_KEY);
        if (!raw)
            return fresh();
        const p = JSON.parse(raw);
        return {
            streak: Number(p.streak) || 0,
            best: Number(p.best) || 0,
            seen: Array.isArray(p.seen) ? p.seen.filter((x) => typeof x === 'string').slice(-5000) : [],
        };
    }
    catch {
        return fresh();
    }
}
function saveStats(stats) {
    try {
        localStorage.setItem(config_1.STORAGE_KEY, JSON.stringify(stats));
    }
    catch {
        /* sin almacenamiento: el juego sigue funcionando sin guardar la racha */
    }
}

},
"src/types": function(module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},
"src/ui": function(module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI = void 0;
const config_1 = __require("src/config");
const catalog_1 = __require("src/catalog");
function $(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Falta el elemento #${id} en index.html`);
    return el;
}
function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className)
        el.className = className;
    if (text !== undefined)
        el.textContent = text;
    return el;
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
const ICON_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
const VEIL_IDLE = 'El video se revela al final';
class UI {
    constructor(handlers) {
        this.handlers = handlers;
        this.el = {
            streak: $('streak'),
            info: $('info'),
            infoBtn: $('infoBtn'),
            guesses: $('guesses'),
            stage: $('stage'),
            veilText: $('veilText'),
            timeline: $('timeline'),
            fill: $('fill'),
            controls: $('controls'),
            play: $('play'),
            clockNow: $('clockNow'),
            clockMax: $('clockMax'),
            skip: $('skip'),
            search: $('search'),
            q: $('q'),
            opts: $('opts'),
            result: $('result'),
            verdict: $('verdict'),
            answer: $('answer'),
            answerBy: $('answerBy'),
            fullBtn: $('fullBtn'),
            nextBtn: $('nextBtn'),
            status: $('status'),
        };
        this.segments = [];
        this.game = null;
        this.options = [];
        this.selected = 0;
        this.toastTimer = 0;
        this.buildTimeline();
        this.setPlaying(false);
        this.el.play.addEventListener('click', () => this.handlers.onPlay());
        this.el.fullBtn.addEventListener('click', () => this.handlers.onPlay());
        this.el.skip.addEventListener('click', () => this.handlers.onSkip());
        this.el.nextBtn.addEventListener('click', () => this.handlers.onNext());
        this.el.infoBtn.addEventListener('click', () => {
            const open = this.el.info.hidden;
            this.el.info.hidden = !open;
            this.el.infoBtn.setAttribute('aria-expanded', String(open));
        });
        this.el.q.addEventListener('input', () => {
            this.selected = 0;
            this.renderOptions();
        });
        this.el.q.addEventListener('keydown', (e) => this.onKey(e));
    }
    /* ---------- estado general ---------- */
    renderGame(game, stats) {
        this.game = game;
        this.el.streak.textContent = String(stats.streak);
        this.renderRows(game);
        this.segments.forEach((seg, i) => {
            const open = game.over || i <= game.stage;
            seg.classList.toggle('is-open', open);
            seg.classList.toggle('is-locked', !open);
        });
        const inc = game.nextIncrement;
        this.el.skip.replaceChildren();
        if (inc === null) {
            this.el.skip.append('Rendirse');
        }
        else {
            this.el.skip.append('Saltar ', h('span', 'inc', `+${inc}s`));
        }
        this.el.skip.hidden = game.over;
        this.el.search.hidden = game.over;
        this.setFill(0);
        this.setClock(0, game.over ? 0 : game.clipSeconds);
        this.clearSearch();
    }
    setLoading(on, message = '') {
        this.el.stage.dataset.loading = String(on);
        this.el.veilText.textContent = on ? message : VEIL_IDLE;
        this.el.play.disabled = on;
        this.el.skip.disabled = on;
        this.el.q.disabled = on;
    }
    setPlaying(on) {
        this.el.stage.dataset.playing = String(on);
        this.el.play.innerHTML = on ? ICON_STOP : ICON_PLAY;
        this.el.play.setAttribute('aria-label', on ? 'Detener' : 'Reproducir');
        this.el.fullBtn.textContent = on ? 'Detener' : 'Escuchar completa';
    }
    setFill(fraction) {
        const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
        this.el.fill.style.width = `${f * 100}%`;
    }
    setClock(elapsed, limit) {
        this.el.clockNow.textContent = fmt(elapsed);
        this.el.clockMax.textContent = limit > 0 ? fmt(limit) : '';
    }
    reveal(on) {
        this.el.stage.dataset.revealed = String(on);
    }
    showResult(game) {
        const tries = game.guesses.length;
        this.el.verdict.className = `verdict ${game.won ? 'win' : 'lose'}`;
        this.el.verdict.textContent = game.won
            ? `Correcto · ${tries} ${tries === 1 ? 'intento' : 'intentos'}`
            : 'Se acabaron los intentos';
        this.el.answer.textContent = game.song.title;
        this.el.answerBy.textContent = game.song.artist;
        this.el.result.hidden = false;
    }
    hideResult() {
        this.el.result.hidden = true;
    }
    toast(message, sticky = false) {
        window.clearTimeout(this.toastTimer);
        this.el.status.textContent = message;
        this.el.status.hidden = false;
        if (!sticky) {
            this.toastTimer = window.setTimeout(() => {
                this.el.status.hidden = true;
            }, 5000);
        }
    }
    fatal(message) {
        this.toast(message, true);
        this.setLoading(true, 'No disponible');
    }
    /* ---------- piezas internas ---------- */
    buildTimeline() {
        this.el.timeline.querySelectorAll('.seg').forEach((n) => n.remove());
        config_1.STAGES.forEach((s, i) => {
            const width = s - (i > 0 ? config_1.STAGES[i - 1] : 0);
            const seg = h('div', 'seg is-locked', `${s}s`);
            seg.style.setProperty('--w', String(width));
            this.el.timeline.insertBefore(seg, this.el.fill);
            this.segments.push(seg);
        });
        this.el.timeline.setAttribute('aria-label', `Línea de tiempo: ${config_1.TOTAL_SECONDS} segundos en ${config_1.MAX_GUESSES} tramos`);
    }
    renderRows(game) {
        this.el.guesses.replaceChildren();
        for (let i = 0; i < config_1.MAX_GUESSES; i++) {
            const g = game.guesses[i];
            const active = !game.over && i === game.guesses.length;
            const li = h('li', active ? 'row is-active' : 'row');
            if (g)
                li.dataset.kind = g.kind;
            const main = h('span', 'main');
            let mark = '';
            if (g) {
                if (g.kind === 'skip') {
                    main.append(h('span', 'skipped', 'Saltada'));
                    mark = '→';
                }
                else {
                    main.append(h('span', 't', g.title ?? ''), h('span', 'by', g.artist ?? ''));
                    mark = g.kind === 'right' ? '✓' : g.kind === 'close' ? '≈' : '✕';
                }
            }
            else if (active) {
                main.append(h('span', 'ph', `Intento ${i + 1} de ${config_1.MAX_GUESSES}`));
            }
            li.append(h('span', 'secs', `${config_1.STAGES[i]}s`), main, h('span', 'mark', mark));
            this.el.guesses.appendChild(li);
        }
    }
    renderOptions() {
        const used = this.game?.usedIds ?? new Set();
        this.options = (0, catalog_1.search)(this.el.q.value, used);
        if (this.selected >= this.options.length)
            this.selected = 0;
        this.el.opts.replaceChildren();
        this.options.forEach((entry, i) => {
            const li = h('li');
            const btn = h('button', i === this.selected ? 'is-sel' : '');
            btn.type = 'button';
            btn.setAttribute('role', 'option');
            btn.append(h('span', undefined, entry.title), h('span', 'o-by', entry.artist));
            btn.addEventListener('click', () => this.handlers.onPick(entry));
            li.appendChild(btn);
            this.el.opts.appendChild(li);
        });
    }
    clearSearch() {
        this.el.q.value = '';
        this.selected = 0;
        this.renderOptions();
    }
    onKey(e) {
        const n = this.options.length;
        if (e.key === 'ArrowDown' && n) {
            e.preventDefault();
            this.selected = (this.selected + 1) % n;
            this.renderOptions();
        }
        else if (e.key === 'ArrowUp' && n) {
            e.preventDefault();
            this.selected = (this.selected - 1 + n) % n;
            this.renderOptions();
        }
        else if (e.key === 'Enter' && this.options[this.selected]) {
            e.preventDefault();
            this.handlers.onPick(this.options[this.selected]);
        }
        else if (e.key === 'Escape') {
            this.clearSearch();
        }
    }
}
exports.UI = UI;

}
};
const __cache = {};
function __require(id){ if(__cache[id]) return __cache[id].exports; const factory=__modules[id]; if(!factory) throw new Error('Module not found: '+id); const module=__cache[id]={exports:{}}; factory(module,module.exports,__require); return module.exports; }
__require('src/main');
})();
