/* Niveles. `hazards` activa peligros extra; `from` (m) retrasa su aparición. */
export const LEVELS = [
  { id: 1, name: 'Fosa abisal', theme: 'level-1', grid: '23,48,63',
    blurb: 'rocas y minas',
    target: 900, runway: 90, bonus: 40, coinMult: 1,
    speed: { base: 1.9, cap: 2.7, ramp: 0.00025 },
    spawn: { slow: 58, fast: 30 }, mineChance: 0.22, wallChance: 0.05, hazards: {} },

  { id: 2, name: 'Corriente profunda', theme: 'level-2', grid: '16,36,48', unlockAfter: 1,
    blurb: 'fauna hostil',
    target: 1100, runway: 90, bonus: 60, coinMult: 1.3,
    speed: { base: 2.1, cap: 3.0, ramp: 0.0003 },
    spawn: { slow: 52, fast: 26 }, mineChance: 0.28, wallChance: 0.09,
    hazards: { fish: { min: 170, range: 130 } } },

  { id: 3, name: 'El Acecho', theme: 'level-3', grid: '26,32,60', unlockAfter: 2,
    blurb: 'leviatán · capas térmicas',
    target: 1300, runway: 160, bonus: 80, coinMult: 1.6, bossIntro: true,
    speed: { base: 2.3, cap: 3.2, ramp: 0.0003 },
    spawn: { slow: 48, fast: 24 }, mineChance: 0.3, wallChance: 0.11,
    hazards: { fish: { min: 150, range: 120 }, leviathan: { min: 640, range: 320 }, thermal: { min: 480, range: 240 } } },

  { id: 4, name: 'El Kraken', theme: 'level-4', grid: '48,20,38', unlockAfter: 3,
    blurb: 'jefe final',
    boss: 'kraken', bonus: 150, coinMult: 2,
    speed: { base: 2.2, cap: 2.2, ramp: 0 }, hazards: {} },

  { id: 5, name: 'Abismo sin fin', theme: 'level-5', grid: '20,40,52', unlockAfter: 2,
    blurb: 'modo infinito · bate tu récord',
    endless: true, coinMult: 1.5,
    speed: { base: 2.0, cap: 4.0, ramp: 0.00035 },
    spawn: { slow: 56, fast: 22 }, mineChance: 0.3, wallChance: 0.1,
    hazards: { fish: { min: 160, range: 130, from: 250 }, thermal: { min: 500, range: 260, from: 600 },
               leviathan: { min: 640, range: 320, from: 900 } } },
];
