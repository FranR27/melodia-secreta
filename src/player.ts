import type { Song } from './types';

interface YTWindow extends Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
const w = window as YTWindow;

/** Estados del reproductor de YouTube que usamos. */
const ST = { ENDED: 0, PLAYING: 1, CUED: 5 } as const;

export class PlayerError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

function describe(code: number): string {
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

let apiPromise: Promise<void> | null = null;

function loadApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    if (w.YT && w.YT.Player) {
      resolve();
      return;
    }
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => reject(new Error('No se pudo cargar la API de YouTube. Revisá tu conexión.'));
    document.head.appendChild(script);
  });
  return apiPromise;
}

type TickFn = (elapsed: number, span: number) => void;

/**
 * Envuelve el reproductor oficial de YouTube (IFrame API) para reproducir
 * fragmentos que arrancan en `startAt` y se cortan a los N segundos.
 * El audio se transmite desde YouTube; la app no descarga ni guarda nada.
 */
export class ClipPlayer {
  playing = false;
  onError?: (e: PlayerError) => void;

  private yt!: YT.Player;
  private startAt = 0;
  private limit = Infinity;
  private pollId = 0;
  private armed = false;
  private session = 0;
  private tick?: TickFn;
  private done?: () => void;
  private pending?: { resolve: () => void; reject: (e: PlayerError) => void; timer: number };

  async mount(hostId: string): Promise<void> {
    await loadApi();
    await new Promise<void>((resolve) => {
      this.yt = new w.YT!.Player(hostId, {
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
  load(song: Song): Promise<void> {
    this.halt(false);
    this.startAt = song.startAt;
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending = undefined;
        reject(new PlayerError(0, 'El video tardó demasiado en cargar.'));
      }, 10000);
      this.pending = { resolve, reject, timer };
      this.yt.cueVideoById({ videoId: song.youtubeId, startSeconds: song.startAt });
    });
  }

  playClip(seconds: number, tick: TickFn, done: () => void): void {
    this.begin(seconds, tick, done);
  }

  playFull(tick: TickFn, done: () => void): void {
    this.begin(Infinity, tick, done);
  }

  stop(): void {
    this.halt(true);
  }

  private begin(limit: number, tick: TickFn, done: () => void): void {
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

  private onState(state: number): void {
    if (state === ST.CUED && this.pending) {
      window.clearTimeout(this.pending.timer);
      this.pending.resolve();
      this.pending = undefined;
    } else if (state === ST.PLAYING && this.armed) {
      this.armed = false;
      this.startPolling();
    } else if (state === ST.ENDED && this.playing) {
      this.halt(true);
    }
  }

  private onPlayerError(code: number): void {
    const err = new PlayerError(code, describe(code));
    if (this.pending) {
      window.clearTimeout(this.pending.timer);
      this.pending.reject(err);
      this.pending = undefined;
    } else {
      this.halt(true);
      this.onError?.(err);
    }
  }

  private startPolling(): void {
    window.clearInterval(this.pollId);
    this.pollId = window.setInterval(() => {
      const elapsed = Math.max(0, this.yt.getCurrentTime() - this.startAt);
      const span = Math.max(1, this.yt.getDuration() - this.startAt);
      this.tick?.(Math.min(elapsed, this.limit), span);
      if (elapsed >= this.limit) this.halt(true);
    }, 200);
  }

  private halt(notify: boolean): void {
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
      } catch {
        /* el reproductor puede no estar listo todavía */
      }
    }
    if (notify) done?.();
  }
}
