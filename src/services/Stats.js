import { BALANCE } from '../data/balance.js';
import { SHIPS } from '../data/ships.js';
import { ULTIMATES } from '../data/ultimates.js';
import { UPGRADES } from '../data/upgrades.js';

/* Estadísticas derivadas de mejoras + nave + ultimate equipadas.
 * Se recalculan al empezar cada inmersión; nunca se muta BALANCE. */
export class Stats {
  static compute(save) {
    const d = save.data, lv = id => d.upgrades[id] || 0;
    const ship = SHIPS[d.equippedShip] || SHIPS.explorer;
    const ult = ULTIMATES[d.equippedUltimate] || ULTIMATES.vision;
    const man = (1 + lv('maneuver') * UPGRADES.maneuver.step) * ship.maneuver;
    const dur = 1 + lv('powerDuration') * UPGRADES.powerDuration.step;
    const P = BALANCE.powerups;
    return {
      shipId: d.equippedShip, paintId: d.equippedPaint, ultId: d.equippedUltimate, ult,
      maxIntegrity: Math.max(1, BALANCE.integrity + ship.hull),
      radius: ship.radius,
      accel: BALANCE.player.accel * man,
      maxSpeed: BALANCE.player.maxSpeed * man,
      pingCooldown: Math.round(BALANCE.ping.cooldown * ship.ping * (1 - lv('sonar') * UPGRADES.sonar.step)),
      magnet: lv('magnet') * UPGRADES.magnet.step + ship.magnet,
      powerDur: { shield: Math.round(P.shield.duration * dur), radar: Math.round(P.radar.duration * dur), slow: Math.round(P.slow.duration * dur) },
      healChance: lv('repair') * UPGRADES.repair.step,
      ultDuration: ult.duration,
      ultCooldown: Math.round(ult.cooldown * (1 - lv('ultCooldown') * UPGRADES.ultCooldown.step)),
    };
  }
}
