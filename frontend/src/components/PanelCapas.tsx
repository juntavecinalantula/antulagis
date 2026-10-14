import { porcentaje, type CapasVisibles, type Conteos } from '../lib/datos';
import type { BaseId } from '../lib/baseMap';

type Props = {
  visibles: CapasVisibles;
  onVisibles: (v: CapasVisibles) => void;
  base: BaseId;
  onBase: (b: BaseId) => void;
  conteos: Conteos | null;
};

/** Capas que se muestran por separado en el panel (calles, por pavimento). */
const CAPAS: { id: keyof CapasVisibles; nombre: string }[] = [
  { id: 'manzanas', nombre: 'Manzanas' },
  { id: 'callesAsfalto', nombre: 'Calles asfaltadas' },
  { id: 'callesRipio', nombre: 'Calles de ripio' },
  { id: 'cauces', nombre: 'Canal de desagüe' },
  { id: 'entradas', nombre: 'Entradas al barrio' },
  { id: 'luminaria', nombre: 'Luminaria pública' },
  { id: 'informacion', nombre: 'Información' },
];

/** Capas de calles cuyo contador incluye el porcentaje sobre el total. */
const CAPAS_CON_PORCENTAJE: (keyof CapasVisibles)[] = ['callesAsfalto', 'callesRipio'];

const BTN_BASE =
  'rounded-md px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';
const BTN_ACTIVO = 'bg-blue-600 text-white';
const BTN_INACTIVO = 'bg-slate-100 text-slate-700 hover:bg-slate-200';

// Panel de contenido: se integra en el <aside> de App (sin posicionamiento
// absoluto propio ni botón hamburguesa, que chocaban con el <nav> de pestañas).
export default function PanelCapas({
  visibles,
  onVisibles,
  base,
  onBase,
  conteos,
}: Props) {
  const alternar = (capa: keyof CapasVisibles, checked: boolean) =>
    onVisibles({ ...visibles, [capa]: checked });

  return (
    <div className="p-4 bg-white shadow rounded mb-4">
      <h3 className="text-md font-bold mb-3 text-slate-800">Capas del mapa</h3>
      <ul className="space-y-1.5 text-sm">
        {CAPAS.map(({ id, nombre }) => {
          // El porcentaje se muestra únicamente en las dos filas de calles
          const pct =
            conteos && CAPAS_CON_PORCENTAJE.includes(id)
              ? `${porcentaje(conteos[id], conteos.calles)}%`
              : null;
          return (
            <li key={id} className="flex items-center gap-2">
              <input
                id={`chk-${id}`}
                type="checkbox"
                checked={visibles[id]}
                onChange={(e) => alternar(id, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-blue-600"
              />
              <label htmlFor={`chk-${id}`} className="flex-1 cursor-pointer text-slate-700">
                {nombre}
              </label>
              <span className="whitespace-nowrap tabular-nums text-xs text-slate-400">
                {pct ?? (conteos ? conteos[id] : '—')}
              </span>
            </li>
          );
        })}
      </ul>

      <hr className="my-3 border-slate-200" />

      <h3 className="text-md font-bold mb-2 text-slate-800">Leyenda</h3>
      <ul className="space-y-1.5 text-xs text-slate-700">
        <li className="flex items-center gap-2">
          <span className="inline-block h-1 w-5 rounded bg-[#eb2581]" />
          Calles asfaltadas
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-1 w-5 rounded bg-[#2563eb]" />
          Ripio con cuneta
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-4 rounded-sm border border-blue-700 bg-blue-500/30" />
          Manzanas
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block w-5 border-t-2 border-dashed border-sky-600" />
          Canal de desagüe
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-1 w-5 rounded bg-[#16a34a]" />
          Entradas al barrio
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-1 ring-amber-800" />
          Luminaria pública
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500 ring-1 ring-sky-800" />
          Información
        </li>
      </ul>

      <hr className="my-3 border-slate-200" />

      <h3 className="text-md font-bold mb-2 text-slate-800">Mapa base</h3>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onBase('osm')}
          className={`${BTN_BASE} ${base === 'osm' ? BTN_ACTIVO : BTN_INACTIVO}`}
        >
          Callejero
        </button>
        <button
          type="button"
          onClick={() => onBase('satelite')}
          className={`${BTN_BASE} ${base === 'satelite' ? BTN_ACTIVO : BTN_INACTIVO}`}
        >
          Satélite
        </button>
      </div>
    </div>
  );
}
