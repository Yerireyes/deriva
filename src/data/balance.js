/* Números de equilibrio del juego. Nada de lógica: solo valores. */

export const BALANCE = {
  integrity: 3,
  metersPerPx: 0.09,
  player: { x: 90, accel: 0.55, maxSpeed: 5.6, friction: 0.9, hitInvuln: 80, shieldInvuln: 50 },
  ping: { cooldown: 60, expand: 5.4, fade: 0.011, reveal: 90 },
  coins: { spawnMin: 80, spawnRange: 70, bigChance: 0.18, value: 1, bigValue: 5, formationChance: 0.4 },
  powerups: {
    spawnMin: 520, spawnRange: 260,
    shield: { duration: 540 },
    radar:  { duration: 480, radius: 190 },
    slow:   { duration: 360, factor: 0.6 },
  },
  upgradeCosts: [30, 60, 110],
  legacyUpgradeCosts: [40, 90, 160],   // precios de la versión anterior (para reembolsos)
};
