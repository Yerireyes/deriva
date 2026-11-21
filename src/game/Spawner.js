import { W, H } from '../core/constants.js';
import { rand, randInt, pick, clamp } from '../core/utils.js';
import { BALANCE } from '../data/balance.js';
import { ThermalZone } from '../entities/ThermalZone.js';
import { Rock, Mine, Fish, Leviathan } from '../entities/hazards.js';
import { Coin, Powerup } from '../entities/pickups.js';

/* Decide qué aparece y cuándo, según la configuración del nivel. */
export class Spawner {
  constructor(run) {
    this.run = run;
    this.t = { obstacle: 50, coin: 90, powerup: 300, fish: 200, leviathan: 420, thermal: 260 };
  }
  update() {
    const run = this.run, L = run.level, open = !run.inRunway, t = this.t;
    if (L.spawn && open && --t.obstacle <= 0) {
      const k = L.speed.cap > L.speed.base ? (run.speed - L.speed.base) / (L.speed.cap - L.speed.base) : 0;
      t.obstacle = (L.spawn.slow + (L.spawn.fast - L.spawn.slow) * k) * rand(0.8, 1.2);
      if (Math.random() < L.wallChance) { this.wall(); t.obstacle += 45; }
      else this.obstacle();
    }
    if (--t.coin <= 0) {
      t.coin = BALANCE.coins.spawnMin + Math.random() * BALANCE.coins.spawnRange;
      if (Math.random() < BALANCE.coins.formationChance) { this.coinFormation(); t.coin += 50; }
      else run.pickups.push(new Coin(W + 40, this.clearY(46), Math.random() < BALANCE.coins.bigChance));
    }
    if (--t.powerup <= 0) {
      t.powerup = BALANCE.powerups.spawnMin + Math.random() * BALANCE.powerups.spawnRange;
      const type = Math.random() < run.stats.healChance ? 'heal' : pick(['shield', 'radar', 'slow']);
      run.pickups.push(new Powerup(W + 40, this.clearY(60), type));
    }
    const hz = L.hazards;
    const due = name => hz[name] && open && run.distance >= (hz[name].from || 0) && --t[name] <= 0;
    const rearm = name => { t[name] = hz[name].min + Math.random() * hz[name].range; };
    if (due('fish')) { run.hazards.push(new Fish(W + 40, this.clearY(50))); rearm('fish'); }
    if (due('leviathan') && !run.hazards.some(h => h instanceof Leviathan)) {
      run.hazards.push(new Leviathan(W + 70, H / 2 + rand(-80, 80))); rearm('leviathan');
    }
    if (due('thermal')) {
      run.zones.push(new ThermalZone(W + 190, rand(90, H - 90), rand(230, 360), rand(80, 120))); rearm('thermal');
    }
  }
  /* Busca una altura libre en la franja de aparición. */
  clearY(minGap) {
    const run = this.run, busy = run.hazards.concat(run.pickups).filter(e => e.x > W - 60);
    for (let i = 0; i < 8; i++) {
      const y = rand(30, H - 30);
      if (!busy.some(e => Math.abs(e.y - y) < minGap)) return y;
    }
    return rand(30, H - 30);
  }
  obstacle() {
    const y = this.clearY(60), L = this.run.level;
    this.run.hazards.push(Math.random() < L.mineChance ? new Mine(W + 40, y) : new Rock(W + 40, y));
  }
  /* Columna de rocas con un único hueco: obliga a usar el sonar. */
  wall() {
    const gapY = rand(90, H - 90), gap = this.run.level.mods.wallGap;
    for (let y = 26; y < H; y += 50) {
      if (Math.abs(y - gapY) < gap / 2 + 22) continue;
      this.run.hazards.push(new Rock(W + 40 + rand(-8, 8), y + rand(-5, 5)));
    }
  }
  coinFormation() {
    const n = randInt(4, 6), y0 = rand(60, H - 60), kind = pick(['line', 'wave', 'slope']), dir = Math.random() < 0.5 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      let y = y0;
      if (kind === 'wave') y += Math.sin(i * 0.9) * 24;
      if (kind === 'slope') y += (i - (n - 1) / 2) * 13 * dir;
      this.run.pickups.push(new Coin(W + 40 + i * 28, clamp(y, 24, H - 24), i === n - 1 && Math.random() < 0.3));
    }
  }
}
