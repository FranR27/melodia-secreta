/** Una entrada del catálogo. Si no tiene youtubeId, solo aparece en el buscador como distractor. */
export interface CatalogEntry {
  id: string;
  title: string;
  artist: string;
  youtubeId?: string;
  /** Segundo del video donde arranca el fragmento. Por defecto 0. */
  startAt?: number;
}

/** Una canción que se puede jugar: tiene video de YouTube. */
export interface Song extends CatalogEntry {
  youtubeId: string;
  startAt: number;
}

export type GuessKind = 'skip' | 'wrong' | 'close' | 'right';

export interface Guess {
  kind: GuessKind;
  id?: string;
  title?: string;
  artist?: string;
}

export interface Stats {
  streak: number;
  best: number;
  /** Canciones ya jugadas, para no repetir hasta agotar el catálogo. */
  seen: string[];
}
