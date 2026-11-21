/* Guion de la persecución en difícil. A diferencia de la fase 2 normal (patrones
 * al azar), aquí cada ataque está coreografiado sobre el compás de la música.
 *
 * Cada entrada es [compás-tiempo, acción]. Los tiempos van en negras desde el
 * momento en que el Kraken reaparece (segundo 20 de la canción, 156 BPM).
 * `k` es el Kraken: sus métodos (beam, tunnel, setPull…) son las piezas del guion. */
import { H } from '../core/constants.js';

export const SONG_BPM = 156;
export const BEAT = 3600 / SONG_BPM;          // frames por negra (≈ 23)
export const HARD_SCRIPT_BEATS = 157;         // duración total (≈ 60 s). No se muestra al jugador.

const TELE = Math.round(BEAT * 2);            // aviso de 2 tiempos: el rayo dispara a compás
const floor = k => k.beam(H - 30, TELE, 30);  // rayo a ras de suelo: hay que saltarlo
const ceil = k => k.beam(30, TELE, 30);
const aimed = k => k.beam(k.run.player.y, Math.round(BEAT * 1.5), 20);
const LANE = Math.round(BEAT * 1.5);
const shield = k => k.gift('shield');
const seq = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

/* ------------------------------------------------------------------ *
 *  FASE 1 (difícil): un combo por punto de vida. Tiempos en frames
 *  (60 = 1 s) desde que empieza el combo. Casi todo cae siempre en el
 *  mismo sitio, para que se pueda memorizar. Cada combo acaba con un
 *  golpe que deja el nódulo expuesto (strike con `weak` = true).
 * ------------------------------------------------------------------ */
const ROW = i => 40 + i * 72;                  // 6 filas de rayos que cubren toda la pantalla

export const HARD_COMBOS = [
  { name: 'TIJERA', steps: [
    [1, k => k.stab(110, 34)], [28, k => k.stab(330, 34)], [56, k => k.stab(220, 34)],
    [84, k => k.stab(110, 30)], [104, k => k.stab(330, 30)],
    [150, k => k.strike('top', 0.42, 44, true, 40)],
  ] },
  { name: 'PERSIANA', steps: [
    ...seq(6, i => [1 + i * 22, k => k.beam(ROW(i), 40, 34)]),
    ...seq(6, i => [150 + i * 18, k => k.beam(ROW(5 - i), 38, 34)]),
    [262, k => k.stab()],
    [296, k => k.strike('bottom', 0.42, 44, true, 38)],
  ] },
  { name: 'LLUVIA', steps: [
    [1, k => k.spit(5)], [46, k => k.spit(5)], [70, k => k.stab()], [92, k => k.spit(5)], [120, k => k.stab()],
    [150, k => { k.strike('top', 0.3, 64, true, 38); k.strike('bottom', 0.3, 64, false, 38); }],
    [200, k => k.spit(3)],
  ] },
  { name: 'RESACA', steps: [
    [1, k => k.setPull(1)],
    [16, floor], [62, floor], [86, k => k.stab(300, 30)], [108, floor], [150, k => k.spit(3)], [154, floor],
    [204, k => k.setPull(0)],
    [206, k => k.strike('top', 0.46, 40, true, 36)],
    [290, k => k.spit(3)],
  ] },
  { name: 'EMBESTIDA', steps: [
    [1, k => k.rushFixed([150, 230, 310, 235, 160, 235], 7.6)],
    [205, k => { k.beam(ROW(2), 36, 34); k.beam(ROW(3), 36, 34); }],      // tras el último muro, fuera del centro
    [262, k => k.stab()],
    [290, k => k.strike('bottom', 0.44, 40, true, 36)],
  ] },
  { name: 'JAULA', steps: [
    [1, k => k.pincer(170)],
    [66, k => k.beam(160, 34, 22)], [94, k => k.beam(280, 34, 22)], [122, k => k.beam(220, 34, 22)],
    [150, k => k.beam(160, 30, 22)], [172, k => k.beam(280, 30, 22)], [196, k => k.stab()],
    [286, k => k.strike('top', 0.46, 40, true, 34)],
  ] },
  { name: 'CARRILES', steps: [
    ...[2, 3, 2, 1, 0, 1, 2, 3].map((lane, i) => [1 + i * 40, k => k.lanes(lane, 40)]),
    [330, k => k.stab()],
    [360, k => { k.strike('bottom', 0.3, 60, true, 34); k.strike('top', 0.3, 60, false, 34); }],
    [402, k => k.spit(5)],
  ] },
  { name: 'ABISMO', steps: [
    [1, k => k.setPull(-1)],
    [14, ceil], [56, ceil], [78, k => k.spit(5)], [98, ceil],
    [142, k => k.setPull(0)],
    [144, k => k.rushFixed([120, 205, 290, 210, 125], 8)],
    [330, k => k.sweepN(3, 62, 32)],
    [520, k => k.strike('top', 0.48, 36, true, 32)],
    [560, k => k.spit(5)],
  ] },
];

