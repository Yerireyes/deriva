/* Naves: cada una tiene sprite propio (ver ART_ROWS.ship_*). */
export const SHIPS = {
  explorer: { name: 'Explorador', cost: 0, desc: 'Equilibrada. Casco 3.',
    hull: 0, maneuver: 1, ping: 1, magnet: 0, radius: 8 },
  tank: { name: 'Acorazado', cost: 180, desc: 'Casco 4. Más pesada y más grande.',
    hull: 1, maneuver: 0.88, ping: 1, magnet: 0, radius: 10 },
  scout: { name: 'Rastreador', cost: 220, desc: 'Casco 2. Sonar 25% más rápido, ágil y con imán.',
    hull: -1, maneuver: 1.12, ping: 0.75, magnet: 30, radius: 7 },
};

/* Pinturas (skins): solo cambian la paleta del sprite de la nave. */
export const PAINTS = {
  abisal:   { name: 'Abisal',   cost: 0,  colors: { o: '#0e3d35', A: '#4fd9b4', S: '#2a8f78', H: '#a6f5df', W: '#eafff5', P: '#e8a33d' } },
  ambar:    { name: 'Ámbar',    cost: 40, colors: { o: '#4a2c08', A: '#e8a33d', S: '#a8691c', H: '#ffd08a', W: '#fff3d0', P: '#4fd9b4' } },
  coral:    { name: 'Coral',    cost: 60, colors: { o: '#4d1026', A: '#ff6f91', S: '#b53a5e', H: '#ffb3c4', W: '#ffe3ea', P: '#ffd24a' } },
  espectro: { name: 'Espectro', cost: 80, colors: { o: '#2a2f5c', A: '#dfe6ff', S: '#8f9bd6', H: '#ffffff', W: '#7dfcff', P: '#b08cff' } },
};
