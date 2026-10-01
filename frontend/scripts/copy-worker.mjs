import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// MapLibre GL v6 construye la URL del worker en runtime como archivo hermano
// del bundle (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`), un patrón
// que Vite no detecta estáticamente. Copiamos el worker (y sus imports locales,
// ej. maplibre-gl-shared.mjs) a dist/assets para que las URLs calculadas resuelvan
// (sin ellos, el mapa no renderiza nada).
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const distPkg = join(raiz, 'node_modules', 'maplibre-gl', 'dist');
const destDir = join(raiz, 'dist', 'assets');

const pendientes = ['maplibre-gl-worker.mjs'];
const copiados = new Set();

while (pendientes.length > 0) {
  const nombre = pendientes.pop();
  if (copiados.has(nombre)) continue;
  const origen = join(distPkg, nombre);
  if (!existsSync(origen)) {
    console.error(`No se encontró ${origen}`);
    process.exit(1);
  }
  copyFileSync(origen, join(destDir, nombre));
  copiados.add(nombre);
  // Resolver imports locales (`./algo.mjs`) para copiar también sus dependencias.
  const contenido = readFileSync(origen, 'utf8');
  for (const m of contenido.matchAll(/from\s*["']\.\/([^"']+\.mjs)["']/g)) {
    if (!copiados.has(m[1])) pendientes.push(m[1]);
  }
}

console.log(`Worker de MapLibre copiado → ${[...copiados].join(', ')}`);

