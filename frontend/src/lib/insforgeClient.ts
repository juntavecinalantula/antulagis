import { createClient } from '@insforge/sdk';

// Cliente de solo lectura para el navegador.
// Usa la ANON_KEY (pública, protegida por RLS) — nunca la API key de admin (ik_...).
export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});

// Comprobación temprana para mostrar un error claro en el mapa
// en lugar de un fallo blanco de red.
export const faltaConfig =
  !import.meta.env.VITE_INSFORGE_URL || !import.meta.env.VITE_INSFORGE_ANON_KEY;
