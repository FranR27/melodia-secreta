import { getPlayable, loadRemoteCatalog } from './catalog';
import { TOTAL_SECONDS } from './config';
import { Game } from './game';
import { ClipPlayer } from './player';
import { loadStats, saveStats } from './storage';
import { UI } from './ui';
import type { CatalogEntry, Song } from './types';

const stats = loadStats();
const player = new ClipPlayer();
/** Canciones que YouTube no dejó incrustar en esta sesión. */
const blocked = new Set<string>();
let game: Game | null = null;

const ui = new UI({ onPlay: togglePlay, onSkip: skip, onPick: pick, onNext: newRound });

player.onError = (err) => ui.toast(err.message);

function pickSong(): Song | null {
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

async function newRound(): Promise<void> {
  player.stop();
  ui.hideResult();
  ui.reveal(false);
  ui.setPlaying(false);

  const maxTries = getPlayable().length;
  for (let tries = 0; tries <= maxTries; tries++) {
    const song = pickSong();
    if (!song) break;
    ui.setLoading(true, 'Cargando canción…');
    try {
      await player.load(song);
    } catch (e) {
      blocked.add(song.id);
      const reason = e instanceof Error ? e.message : 'No se pudo cargar.';
      ui.toast(`Salté "${song.title}": ${reason}`);
      continue;
    }
    stats.seen.push(song.id);
    // Keep browser storage bounded even after many sessions.
    if (stats.seen.length > 5000) stats.seen = stats.seen.slice(-5000);
    saveStats(stats);
    game = new Game(song);
    ui.setLoading(false);
    ui.renderGame(game, stats);
    return;
  }
  ui.fatal('No se pudo cargar ninguna canción. Revisá la conexión y que el juego esté abierto desde un servidor web.');
}

function togglePlay(): void {
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
      stop,
    );
  }
}

function skip(): void {
  if (!game || game.over) return;
  player.stop();
  game.skip();
  afterGuess();
}

function pick(entry: CatalogEntry): void {
  if (!game || game.over) return;
  player.stop();
  game.guess(entry);
  afterGuess();
}

function afterGuess(): void {
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

async function boot(): Promise<void> {
  ui.setLoading(true, 'Cargando reproductor…');
  try {
    await player.mount('player');
  } catch (e) {
    ui.fatal(e instanceof Error ? e.message : 'No se pudo cargar el reproductor de YouTube.');
    return;
  }
  const catalogue = await loadRemoteCatalog();
  if (catalogue.source === 'static') {
    ui.toast('Catálogo dinámico no disponible; usando las canciones locales.');
  } else {
    ui.toast(`Catálogo listo: ${catalogue.count} canciones disponibles.`);
  }
  await newRound();
}

void boot();

