import { MAX_GUESSES, STAGES, TOTAL_SECONDS } from './config';
import { search } from './catalog';
import type { Game } from './game';
import type { CatalogEntry, Guess, Stats } from './types';

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en index.html`);
  return el as T;
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

const fmt = (s: number): string =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const ICON_PLAY =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
const ICON_STOP =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

const VEIL_IDLE = 'El video se revela al final';

export interface UIHandlers {
  onPlay(): void;
  onSkip(): void;
  onPick(entry: CatalogEntry): void;
  onNext(): void;
}

export class UI {
  private readonly el = {
    streak: $('streak'),
    info: $('info'),
    infoBtn: $('infoBtn'),
    guesses: $('guesses'),
    stage: $('stage'),
    veilText: $('veilText'),
    timeline: $('timeline'),
    fill: $('fill'),
    controls: $('controls'),
    play: $<HTMLButtonElement>('play'),
    clockNow: $('clockNow'),
    clockMax: $('clockMax'),
    skip: $<HTMLButtonElement>('skip'),
    search: $('search'),
    q: $<HTMLInputElement>('q'),
    opts: $('opts'),
    result: $('result'),
    verdict: $('verdict'),
    answer: $('answer'),
    answerBy: $('answerBy'),
    fullBtn: $<HTMLButtonElement>('fullBtn'),
    nextBtn: $<HTMLButtonElement>('nextBtn'),
    status: $('status'),
  };

  private segments: HTMLElement[] = [];
  private game: Game | null = null;
  private options: CatalogEntry[] = [];
  private selected = 0;
  private toastTimer = 0;

  constructor(private readonly handlers: UIHandlers) {
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

  renderGame(game: Game, stats: Stats): void {
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
    } else {
      this.el.skip.append('Saltar ', h('span', 'inc', `+${inc}s`));
    }
    this.el.skip.hidden = game.over;
    this.el.search.hidden = game.over;
    this.setFill(0);
    this.setClock(0, game.over ? 0 : game.clipSeconds);
    this.clearSearch();
  }

  setLoading(on: boolean, message = ''): void {
    this.el.stage.dataset.loading = String(on);
    this.el.veilText.textContent = on ? message : VEIL_IDLE;
    this.el.play.disabled = on;
    this.el.skip.disabled = on;
    this.el.q.disabled = on;
  }

  setPlaying(on: boolean): void {
    this.el.stage.dataset.playing = String(on);
    this.el.play.innerHTML = on ? ICON_STOP : ICON_PLAY;
    this.el.play.setAttribute('aria-label', on ? 'Detener' : 'Reproducir');
    this.el.fullBtn.textContent = on ? 'Detener' : 'Escuchar completa';
  }

  setFill(fraction: number): void {
    const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
    this.el.fill.style.width = `${f * 100}%`;
  }

  setClock(elapsed: number, limit: number): void {
    this.el.clockNow.textContent = fmt(elapsed);
    this.el.clockMax.textContent = limit > 0 ? fmt(limit) : '';
  }

  reveal(on: boolean): void {
    this.el.stage.dataset.revealed = String(on);
  }

  showResult(game: Game): void {
    const tries = game.guesses.length;
    this.el.verdict.className = `verdict ${game.won ? 'win' : 'lose'}`;
    this.el.verdict.textContent = game.won
      ? `Correcto · ${tries} ${tries === 1 ? 'intento' : 'intentos'}`
      : 'Se acabaron los intentos';
    this.el.answer.textContent = game.song.title;
    this.el.answerBy.textContent = game.song.artist;
    this.el.result.hidden = false;
  }

  hideResult(): void {
    this.el.result.hidden = true;
  }

  toast(message: string, sticky = false): void {
    window.clearTimeout(this.toastTimer);
    this.el.status.textContent = message;
    this.el.status.hidden = false;
    if (!sticky) {
      this.toastTimer = window.setTimeout(() => {
        this.el.status.hidden = true;
      }, 5000);
    }
  }

  fatal(message: string): void {
    this.toast(message, true);
    this.setLoading(true, 'No disponible');
  }

  /* ---------- piezas internas ---------- */

  private buildTimeline(): void {
    this.el.timeline.querySelectorAll('.seg').forEach((n) => n.remove());
    STAGES.forEach((s, i) => {
      const width = s - (i > 0 ? STAGES[i - 1] : 0);
      const seg = h('div', 'seg is-locked', `${s}s`);
      seg.style.setProperty('--w', String(width));
      this.el.timeline.insertBefore(seg, this.el.fill);
      this.segments.push(seg);
    });
    this.el.timeline.setAttribute(
      'aria-label',
      `Línea de tiempo: ${TOTAL_SECONDS} segundos en ${MAX_GUESSES} tramos`,
    );
  }

  private renderRows(game: Game): void {
    this.el.guesses.replaceChildren();
    for (let i = 0; i < MAX_GUESSES; i++) {
      const g: Guess | undefined = game.guesses[i];
      const active = !game.over && i === game.guesses.length;
      const li = h('li', active ? 'row is-active' : 'row');
      if (g) li.dataset.kind = g.kind;
      const main = h('span', 'main');
      let mark = '';
      if (g) {
        if (g.kind === 'skip') {
          main.append(h('span', 'skipped', 'Saltada'));
          mark = '→';
        } else {
          main.append(h('span', 't', g.title ?? ''), h('span', 'by', g.artist ?? ''));
          mark = g.kind === 'right' ? '✓' : g.kind === 'close' ? '≈' : '✕';
        }
      } else if (active) {
        main.append(h('span', 'ph', `Intento ${i + 1} de ${MAX_GUESSES}`));
      }
      li.append(h('span', 'secs', `${STAGES[i]}s`), main, h('span', 'mark', mark));
      this.el.guesses.appendChild(li);
    }
  }

  private renderOptions(): void {
    const used = this.game?.usedIds ?? new Set<string>();
    this.options = search(this.el.q.value, used);
    if (this.selected >= this.options.length) this.selected = 0;
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

  private clearSearch(): void {
    this.el.q.value = '';
    this.selected = 0;
    this.renderOptions();
  }

  private onKey(e: KeyboardEvent): void {
    const n = this.options.length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.selected = (this.selected + 1) % n;
      this.renderOptions();
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.selected = (this.selected - 1 + n) % n;
      this.renderOptions();
    } else if (e.key === 'Enter' && this.options[this.selected]) {
      e.preventDefault();
      this.handlers.onPick(this.options[this.selected]);
    } else if (e.key === 'Escape') {
      this.clearSearch();
    }
  }
}
