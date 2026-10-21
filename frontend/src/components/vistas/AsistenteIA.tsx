import { Bot, Send } from 'lucide-react';

export default function AsistenteIA() {
  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-500">
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Bot className="w-5 h-5" /></div>
          <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-sm text-slate-700 max-w-md">
            ¡Hola! Soy el Asistente Inteligente de Gestión Territorial de Antula. ¿En qué puedo ayudarte hoy?
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-slate-200">
        <div className="flex gap-2">
          <input type="text" placeholder="Escribe tu consulta..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          <button className="bg-indigo-600 text-white p-3 rounded-xl"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
