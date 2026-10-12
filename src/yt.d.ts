/** Tipos mínimos de la IFrame API de YouTube: solo lo que usa player.ts. */
declare namespace YT {
  interface PlayerVars {
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    fs?: 0 | 1;
    rel?: 0 | 1;
    playsinline?: 0 | 1;
    modestbranding?: 0 | 1;
    iv_load_policy?: 1 | 3;
    origin?: string;
  }
  interface OnStateChangeEvent {
    data: number;
  }
  interface OnErrorEvent {
    data: number;
  }
  interface PlayerEvents {
    onReady?: () => void;
    onStateChange?: (e: OnStateChangeEvent) => void;
    onError?: (e: OnErrorEvent) => void;
  }
  interface PlayerOptions {
    width?: number | string;
    height?: number | string;
    videoId?: string;
    playerVars?: PlayerVars;
    events?: PlayerEvents;
  }
  class Player {
    constructor(host: string | HTMLElement, options: PlayerOptions);
    cueVideoById(args: { videoId: string; startSeconds?: number }): void;
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
  }
}
