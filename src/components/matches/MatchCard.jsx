export default function MatchCard({ match, isAdmin, onDetails, onEdit, onDelete }) {
  const hasCompleteScore = match.homeScore != null && match.awayScore != null
  const isVenueKnown = match.matchLocation !== 'UNKNOWN'
  const firstTeam = isVenueKnown ? match.homeTeam : match.teamName
  const secondTeam = isVenueKnown ? match.awayTeam : match.opponentName
  const firstScore = match.homeScore ?? 0
  const secondScore = match.awayScore ?? 0
  const winner = !hasCompleteScore || !isVenueKnown
    ? null
    : firstScore === secondScore
      ? 'Empate'
      : `Ganador: ${firstScore > secondScore ? match.homeTeam : match.awayTeam}`
  const scoreStyle = score => {
    if (!hasCompleteScore || !isVenueKnown || firstScore === secondScore) {
      return 'border-slate-700 bg-slate-950 text-slate-300'
    }

    return score === Math.max(firstScore, secondScore)
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : 'border-red-500/40 bg-red-500/10 text-red-300'
  }

  const statusLabels = {
    SCHEDULED: 'Programado',
    COMPLETED: 'Finalizado',
    SUSPENDED: 'Suspendido',
    POSTPONED: 'Aplazado'
  }

  return (
    <article className='flex min-w-0 flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg transition hover:border-slate-700'>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <span className='rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-bold uppercase text-sky-300'>{match.category}</span>

        <div className='text-right text-xs leading-relaxed text-slate-400'>
          <div>{match.date}</div>
          <div>{match.time}</div>
        </div>
      </header>

      <div className='flex min-w-0 flex-col items-center gap-2 py-1 text-center'>
        <span className='break-words text-sm font-bold leading-relaxed text-white [overflow-wrap:anywhere]'>{firstTeam}</span>

        <div
          className='flex items-center justify-center gap-3'
          aria-label={
            hasCompleteScore
              ? `Resultado: ${firstScore} a ${secondScore}`
              : 'Marcador pendiente: cero a cero'
          }
          title={hasCompleteScore ? 'Resultado registrado' : 'Marcador pendiente de resultado'}
        >
          <span className={`min-w-10 rounded-lg border px-3 py-1.5 text-xl font-black tabular-nums ${scoreStyle(firstScore)}`}>
            {firstScore}
          </span>
          <span className='text-xs font-black text-slate-500'>VS</span>
          <span className={`min-w-10 rounded-lg border px-3 py-1.5 text-xl font-black tabular-nums ${scoreStyle(secondScore)}`}>
            {secondScore}
          </span>
        </div>

        <span className='break-words text-sm font-bold leading-relaxed text-white [overflow-wrap:anywhere]'>{secondTeam}</span>
        {!hasCompleteScore && (
          <p className='text-xs text-slate-500'>Marcador pendiente</p>
        )}
        {winner && (
          <p className={`mt-2 text-xs font-semibold ${winner === 'Empate' ? 'text-amber-300' : 'text-emerald-300'}`}>
            {winner}
          </p>
        )}
        {!isVenueKnown && hasCompleteScore && (
          <p className='text-xs font-semibold text-amber-300'>
            Los goles se muestran en orden local–visitante; la localía está pendiente.
          </p>
        )}
        {!isVenueKnown && <p className='text-xs text-amber-300'>Localía por confirmar; no se atribuye el marcador a ningún equipo.</p>}
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

        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={onDetails}
            className='rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700'
          >
            Ver detalles
          </button>
          {isAdmin && (
            <button
              type='button'
              onClick={onEdit}
              className='rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700'
            >
              Editar
            </button>
          )}
          {isAdmin && (
            <button
              type='button'
              onClick={onDelete}
              className='rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20'
            >
              Borrar
            </button>
          )}
        </div>
      </footer>
    </article>
  )
}
