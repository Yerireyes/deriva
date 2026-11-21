/* Versiones de la canción del jefe en difícil (se elige en Opciones).
 * `synth` no tiene archivo: usa las pistas hardBuild / hardFrenzy de tracks.js. */
export const SONG_FILES = { original: 'assets/audio/boss_dificil.mp3', retro: 'assets/audio/boss_dificil_retro.mp3' };
export const SONG_NAMES = { original: 'Original', retro: 'Retro 8 bits', synth: 'Sintetizada' };
export const SONG_FADE = { from: 10, to: 20, floor: 0.02 };   // entra casi en silencio y llega al máximo en el drop
export const SONG_LOOP_START = 32;      // segundo desde el que se repite al llegar al final
