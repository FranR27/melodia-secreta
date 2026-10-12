/** Segundos acumulados que se desbloquean en cada intento: 1, 2, 4, 7, 11 y 16. */
export const STAGES = [1, 2, 4, 7, 11, 16] as const;

export const MAX_GUESSES = STAGES.length;

export const TOTAL_SECONDS = STAGES[STAGES.length - 1];

export const STORAGE_KEY = 'melodia-secreta:v2';
