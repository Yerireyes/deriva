# DERIVA — sonar

Navegas a ciegas en el abismo. El sonar revela lo que hay cerca, por un instante.

Juego HTML5 en JavaScript puro (módulos ES, sin dependencias ni paso de compilación).
Todo el arte es pixel art generado por código y la música se sintetiza con Web Audio.
Los únicos archivos externos son los dos mp3 de `assets/audio/` (la canción del jefe en difícil).
Esa canción tiene copyright, así que **no está en el repositorio** (`.gitignore`). Sin ella, el juego
usa la pista sintetizada y Opciones solo ofrece «Sintetizada». Para oír la original en local, copia
`boss_dificil.mp3` y `boss_dificil_retro.mp3` en `assets/audio/`.

**Jugar online:** https://yerireyes.github.io/deriva/

## Ejecutar en local

Los módulos ES no cargan desde `file://`, así que hace falta un servidor estático cualquiera:

```bash
python3 -m http.server 8080      # y abre http://localhost:8080
# o bien
npm run dev                      # usa `npx serve`
```

También sirve la extensión Live Server de VS Code.

## Publicar

No hay build: se publica la raíz del repo tal cual (`index.html`, `css/`, `src/`, `assets/`).

- **GitHub Pages** (el despliegue actual): Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
  Cada push a `main` se publica solo en 1–2 minutos.
- **Cloudflare Pages, Netlify o Vercel**: conectan con repos privados; sin comando de build
  y con la raíz como directorio de salida.

`npm run bundle` genera `dist/deriva.html`, el juego entero en un solo archivo.

## Estructura

```
index.html            marcado del marco, HUD y pantallas
css/style.css         estilos (temas por nivel y por dificultad con variables CSS)
assets/audio/         canción del jefe en difícil: original y versión retro
src/
  main.js             punto de entrada
  core/               constantes y utilidades
  data/               TODO el contenido ajustable: balance, niveles, naves,
                      pinturas, mejoras, ultimates, power-ups y pistas de música
  art/                Sprite, sprites dibujados a mano y generadores procedurales
  services/           guardado, estadísticas derivadas, audio, música, entrada
  entities/           jugador, peligros, recogibles y efectos
  boss/               Kraken, sus ataques, proyectiles y el guion de difícil (script.js)
  game/               Game (estados + bucle a 60 Hz), Run (una inmersión), Spawner
  render/             Renderer (búfer a media resolución → aspecto pixel art)
  ui/                 HUD, tienda y pantallas
tools/bundle.mjs      empaquetador a un solo HTML
```

## Cómo añadir contenido

| Quiero…                  | Toco…                                                                 |
|--------------------------|------------------------------------------------------------------------|
| un nivel                 | una entrada en `data/levels.js` (+ su tema `body.level-N` en el CSS)   |
| ajustar dificultad/economía | `data/balance.js` y los campos `speed`/`spawn` de cada nivel        |
| una nave o pintura       | `data/ships.js` (+ filas `ship_<id>` en `art/sprites.js`)              |
| una mejora               | `data/upgrades.js` y su efecto en `services/Stats.js`                  |
| una ultimate             | `data/ultimates.js` (cada una trae su `activate(run)`)                 |
| un power-up              | `data/powerups.js`, su sprite y `Run.applyPowerup`                     |
| un peligro               | una clase que extienda `Hazard` (`hits`, `draw`, `onHit`) y su aparición en `game/Spawner.js` |
| un ataque del jefe       | una clase con `update/draw/hits/done` en `boss/attacks.js` y un método en `Kraken` |
| un patrón de la fase 2   | un método en `Kraken` que devuelva su duración + su nombre en `nextFrenzyPattern` |
| una pista de música      | una entrada en `data/tracks.js` (notas escritas como texto)            |
| ajustar la dificultad difícil | `data/difficulty.js` (multiplicadores de niveles y del jefe)      |
| cambiar la persecución de difícil | `boss/script.js`: lista de `[tiempo, acción]` en negras a 156 BPM |
| otra canción para el jefe | sustituir los mp3 y ajustar `data/songs.js`, `SONG_BPM` y `Kraken.SONG_START` |

## Dificultades

- **Fácil** es el juego base. **Difícil** se desbloquea al superar El Kraken en fácil y se activa
  desde el menú principal (el menú pasa a rojo). Cada dificultad guarda su propio progreso y récord.
- En difícil los niveles 1–3 van un 20 % más rápido, con obstáculos más densos, columnas de rocas
  más frecuentes y estrechas, minas que oscilan, rapes que corrigen el rumbo y peligros adelantados
  un nivel. Las monedas y los bonos valen ×1,5.

## Guion del Kraken

`Kraken.mode` recorre: `fight` (barra de vida) → `falling` (falsa victoria) → `calm`
(botín y silencio) → `rising` → `frenzy` (supervivencia, sin barra de vida) → `fleeing` (salida).

- **Fácil:** la fase 2 dura 30 s con patrones al azar y, si la nave cae, se puede reintentar desde ahí.
- **Difícil:** todo va más rápido (`scroll` en `data/difficulty.js`) y las dos fases siguen `boss/script.js`.
  - Fase 1: 8 de vida y un combo fijo por cada punto (`HARD_COMBOS`, tiempos en frames). Cada combo
    acaba dejando el nódulo expuesto; si no se daña, el mismo combo se repite. Está pensado para aprenderse.
  - Fase 2: guion fijo de unos 60 s (`HARD_SCRIPT`, tiempos en negras) sincronizado con la canción,
    sin cuenta atrás en pantalla. Si la nave cae hay que repetir el combate entero.

### La canción (solo fase 2 en difícil)

- Empieza en el segundo 10 del archivo, 10 s antes de que el Kraken reaparezca; reaparece en el
  segundo 20 (el drop). Al llegar al final vuelve al segundo 32 en bucle.
- Los mp3 entran casi en silencio y suben hasta el volumen completo justo en el drop
  (`SONG_FADE` en `data/songs.js`; el volumen general del mp3 es `Song.GAIN`).
- En Opciones → «Música del jefe (difícil)» se elige entre `Original` (el mp3 tal cual),
  `Retro 8 bits` (el mismo mp3 pasado por un filtro de 5 bits) y `Sintetizada` (pista propia del juego).
- La versión retro se generó con:

  ```bash
  ffmpeg -i assets/audio/boss_dificil.mp3 -af "highpass=f=70,acrusher=level_in=0.8:level_out=1:bits=5:mode=log:aa=0.6:samples=5:mix=1,lowpass=f=5200,alimiter=limit=0.9" -ac 1 -b:a 112k assets/audio/boss_dificil_retro.mp3
  ```

  Subir `bits` y bajar `samples` la acerca al original; lo contrario la hace más áspera.
- Si un mp3 no carga, el juego usa la pista sintetizada sin romperse.

## Guardado

`SaveManager` guarda en `localStorage` con versión (`deriva:save:v2`) y migra el formato antiguo.
Para borrar el progreso: `localStorage.removeItem('deriva:save:v2')` en la consola.
En la consola, `DERIVA` expone la instancia del juego (por ejemplo `DERIVA.save.data.coins = 999`).
