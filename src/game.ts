import { MAX_GUESSES, STAGES } from './config';
import type { CatalogEntry, Guess, Song } from './types';

/** Lógica pura de una ronda. No toca el DOM ni el reproductor. */
export class Game {
  readonly guesses: Guess[] = [];
  over = false;
  won = false;

  constructor(readonly song: Song) {}

  /** Índice del tramo actual (0 a 5). */
  get stage(): number {
    return Math.min(this.guesses.length, MAX_GUESSES - 1);
  }

  /** Segundos de canción que se pueden escuchar ahora. */
  get clipSeconds(): number {
    return STAGES[this.stage];
  }

  /** Segundos extra que suma saltar, o null si ya es el último tramo. */
  get nextIncrement(): number | null {
    return this.stage < MAX_GUESSES - 1 ? STAGES[this.stage + 1] - STAGES[this.stage] : null;
  }

  get usedIds(): Set<string> {
    return new Set(this.guesses.flatMap((g) => (g.id ? [g.id] : [])));
  }

  guess(entry: CatalogEntry): Guess {
    const right = entry.id === this.song.id;
    const sameArtist = entry.artist.toLowerCase() === this.song.artist.toLowerCase();
    const g: Guess = {
      kind: right ? 'right' : sameArtist ? 'close' : 'wrong',
      id: entry.id,
      title: entry.title,
      artist: entry.artist,
    };
    return this.push(g);
  }

  skip(): Guess {
    return this.push({ kind: 'skip' });
  }

  private push(g: Guess): Guess {
    if (this.over) return g;
    this.guesses.push(g);
    if (g.kind === 'right') {
      this.over = true;
      this.won = true;
    } else if (this.guesses.length >= MAX_GUESSES) {
      this.over = true;
    }
    return g;
  }
}
