/* Empaqueta el proyecto en un único dist/deriva.html (sin dependencias).
 * Útil para compartir el juego como un solo archivo o subirlo a itch.io.
 *
 *   node tools/bundle.mjs
 *
 * Funciona porque los módulos solo usan `import { a, b } from './x.js'`
 * y `export` delante de declaraciones con nombres únicos en todo el proyecto. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT = /^import\s+\{[^}]*\}\s+from\s+'([^']+)';\s*$/gm;
const seen = new Set(), ordered = [];

function visit(file) {                       // orden topológico: dependencias primero
  if (seen.has(file)) return;
  seen.add(file);
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(IMPORT)) visit(resolve(dirname(file), m[1]));
  ordered.push({ file, code });
}
visit(join(root, 'src/main.js'));

const js = ordered.map(({ file, code }) => {
  const body = code.replace(IMPORT, '').replace(/^export\s+/gm, '').trim();
  if (/^\s*(import|export)\b/m.test(body)) throw new Error('Sintaxis de módulo no soportada en ' + file);
  return `/* ---- ${file.slice(root.length + 1)} ---- */\n${body}`;
}).join('\n\n');

// Los mp3 viajan en base64 para que el HTML siga siendo un único archivo.
const songs = readFileSync(join(root, 'src/data/songs.js'), 'utf8');
const assets = {};
for (const m of songs.matchAll(/(\w+):\s*'(assets\/[^']+)'/g)) {
  if (existsSync(join(root, m[2]))) assets[m[1]] = readFileSync(join(root, m[2])).toString('base64');   // no están en el repo público
}
const assetScript = `<script>window.DERIVA_ASSETS = ${JSON.stringify(assets)};</script>\n`;

const css = readFileSync(join(root, 'css/style.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${css}</style>`)
  .replace('<script type="module" src="src/main.js"></script>', () => `${assetScript}<script>\n'use strict';\n(() => {\n${js}\n})();\n</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/deriva.html'), html);
console.log(`dist/deriva.html · ${ordered.length} módulos · ${(html.length / 1024).toFixed(0)} kB`);
