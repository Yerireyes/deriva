/* Punto de entrada: construye los sprites y arranca el juego. */
import { Art } from './art/Art.js';
import { Game } from './game/Game.js';

Art.build();
const game = new Game();
window.DERIVA = game;      // accesible desde la consola para depurar
game.start();
