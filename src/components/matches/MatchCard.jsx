export default function MatchCard({ match, isAdmin, onEdit, onDelete }) {
  const hasScore = match.homeScore != null || match.awayScore != null

  const statusLabels = {
    SCHEDULED: 'Programado',
    COMPLETED: 'Finalizado',
    SUSPENDED: 'Suspendido',
    POSTPONED: 'Aplazado'
  }

  return (
    <article className='flex min-w-0 flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg transition hover:border-slate-700'>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <span className='rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase text-red-400'>{match.category}</span>

        <div className='text-right text-xs leading-relaxed text-slate-400'>
          <div>{match.date}</div>
          <div>{match.time}</div>
        </div>
      </header>

      <div className='flex min-w-0 flex-col items-center gap-2 py-1 text-center'>
        <span className='rounded-md bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300'>Local</span>

        <div className='flex min-w-0 flex-wrap items-center justify-center gap-2'>
          <span className='break-words text-sm font-bold leading-relaxed text-white [overflow-wrap:anywhere]'>{match.homeTeam}</span>
          {hasScore && <span className='text-lg font-black tabular-nums text-white'>{match.homeScore ?? 0}</span>}
        </div>

        <span className='my-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-black text-slate-400'>VS</span>

        <span className='rounded-md bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300'>Visitante</span>

        <div className='flex min-w-0 flex-wrap items-center justify-center gap-2'>
          <span className='break-words text-sm font-bold leading-relaxed text-white [overflow-wrap:anywhere]'>{match.awayTeam}</span>
          {hasScore && <span className='text-lg font-black tabular-nums text-white'>{match.awayScore ?? 0}</span>}
        </div>
      </div>

      <div className='flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-slate-800 pt-4 text-xs'>
        <span className='min-w-0 flex-1 break-words leading-relaxed text-slate-400 [overflow-wrap:anywhere]'>
          <span aria-hidden='true'>📍 </span>
          {match.location}
        </span>
        <span className='shrink-0 font-semibold text-blue-400'>Jornada {match.matchday ?? '—'}</span>
      </div>

      <footer className='flex flex-wrap items-center justify-between gap-3'>
        <span className='rounded-full border border-slate-800 px-2.5 py-1 text-xs text-slate-400'>
          {statusLabels[match.status] || 'Estado pendiente'}
        </span>

        {isAdmin && (
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={onEdit}
              className='rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700'
            >
              Editar
            </button>
            <button
              type='button'
              onClick={onDelete}
              className='rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20'
            >
              Borrar
            </button>
          </div>
        )}
      </footer>
    </article>
  )
}
