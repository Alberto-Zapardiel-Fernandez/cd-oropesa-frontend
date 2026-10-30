// Centralización de estilos visuales para toda la aplicación
export const CARD_STYLES = {
  // Tarjetas de registros guardados (Categorías, Equipos, etc.)
  item: 'bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition rounded-2xl',

  // Paneles contenedores principales de los formularios o secciones
  panel: 'bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6',

  // Entradas de texto e inputs para mantener la diferenciación clara
  input: 'bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition',

  // Botón de borrado/acciones rápidas en tarjetas
  actionDelete: 'text-slate-500 hover:text-red-400 p-1.5 rounded-xl hover:bg-red-500/10 transition text-xs cursor-pointer'
}
