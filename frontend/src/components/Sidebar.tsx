import {
  LayoutDashboard,
  Map as MapIcon,
  AlertCircle,
  Lightbulb,
  Compass,
  Bot,
  Settings,
  ShieldCheck
} from 'lucide-react';

type ViewMode = 'tablero' | 'mapa' | 'reclamos' | 'obras' | 'catastro' | 'asistente' | 'configuracion';

interface SidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  /** Reportes vecinales activos (se muestra como badge en el menú). */
  reclamosCount: number;
  /** Propuestas vecinales cargadas. */
  propuestasCount: number;
}

export const Sidebar = ({
  currentView,
  onNavigate,
  reclamosCount,
  propuestasCount,
}: SidebarProps) => {
  const navItems = [
    { id: 'tablero' as ViewMode, label: 'Tablero de Gestión', icon: LayoutDashboard, badge: null as string | null },
    { id: 'mapa' as ViewMode, label: 'Visor SIG Territorial', icon: MapIcon, badge: 'SIG' },
    {
      id: 'reclamos' as ViewMode,
      label: 'Reclamos Vecinales',
      icon: AlertCircle,
      badge: reclamosCount > 0 ? String(reclamosCount) : null,
    },
    {
      id: 'obras' as ViewMode,
      label: 'Obras y Propuestas',
      icon: Lightbulb,
      badge: propuestasCount > 0 ? String(propuestasCount) : null,
    },
    { id: 'catastro' as ViewMode, label: 'Catastro y Calles', icon: Compass, badge: null },
    { id: 'asistente' as ViewMode, label: 'Asistente IA Municipal', icon: Bot, badge: null },
    { id: 'configuracion' as ViewMode, label: 'Sistema', icon: Settings, badge: null },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 shadow-xl">
      <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">A</div>
        <div>
          <h1 className="text-sm font-black text-white">ANTULA</h1>
          <p className="text-[10px] text-slate-400">GESTIÓN MUNICIPAL</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                {item.label}
              </span>
              {item.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/15 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500"/>
            InsForge BaaS Online
        </div>
      </div>
    </aside>
  );
};
