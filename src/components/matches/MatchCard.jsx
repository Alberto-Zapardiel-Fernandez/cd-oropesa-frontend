export default function MatchCard({ match, onDelete }) {
  const handleDeleteClick = () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el partido ${match.homeTeam} vs ${match.awayTeam}?`)) {
      onDelete(match.id)
    }
  }

  return (
    <div className='relative bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-red-500/40 transition flex flex-col justify-between space-y-4 group'>
      {/* Botón de borrado rápido (Visible al pasar el cursor o siempre en móvil) */}
      <button
        onClick={handleDeleteClick}
        title='Eliminar partido'
        className='absolute top-4 right-4 text-slate-500 hover:text-red-400 bg-slate-950/60 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 p-1.5 rounded-xl transition text-xs'
      >
        🗑️
      </button>

      {/* Cabecera de la tarjeta: Categoría y Horario */}
      <div className='flex justify-between items-center pr-8'>
        <span className='px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-lg uppercase tracking-wider'>
          {match.category}
        </span>
        <span className='text-xs text-slate-400 font-medium'>
          📅 {match.date} — ⏰ {match.time}
        </span>
      </div>

      {/* Enfrentamiento de los equipos */}
      <div className='flex items-center justify-between py-2 text-center'>
        <div className='flex-1 font-bold text-white text-sm sm:text-base truncate px-2'>{match.homeTeam}</div>
        <div className='px-3 py-1 bg-slate-950 rounded-xl text-xs font-black text-slate-500 border border-slate-800'>VS</div>
        <div className='flex-1 font-bold text-white text-sm sm:text-base truncate px-2'>{match.awayTeam}</div>
      </div>

      {/* Campo / Ubicación */}
      <div className='pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400'>
        <span className='truncate'>📍 {match.location}</span>
        <span className='text-blue-400 font-semibold'>{match.modalidad || 'Liga Regular'}</span>
      </div>
    </div>
  )
}
