"use strict";
(() => {
  // data/songs.json
  var songs_default = [
    { id: "de-musica-ligera", title: "De m\xFAsica ligera", artist: "Soda Stereo", youtubeId: "T_FkEw27XJ0", startAt: 0 },
    { id: "matador", title: "Matador", artist: "Los Fabulosos Cadillacs", youtubeId: "pjPA7CXutDw", startAt: 0 },
    { id: "mariposa-tecknicolor", title: "Mariposa Tecknicolor", artist: "Fito P\xE1ez", youtubeId: "CRBincBc_8k", startAt: 0 },
    { id: "flaca", title: "Flaca", artist: "Andr\xE9s Calamaro", youtubeId: "UCF9oHXhDMU", startAt: 0 },
    { id: "crimen", title: "Crimen", artist: "Gustavo Cerati", youtubeId: "uLIs0j2WnlM", startAt: 0 },
    { id: "bohemian-rhapsody", title: "Bohemian Rhapsody", artist: "Queen", youtubeId: "fJ9rUzIMcZQ", startAt: 0 },
    { id: "billie-jean", title: "Billie Jean", artist: "Michael Jackson", youtubeId: "Zi_XLOBDo_Y", startAt: 0 },
    { id: "smells-like-teen-spirit", title: "Smells Like Teen Spirit", artist: "Nirvana", youtubeId: "hTWKbfoikeg", startAt: 0 },
    { id: "wonderwall", title: "Wonderwall", artist: "Oasis", youtubeId: "bx1Bh8ZvH84", startAt: 0 },
    { id: "despacito", title: "Despacito", artist: "Luis Fonsi", youtubeId: "kJQP7kiw5Fk", startAt: 0 },
    { id: "waka-waka", title: "Waka Waka (This Time for Africa)", artist: "Shakira", youtubeId: "pRpeEdMmmQ0", startAt: 0 },
    { id: "take-on-me", title: "Take On Me", artist: "a-ha", youtubeId: "djV11Xbc914", startAt: 0 },
    { id: "persiana-americana", title: "Persiana Americana", artist: "Soda Stereo" },
    { id: "cuando-pase-el-temblor", title: "Cuando pase el temblor", artist: "Soda Stereo" },
    { id: "demoliendo-hoteles", title: "Demoliendo hoteles", artist: "Charly Garc\xEDa" },
    { id: "rezo-por-vos", title: "Rezo por vos", artist: "Charly Garc\xEDa" },
    { id: "mal-bicho", title: "Mal bicho", artist: "Los Fabulosos Cadillacs" },
    { id: "vasos-vacios", title: "Vasos vac\xEDos", artist: "Los Fabulosos Cadillacs" },
    { id: "al-lado-del-camino", title: "Al lado del camino", artist: "Fito P\xE1ez" },
    { id: "yo-vengo-a-ofrecer", title: "Yo vengo a ofrecer mi coraz\xF3n", artist: "Fito P\xE1ez" },
    { id: "puente", title: "Puente", artist: "Gustavo Cerati" },
    { id: "adios", title: "Adi\xF3s", artist: "Gustavo Cerati" },
    { id: "crimenes-perfectos", title: "Cr\xEDmenes perfectos", artist: "Andr\xE9s Calamaro" },
    { id: "spaghetti-del-rock", title: "Spaghetti del rock", artist: "Divididos" },
    { id: "dont-stop-me-now", title: "Don't Stop Me Now", artist: "Queen" },
    { id: "we-will-rock-you", title: "We Will Rock You", artist: "Queen" },
    { id: "thriller", title: "Thriller", artist: "Michael Jackson" },
    { id: "come-as-you-are", title: "Come as You Are", artist: "Nirvana" },
    { id: "dont-look-back-in-anger", title: "Don't Look Back in Anger", artist: "Oasis" },
    { id: "hips-dont-lie", title: "Hips Don't Lie", artist: "Shakira" },
    { id: "whenever-wherever", title: "Whenever, Wherever", artist: "Shakira" },
    { id: "echame-la-culpa", title: "\xC9chame la culpa", artist: "Luis Fonsi" },
    { id: "titi-me-pregunto", title: "Tit\xED Me Pregunt\xF3", artist: "Bad Bunny" },
    { id: "me-porto-bonito", title: "Me Porto Bonito", artist: "Bad Bunny" },
    { id: "gasolina", title: "Gasolina", artist: "Daddy Yankee" },
    { id: "the-sun-always-shines-on-tv", title: "The Sun Always Shines on T.V.", artist: "a-ha" }
  ];

  // src/catalog.ts
  var STATIC_CATALOG = songs_default;
  var CLIENT_CACHE_KEY = "melodia-secreta:catalog:v2";
  var CLIENT_CACHE_TTL = 24 * 60 * 60 * 1e3;
  var MAX_REMOTE_ENTRIES = 1500;
  var catalog = mergeCatalog(STATIC_CATALOG, []);
  function normalize(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  function validEntry(value) {
    if (!value || typeof value !== "object") return false;
    const e = value;
    return typeof e.id === "string" && e.id.length > 0 && typeof e.title === "string" && e.title.trim().length > 0 && typeof e.artist === "string" && e.artist.trim().length > 0 && (!e.youtubeId || /^[\w-]{11}$/.test(e.youtubeId));
  }
  function mergeCatalog(base, incoming) {
    const byVideo = /* @__PURE__ */ new Map();
    const bySong = /* @__PURE__ */ new Map();
    for (const candidate of [...base, ...incoming.filter(validEntry)]) {
      const entry = {
        ...candidate,
        title: candidate.title.trim(),
        artist: candidate.artist.trim(),
        startAt: Math.max(0, Number(candidate.startAt) || 0)
      };
      const videoKey = entry.youtubeId ? `yt:${entry.youtubeId}` : "";
      const songKey = `${normalize(entry.title)}::${normalize(entry.artist)}`;
      if (videoKey && byVideo.has(videoKey)) continue;
      const previous = bySong.get(songKey);
      if (previous?.youtubeId) continue;
      if (previous && !entry.youtubeId) continue;
      if (previous && entry.youtubeId) {
        bySong.set(songKey, entry);
        if (previous.youtubeId) byVideo.delete(`yt:${previous.youtubeId}`);
      } else {
        bySong.set(songKey, entry);
      }
      if (videoKey) byVideo.set(videoKey, entry);
    }
    return [...bySong.values()].sort((a, b) => a.title.localeCompare(b.title, "es"));
  }
  function getPlayable() {
    return catalog.flatMap(
      (entry) => entry.youtubeId ? [{ ...entry, youtubeId: entry.youtubeId, startAt: entry.startAt ?? 0 }] : []
    );
  }
  async function loadRemoteCatalog() {
    const endpoint = document.querySelector('meta[name="melodia-api-base"]')?.content.trim();
    if (!endpoint) return { count: getPlayable().length, source: "static" };
    try {
      const cached = localStorage.getItem(CLIENT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt < CLIENT_CACHE_TTL && Array.isArray(parsed.songs)) {
          catalog = mergeCatalog(STATIC_CATALOG, parsed.songs);
          void fetchRemote(endpoint).catch(() => void 0);
          return { count: getPlayable().length, source: "cache" };
        }
      }
    } catch {
    }
    try {
      await fetchRemote(endpoint);
      return { count: getPlayable().length, source: "remote" };
    } catch {
      return { count: getPlayable().length, source: "static" };
    }
  }
  async function fetchRemote(endpoint) {
    const url = endpoint.replace(/\/$/, "");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12e3);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Cat\xE1logo remoto: HTTP ${response.status}`);
      const payload = await response.json();
      const songs = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray(payload.songs) ? payload.songs : null;
      if (!songs) throw new Error("La API devolvi\xF3 un cat\xE1logo con formato incorrecto.");
      catalog = mergeCatalog(STATIC_CATALOG, songs).slice(0, MAX_REMOTE_ENTRIES + STATIC_CATALOG.length);
      try {
        localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), songs }));
      } catch {
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }
  function search(query, exclude, limit = 6) {
    const q = normalize(query);
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return catalog.filter((entry) => !exclude.has(entry.id) && tokens.every((token) => normalize(`${entry.title} ${entry.artist}`).includes(token))).slice(0, limit);
  }

  // src/config.ts
  var STAGES = [1, 2, 4, 7, 11, 16];
  var MAX_GUESSES = STAGES.length;
  var TOTAL_SECONDS = STAGES[STAGES.length - 1];
  var STORAGE_KEY = "melodia-secreta:v2";

  // src/game.ts
  var Game = class {
    constructor(song) {
      this.song = song;
      this.guesses = [];
      this.over = false;
      this.won = false;
    }
    /** Índice del tramo actual (0 a 5). */
    get stage() {
      return Math.min(this.guesses.length, MAX_GUESSES - 1);
    }
    /** Segundos de canción que se pueden escuchar ahora. */
    get clipSeconds() {
      return STAGES[this.stage];
    }
    /** Segundos extra que suma saltar, o null si ya es el último tramo. */
    get nextIncrement() {
      return this.stage < MAX_GUESSES - 1 ? STAGES[this.stage + 1] - STAGES[this.stage] : null;
    }
    get usedIds() {
      return new Set(this.guesses.flatMap((g) => g.id ? [g.id] : []));
    }
    guess(entry) {
      const right = entry.id === this.song.id;
      const sameArtist = entry.artist.toLowerCase() === this.song.artist.toLowerCase();
      const g = {
        kind: right ? "right" : sameArtist ? "close" : "wrong",
        id: entry.id,
        title: entry.title,
        artist: entry.artist
      };
      return this.push(g);
    }
    skip() {
      return this.push({ kind: "skip" });
    }
    push(g) {
      if (this.over) return g;
      this.guesses.push(g);
      if (g.kind === "right") {
        this.over = true;
        this.won = true;
      } else if (this.guesses.length >= MAX_GUESSES) {
        this.over = true;
      }
      return g;
    }
  };

  // src/player.ts
  var w = window;
  var ST = { ENDED: 0, PLAYING: 1, CUED: 5 };
  var PlayerError = class extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  };
  function describe(code) {
    switch (code) {
      case 2:
        return "El ID del video no es v\xE1lido.";
      case 5:
        return "El reproductor de YouTube tuvo un error.";
      case 100:
        return "El video no existe o es privado.";
      case 101:
      case 150:
        return "El due\xF1o del video no permite reproducirlo fuera de YouTube.";
      case 153:
        return "YouTube no pudo verificar el origen de la p\xE1gina. Abr\xED el juego desde su enlace publicado o desde un servidor local.";
      default:
        return "No se pudo reproducir el video.";
    }
  }
  var apiPromise = null;
  function loadApi() {
    if (apiPromise) return apiPromise;
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
      if (existing) return;
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => reject(new Error("No se pudo cargar la API de YouTube. Revis\xE1 tu conexi\xF3n."));
      document.head.appendChild(script);
    });
    return apiPromise;
  }
  var ClipPlayer = class {
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
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            iv_load_policy: 3,
            origin: location.origin
          },
          events: {
            onReady: () => resolve(),
            onStateChange: (e) => this.onState(e.data),
            onError: (e) => this.onPlayerError(e.data)
          }
        });
      });
    }
    /** Prepara el video (sin reproducirlo). Rechaza si no se puede incrustar. */
    load(song) {
      this.halt(false);
      this.startAt = song.startAt;
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          this.pending = void 0;
          reject(new PlayerError(0, "El video tard\xF3 demasiado en cargar."));
        }, 1e4);
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
      window.setTimeout(() => {
        if (token === this.session && this.armed) {
          this.halt(true);
          this.onError?.(new PlayerError(0, "No se pudo iniciar la reproducci\xF3n. Prob\xE1 de nuevo."));
        }
      }, 8e3);
    }
    onState(state) {
      if (state === ST.CUED && this.pending) {
        window.clearTimeout(this.pending.timer);
        this.pending.resolve();
        this.pending = void 0;
      } else if (state === ST.PLAYING && this.armed) {
        this.armed = false;
        this.startPolling();
      } else if (state === ST.ENDED && this.playing) {
        this.halt(true);
      }
    }
    onPlayerError(code) {
      const err = new PlayerError(code, describe(code));
      if (this.pending) {
        window.clearTimeout(this.pending.timer);
        this.pending.reject(err);
        this.pending = void 0;
      } else {
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
        if (elapsed >= this.limit) this.halt(true);
      }, 200);
    }
    halt(notify) {
      window.clearInterval(this.pollId);
      this.pollId = 0;
      const wasActive = this.playing || this.armed;
      this.playing = false;
      this.armed = false;
      const done = this.done;
      this.done = void 0;
      this.tick = void 0;
      if (wasActive && this.yt) {
        try {
          this.yt.pauseVideo();
          this.yt.seekTo(this.startAt, true);
        } catch {
        }
      }
      if (notify) done?.();
    }
  };

  // src/storage.ts
  var fresh = () => ({ streak: 0, best: 0, seen: [] });
  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fresh();
      const p = JSON.parse(raw);
      return {
        streak: Number(p.streak) || 0,
        best: Number(p.best) || 0,
        seen: Array.isArray(p.seen) ? p.seen.filter((x) => typeof x === "string").slice(-5e3) : []
      };
    } catch {
      return fresh();
    }
  }
  function saveStats(stats2) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats2));
    } catch {
    }
  }

  // src/ui.ts
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Falta el elemento #${id} en index.html`);
    return el;
  }
  function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== void 0) el.textContent = text;
    return el;
  }
  var fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
  var ICON_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  var VEIL_IDLE = "El video se revela al final";
  var UI = class {
    constructor(handlers) {
      this.handlers = handlers;
      this.el = {
        streak: $("streak"),
        info: $("info"),
        infoBtn: $("infoBtn"),
        guesses: $("guesses"),
        stage: $("stage"),
        veilText: $("veilText"),
        timeline: $("timeline"),
        fill: $("fill"),
        controls: $("controls"),
        play: $("play"),
        clockNow: $("clockNow"),
        clockMax: $("clockMax"),
        skip: $("skip"),
        search: $("search"),
        q: $("q"),
        opts: $("opts"),
        result: $("result"),
        verdict: $("verdict"),
        answer: $("answer"),
        answerBy: $("answerBy"),
        fullBtn: $("fullBtn"),
        nextBtn: $("nextBtn"),
        status: $("status")
      };
      this.segments = [];
      this.game = null;
      this.options = [];
      this.selected = 0;
      this.toastTimer = 0;
      this.buildTimeline();
      this.setPlaying(false);
      this.el.play.addEventListener("click", () => this.handlers.onPlay());
      this.el.fullBtn.addEventListener("click", () => this.handlers.onPlay());
      this.el.skip.addEventListener("click", () => this.handlers.onSkip());
      this.el.nextBtn.addEventListener("click", () => this.handlers.onNext());
      this.el.infoBtn.addEventListener("click", () => {
        const open = this.el.info.hidden;
        this.el.info.hidden = !open;
        this.el.infoBtn.setAttribute("aria-expanded", String(open));
      });
      this.el.q.addEventListener("input", () => {
        this.selected = 0;
        this.renderOptions();
      });
      this.el.q.addEventListener("keydown", (e) => this.onKey(e));
    }
    /* ---------- estado general ---------- */
    renderGame(game2, stats2) {
      this.game = game2;
      this.el.streak.textContent = String(stats2.streak);
      this.renderRows(game2);
      this.segments.forEach((seg, i) => {
        const open = game2.over || i <= game2.stage;
        seg.classList.toggle("is-open", open);
        seg.classList.toggle("is-locked", !open);
        seg.classList.toggle("is-current", !game2.over && i === game2.stage);
      });
      const inc = game2.nextIncrement;
      this.el.skip.replaceChildren();
      if (inc === null) {
        this.el.skip.append("Rendirse");
      } else {
        this.el.skip.append("Saltar ", h("span", "inc", `+${inc}s`));
      }
      this.el.skip.hidden = game2.over;
      this.el.search.hidden = game2.over;
      this.setFill(0);
      this.setClock(0, game2.over ? 0 : game2.clipSeconds);
      this.clearSearch();
    }
    setLoading(on, message = "") {
      this.el.stage.dataset.loading = String(on);
      this.el.veilText.textContent = on ? message : VEIL_IDLE;
      this.el.play.disabled = on;
      this.el.skip.disabled = on;
      this.el.q.disabled = on;
    }
    setPlaying(on) {
      this.el.stage.dataset.playing = String(on);
      this.el.play.dataset.playing = String(on);
      this.el.play.innerHTML = on ? ICON_STOP : ICON_PLAY;
      this.el.play.setAttribute("aria-label", on ? "Detener" : "Reproducir");
      this.el.fullBtn.textContent = on ? "Detener" : "Escuchar completa";
    }
    setFill(fraction) {
      const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
      this.el.fill.style.width = `${f * 100}%`;
    }
    setClock(elapsed, limit) {
      this.el.clockNow.textContent = fmt(elapsed);
      this.el.clockMax.textContent = limit > 0 ? fmt(limit) : "";
    }
    reveal(on) {
      this.el.stage.dataset.revealed = String(on);
    }
    showResult(game2) {
      const tries = game2.guesses.length;
      this.el.verdict.className = `verdict ${game2.won ? "win" : "lose"}`;
      this.el.result.classList.toggle("is-win", game2.won);
      this.el.result.classList.toggle("is-lose", !game2.won);
      this.el.verdict.textContent = game2.won ? `Correcto en ${tries} ${tries === 1 ? "intento" : "intentos"}` : "Se acabaron los intentos";
      this.el.answer.textContent = game2.song.title;
      this.el.answerBy.textContent = game2.song.artist;
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
        }, 5e3);
      }
    }
    fatal(message) {
      this.toast(message, true);
      this.setLoading(true, "No disponible");
    }
    /* ---------- piezas internas ---------- */
    buildTimeline() {
      this.el.timeline.querySelectorAll(".seg").forEach((n) => n.remove());
      STAGES.forEach((s, i) => {
        const width = s - (i > 0 ? STAGES[i - 1] : 0);
        const seg = h("div", "seg is-locked", `${s}s`);
        seg.style.setProperty("--w", String(width));
        this.el.timeline.insertBefore(seg, this.el.fill);
        this.segments.push(seg);
      });
      this.el.timeline.setAttribute(
        "aria-label",
        `L\xEDnea de tiempo: ${TOTAL_SECONDS} segundos en ${MAX_GUESSES} tramos`
      );
    }
    renderRows(game2) {
      this.el.guesses.replaceChildren();
      for (let i = 0; i < MAX_GUESSES; i++) {
        const g = game2.guesses[i];
        const active = !game2.over && i === game2.guesses.length;
        const li = h("li", active ? "row is-active" : "row");
        if (g) li.dataset.kind = g.kind;
        if (g && i === game2.guesses.length - 1) li.classList.add("is-new");
        const main = h("span", "main");
        let mark = "";
        if (g) {
          if (g.kind === "skip") {
            main.append(h("span", "skipped", "Saltada"));
            mark = "\u2192";
          } else {
            main.append(h("span", "t", g.title ?? ""), h("span", "by", g.artist ?? ""));
            mark = g.kind === "right" ? "\u2713" : g.kind === "close" ? "\u2248" : "\u2715";
          }
        } else if (active) {
          main.append(h("span", "ph", `Intento ${i + 1} de ${MAX_GUESSES}`));
        }
        li.append(h("span", "secs", `${STAGES[i]}s`), main, h("span", "mark", mark));
        this.el.guesses.appendChild(li);
      }
    }
    renderOptions() {
      const used = this.game?.usedIds ?? /* @__PURE__ */ new Set();
      this.options = search(this.el.q.value, used);
      if (this.selected >= this.options.length) this.selected = 0;
      this.el.opts.replaceChildren();
      this.options.forEach((entry, i) => {
        const li = h("li");
        const btn = h("button", i === this.selected ? "is-sel" : "");
        btn.type = "button";
        btn.setAttribute("role", "option");
        btn.append(h("span", void 0, entry.title), h("span", "o-by", entry.artist));
        btn.addEventListener("click", () => this.handlers.onPick(entry));
        li.appendChild(btn);
        this.el.opts.appendChild(li);
      });
    }
    clearSearch() {
      this.el.q.value = "";
      this.selected = 0;
      this.renderOptions();
    }
    onKey(e) {
      const n = this.options.length;
      if (e.key === "ArrowDown" && n) {
        e.preventDefault();
        this.selected = (this.selected + 1) % n;
        this.renderOptions();
      } else if (e.key === "ArrowUp" && n) {
        e.preventDefault();
        this.selected = (this.selected - 1 + n) % n;
        this.renderOptions();
      } else if (e.key === "Enter" && this.options[this.selected]) {
        e.preventDefault();
        this.handlers.onPick(this.options[this.selected]);
      } else if (e.key === "Escape") {
        this.clearSearch();
      }
    }
  };

  // src/main.ts
  var stats = loadStats();
  var player = new ClipPlayer();
  var blocked = /* @__PURE__ */ new Set();
  var game = null;
  var ui = new UI({ onPlay: togglePlay, onSkip: skip, onPick: pick, onNext: newRound });
  player.onError = (err) => ui.toast(err.message);
  function pickSong() {
    const available = getPlayable().filter((s) => !blocked.has(s.id));
    if (!available.length) return null;
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
    const maxTries = getPlayable().length;
    for (let tries = 0; tries <= maxTries; tries++) {
      const song = pickSong();
      if (!song) break;
      ui.setLoading(true, "Cargando canci\xF3n\u2026");
      try {
        await player.load(song);
      } catch (e) {
        blocked.add(song.id);
        const reason = e instanceof Error ? e.message : "No se pudo cargar.";
        ui.toast(`Salt\xE9 "${song.title}": ${reason}`);
        continue;
      }
      stats.seen.push(song.id);
      if (stats.seen.length > 5e3) stats.seen = stats.seen.slice(-5e3);
      saveStats(stats);
      game = new Game(song);
      ui.setLoading(false);
      ui.renderGame(game, stats);
      return;
    }
    ui.fatal("No se pudo cargar ninguna canci\xF3n. Revis\xE1 la conexi\xF3n y que el juego est\xE9 abierto desde un servidor web.");
  }
  function togglePlay() {
    if (!game) return;
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
    } else {
      const limit = game.clipSeconds;
      player.playClip(
        limit,
        (elapsed) => {
          ui.setFill(elapsed / TOTAL_SECONDS);
          ui.setClock(elapsed, limit);
        },
        stop
      );
    }
  }
  function skip() {
    if (!game || game.over) return;
    player.stop();
    game.skip();
    afterGuess();
  }
  function pick(entry) {
    if (!game || game.over) return;
    player.stop();
    game.guess(entry);
    afterGuess();
  }
  function afterGuess() {
    if (!game) return;
    if (game.over) {
      if (game.won) {
        stats.streak += 1;
        stats.best = Math.max(stats.best, stats.streak);
      } else {
        stats.streak = 0;
      }
      saveStats(stats);
      ui.reveal(true);
      ui.renderGame(game, stats);
      ui.showResult(game);
    } else {
      ui.renderGame(game, stats);
    }
  }
  async function boot() {
    ui.setLoading(true, "Cargando reproductor\u2026");
    try {
      await player.mount("player");
    } catch (e) {
      ui.fatal(e instanceof Error ? e.message : "No se pudo cargar el reproductor de YouTube.");
      return;
    }
    const catalogue = await loadRemoteCatalog();
    if (catalogue.source === "static") {
      ui.toast("Cat\xE1logo din\xE1mico no disponible; usando las canciones locales.");
    } else {
      ui.toast(`Cat\xE1logo listo: ${catalogue.count} canciones disponibles.`);
    }
    await newRound();
  }
  void boot();
})();
//# sourceMappingURL=main.js.map