HARD_COMBOS.forEach(c => c.steps.sort((a, b) => a[0] - b[0]));

/* ------------------------------------------------------------------ *
 *  FASE 2 (difícil): la persecución. Tiempos en negras desde el drop.
 * ------------------------------------------------------------------ */
export const HARD_SCRIPT = [
  /* 1 · Emboscada: sin calentamiento. La pinza se cierra desde el primer compás y, en la franja
   *     que queda, un rayo te busca a cada tiempo mientras llueve tinta y entran estocadas. */
  [0, k => k.pincer(200)],
  [1, k => k.spit(5)],
  ...seq(11, i => [2 + i, aimed]),
  [5, k => k.stab(220, 30)], [9.5, k => k.stab(220, 30)],

  /* 2 · Escalera hacia abajo y, más rápido, hacia arriba, con rayos que te buscan. */
  ...seq(6, i => [14 + i * 0.8, k => k.beam(ROW(i), TELE, 34)]),
  [15.5, aimed], [18, aimed],
  ...seq(6, i => [20.5 + i * 0.7, k => k.beam(ROW(5 - i), TELE, 34)]),
  [23, aimed],

  /* 3 · Túnel de costillas, ya estrecho y rápido. */
  [25, k => k.tunnel(15, 108, 168, 100, 7.8)],

  /* 4 · Aplastamiento: la corriente te sube contra el techo, el fondo se cierra y el techo arde. */
  [45, k => { k.setPull(-1); k.strike('bottom', 0.5, 190, false, 36); }],
  [46, k => k.spit(3)],
  [47, ceil], [48.5, aimed], [49.5, ceil], [51, aimed], [52, ceil], [53.5, aimed], [54.5, ceil],
  [57.5, k => k.setPull(0)],

  /* 5 · Barrido: media pantalla cada vez, alternando, entre tinta. */
  [58, k => k.sweepN(5, 62, 32)],
  [60, k => k.spit(3)], [65, k => k.spit(3)], [70, k => k.spit(3)],

  /* 6 · Falso respiro (corto)… y embestida. */
  [75, k => k.rest(true)], [75, shield],
  [78.5, k => { k.rest(false); k.rush(true, 8, 9); }],

  /* 7 · Tormenta: un rayo apuntado por tiempo, tinta y estocadas. */
  ...seq(10, i => [92 + i, aimed]),
  [92, k => k.spit(5)], [95, k => k.spit(5)], [98, k => k.spit(5)],
  [94.5, k => k.stab(undefined, 30)], [99, k => k.stab(undefined, 30)],

  /* 8 · Persiana doble: dos olas de rayos que se cruzan; luego rayos apuntados y la tijera. */
  ...seq(6, i => [104 + i * 0.9, k => { k.beam(ROW(i), TELE, 34); if (i !== 5 - i) k.beam(ROW(5 - i), TELE, 34); }]),
  [110, k => k.spit(5)],
  [111.5, aimed], [113, aimed], [114.5, aimed],
  [115, k => k.stab(110, 30)], [116, k => k.stab(330, 30)], [117, k => k.stab(220, 30)], [118, k => k.stab(110, 30)], [118.8, k => k.stab(330, 30)],

  /* 9 · Segundo túnel, más cerrado y más rápido. */
  [120, k => k.tunnel(14, 108, 164, 98, 8.2)],

  /* 10 · Final: todo arde menos un carril, y el carril se mueve cada tiempo y medio. */
  ...seq(10, i => [139 + i * 1.5, k => k.lanes(undefined, LANE + 12)]),
].sort((a, b) => a[0] - b[0]);
