import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// MapLibre GL v6 construye la URL del worker en runtime como archivo hermano
// del bundle (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`), un patrón
// que Vite no detecta estáticamente. Copiamos el worker a dist/assets para que
// la URL calculada resuelva (sin él, el mapa no renderiza nada).
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const origen = join(raiz, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs');
const destino = join(raiz, 'dist', 'assets', 'maplibre-gl-worker.mjs');

if (!existsSync(origen)) {
  console.error(`No se encontró ${origen}`);
  process.exit(1);
}
copyFileSync(origen, destino);
console.log(`Worker de MapLibre copiado → ${destino}`);
