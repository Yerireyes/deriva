/* Mejoras: 3 niveles cada una, mismo coste escalonado. */
export const UPGRADES = {
  sonar:         { name: 'Sonar',              step: 0.10, desc: l => `−${l * 10}% de recarga del sonar` },
  maneuver:      { name: 'Maniobrabilidad',    step: 0.06, desc: l => `+${l * 6}% de respuesta` },
  magnet:        { name: 'Imán',               step: 28,   desc: l => l ? `Atrae monedas y power-ups a ${l * 28} px` : 'Atrae monedas y power-ups cercanos' },
  powerDuration: { name: 'Power-ups',          step: 0.12, desc: l => `+${l * 12}% de duración` },
  ultCooldown:   { name: 'Recarga de ultimate', step: 0.08, desc: l => `−${l * 8}% de recarga` },
  repair:        { name: 'Kit de reparación',  step: 0.06, desc: l => `${l * 6}% de power-ups reparan el casco` },
};

export const UPGRADE_MAX = 3;
