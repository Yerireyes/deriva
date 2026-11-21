/* Dificultades. `level` modifica los niveles normales; `boss` ajusta al Kraken.
 * Fácil es el juego base: todos sus multiplicadores son neutros. */
import { BALANCE } from './balance.js';

export const DIFFICULTIES = {
  easy: {
    name: 'Fácil', coinMult: 1,
    level: {},
    boss: { hp: 6, enrageAt: 0.5, tele: 1, pace: 1, exposed: 130, punish: false, script: false, scroll: [2.2, 3.3] },
  },
  hard: {
    name: 'Difícil', coinMult: 1.5,
    grid: '58,18,24',                     // color de la rejilla del fondo
    unlockAfter: 4,                       // se desbloquea al superar este nivel en fácil
    level: {
      speed: 1.2,                         // × velocidad de avance
      spawn: 0.62,                        // × intervalo entre obstáculos (menos = más denso)
      target: 1.15,                       // × distancia de la meta
      wallChance: 2.4, wallGap: 104,      // más columnas de rocas y huecos más estrechos
      mineChance: 0.1,                    // + probabilidad de mina
      hazardPace: 0.65,                   // × intervalo de peces, leviatán y capas térmicas
      hitInvuln: 60,                      // menos frames de gracia tras un golpe
      mineDrift: true,                    // las minas oscilan
      fishHoming: true,                   // los rapes corrigen el rumbo hacia la nave
      extra: {                            // peligros que se adelantan un nivel
        1: { fish: { min: 240, range: 160 } },
        2: { thermal: { min: 520, range: 260 } },
      },
    },
    // scroll: velocidad de avance en [fase 1, persecución]. script: ambas fases siguen boss/script.js.
    boss: { hp: 8, enrageAt: 1, tele: 0.8, pace: 0.6, exposed: 85, punish: true, script: true, scroll: [3.4, 4.8], hitInvuln: 45 },
  },
};

/* Devuelve una copia del nivel con la dificultad aplicada. LEVELS nunca se muta. */
export function resolveLevel(base, diffId) {
  const D = DIFFICULTIES[diffId] || DIFFICULTIES.easy, m = D.level;
  const L = JSON.parse(JSON.stringify(base));
  L.difficulty = DIFFICULTIES[diffId] ? diffId : 'easy';
  L.coinMult = base.coinMult * D.coinMult;
  if (L.bonus) L.bonus = Math.round(base.bonus * D.coinMult);
  L.bossCfg = D.boss;
  if (D.grid) L.grid = D.grid;
  L.mods = {
    wallGap: m.wallGap || 124,
    hitInvuln: m.hitInvuln || BALANCE.player.hitInvuln,
    mineDrift: !!m.mineDrift, fishHoming: !!m.fishHoming,
  };
  if (m.speed) { L.speed.base *= m.speed; L.speed.cap *= m.speed; }
  if (L.spawn && m.spawn) { L.spawn.slow *= m.spawn; L.spawn.fast *= m.spawn; }
  if (L.target && m.target) L.target = Math.round(L.target * m.target / 10) * 10;
  if (L.wallChance && m.wallChance) L.wallChance *= m.wallChance;
  if (L.spawn && m.mineChance) L.mineChance += m.mineChance;
  if (m.extra && m.extra[L.id]) Object.assign(L.hazards, JSON.parse(JSON.stringify(m.extra[L.id])));
  if (m.hazardPace) Object.keys(L.hazards).forEach(k => { L.hazards[k].min *= m.hazardPace; L.hazards[k].range *= m.hazardPace; });
  return L;
}
