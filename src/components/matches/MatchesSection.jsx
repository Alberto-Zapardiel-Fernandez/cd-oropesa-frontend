import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchApi } from '../../services/api'
import AdminMatchForm from '../admin/AdminMatchForm'
import MatchCard from './MatchCard'
import { getMatchLocation } from './matchLocation'
import { getNextWeekendRange, getPreviousWeekendRange } from './weekendRanges'

function formatDate(date) {
  if (!date) return 'Fecha pendiente'

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${date}T00:00:00`))
}

function formatStatus(status) {
  const statusLabels = {
    SCHEDULED: 'Programado',
    COMPLETED: 'Finalizado',
    SUSPENDED: 'Suspendido',
    POSTPONED: 'Aplazado'
  }
  return statusLabels[status] || 'Pendiente de confirmar'
}

function enrichMatch(match, teams, opponents, venues) {
  const team = teams.find(item => item.id === match.teamId)
  const opponent = opponents.find(item => item.id === match.opponentId)
  const venue = venues.find(item => item.id === match.venueId)
  const matchLocation = getMatchLocation(venue)
  const clubName = team?.name || 'Equipo del club'
  const opponentName = opponent?.name || 'Rival'

  return {
    ...match,
    category: team?.category?.name || 'Sin categoría',
    categoryId: team?.category?.id || '',
    seasonId: team?.season?.id || '',
    seasonName: team?.season?.name || 'Sin temporada',
    groupName: team?.groupName || '',
    teamName: clubName,
    opponentName,
    homeTeam: matchLocation === 'AWAY' ? opponentName : clubName,
    awayTeam: matchLocation === 'AWAY' ? clubName : opponentName,
    matchLocation,
    venueAddress: venue?.address || '',
    venueMapsUrl: venue?.googleMapsUrl || '',
    venueSurface: venue?.surfaceType || '',
    location: venue
      ? venue.name?.toLocaleLowerCase('es').includes('por determinar')
        ? 'Campo del rival — localidad por confirmar'
        : `${venue.name} — ${venue.city}`
      : 'Sede pendiente',
    date: formatDate(match.matchDate),
    time: match.matchTime?.slice(0, 5) || 'Hora pendiente'
  }
}

function MatchDetailsDialog({ match, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    closeButtonRef.current?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [onClose])

  const hasCompleteScore = match.homeScore != null && match.awayScore != null
  const firstTeam = match.matchLocation === 'UNKNOWN' ? match.teamName : match.homeTeam
  const secondTeam = match.matchLocation === 'UNKNOWN' ? match.opponentName : match.awayTeam
  const resultLabel = !hasCompleteScore
    ? 'Resultado pendiente'
    : match.matchLocation === 'UNKNOWN'
      ? 'Resultado local–visitante; localía sin confirmar'
      : match.homeScore === match.awayScore
        ? 'Empate'
        : `Ganador: ${match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam}`
  const locationLabel = match.matchLocation === 'HOME'
    ? 'En Oropesa'
    : match.matchLocation === 'AWAY'
      ? 'Fuera'
      : 'Por confirmar'
  const scoreColor = score => {
    if (!hasCompleteScore || match.matchLocation === 'UNKNOWN' || match.homeScore === match.awayScore) {
      return match.homeScore === match.awayScore && hasCompleteScore && match.matchLocation !== 'UNKNOWN'
        ? 'text-amber-300'
        : 'text-slate-300'
    }

    return score > (score === match.homeScore ? match.awayScore : match.homeScore)
      ? 'text-emerald-300'
      : 'text-red-300'
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4'
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='match-details-title'
        className='w-full max-w-xl space-y-5 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl'
      >
        <header className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-sky-300'>{match.category} · {match.seasonName}</p>
            <h2 id='match-details-title' className='mt-1 text-xl font-black text-white'>
              {match.teamName} · Jornada {match.matchday}
            </h2>
            {match.groupName && <p className='mt-1 text-sm text-slate-400'>{match.groupName}</p>}
          </div>
          <button
            ref={closeButtonRef}
            type='button'
            onClick={onClose}
            aria-label='Cerrar detalles del partido'
            className='rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700'
          >
            Cerrar
          </button>
        </header>

        <div className='rounded-2xl border border-slate-800 bg-slate-950 p-4 text-center'>
          <p className='text-xs text-slate-400'>{match.date} · {match.time} · {locationLabel}</p>
          <div className='mt-4 flex flex-col items-center gap-2'>
            <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Local</span>
            <span className='max-w-full break-words text-sm font-bold text-white'>{firstTeam}</span>
            <span className='rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xl font-black tabular-nums'>
              <span className={scoreColor(match.homeScore)}>{hasCompleteScore ? match.homeScore : '—'}</span>
              <span className='text-slate-500'> : </span>
              <span className={scoreColor(match.awayScore)}>{hasCompleteScore ? match.awayScore : '—'}</span>
            </span>
            <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Equipo visitante</span>
            <span className='max-w-full break-words text-sm font-bold text-white'>{secondTeam}</span>
          </div>
          <p className={`mt-3 text-sm font-semibold ${
            !hasCompleteScore || match.matchLocation === 'UNKNOWN'
              ? 'text-slate-400'
              : match.homeScore === match.awayScore
                ? 'text-amber-300'
                : 'text-emerald-300'
          }`}>
            {resultLabel}
          </p>
          {match.matchLocation === 'UNKNOWN' && hasCompleteScore && (
            <p className='mt-1 text-xs text-amber-300'>Marcador en orden local–visitante; localía sin confirmar.</p>
          )}
        </div>

        <dl className='grid gap-3 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-xs text-slate-500'>Localía</dt>
            <dd className='font-semibold text-white'>{locationLabel}</dd>
          </div>
          <div>
            <dt className='text-xs text-slate-500'>Estado</dt>
            <dd className='font-semibold text-white'>{formatStatus(match.status)}</dd>
          </div>
          <div className='sm:col-span-2'>
            <dt className='text-xs text-slate-500'>Instalación</dt>
            <dd className='font-semibold text-white'>{match.location}</dd>
          </div>
          {match.venueAddress && (
            <div className='sm:col-span-2'>
              <dt className='text-xs text-slate-500'>Dirección</dt>
              <dd className='font-semibold text-white'>{match.venueAddress}</dd>
            </div>
          )}
          {match.venueSurface && (
            <div>
              <dt className='text-xs text-slate-500'>Superficie</dt>
              <dd className='font-semibold text-white'>{match.venueSurface}</dd>
            </div>
          )}
        </dl>
        {match.venueMapsUrl && (
          <a
            href={match.venueMapsUrl}
            target='_blank'
            rel='noreferrer'
            className='inline-flex rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-bold text-sky-200 transition hover:bg-sky-500/20'
          >
            Abrir ubicación en el mapa
          </a>
        )}
      </section>
    </div>
  )
}

export default function MatchesSection({ isAdmin }) {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [opponents, setOpponents] = useState([])
  const [venues, setVenues] = useState([])
  const [viewMode, setViewMode] = useState('weekend')
  const [filters, setFilters] = useState({
    categoryId: '',
    teamId: '',
    seasonId: '',
    matchday: '',
    opponentId: '',
    status: '',
    location: '',
    startDate: '',
    endDate: ''
  })
  const [showForm, setShowForm] = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)
  const [detailsMatch, setDetailsMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const closeDetails = useCallback(() => setDetailsMatch(null), [])
  const formSectionRef = useRef(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [matchesData, teamsData, opponentsData, venuesData] = await Promise.all([
          fetchApi('/matches'),
          fetchApi('/teams'),
          fetchApi('/opponents'),
          fetchApi('/venues')
        ])

        setTeams(teamsData)
        setOpponents(opponentsData)
        setVenues(venuesData)
        setMatches(matchesData.map(match => enrichMatch(match, teamsData, opponentsData, venuesData)))
      } catch (err) {
        setError(err.message || 'No se pudieron cargar los partidos y sus datos.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!showForm && !editingMatch) return undefined

    const frameId = window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [editingMatch, showForm])

  const weekendRange = getNextWeekendRange()
  const previousWeekendRange = getPreviousWeekendRange()
  const sortByName = (first, second) =>
    first.name.localeCompare(second.name, 'es', { sensitivity: 'base' })
  const sortedTeams = [...teams].sort(sortByName)
  const sortedOpponents = [...opponents].sort(sortByName)
  const categories = [...new Map(teams.filter(team => team.category).map(team => [team.category.id, team.category])).values()].sort(sortByName)
  const seasons = [...new Map(teams.filter(team => team.season).map(team => [team.season.id, team.season])).values()].sort(sortByName)
  const matchdays = [...new Set(matches.map(match => match.matchday).filter(Number.isInteger))].sort((a, b) => a - b)
  const sortedMatches = [...matches].sort((a, b) => {
    const dateOrder = a.matchDate.localeCompare(b.matchDate)
    if (dateOrder !== 0) return dateOrder
    return (a.matchTime || '99:99').localeCompare(b.matchTime || '99:99')
  })
  const visibleMatches = sortedMatches.filter(match => {
    const activeRange = viewMode === 'weekend' ? weekendRange : viewMode === 'previous' ? previousWeekendRange : null
    if (activeRange && (match.matchDate < activeRange.start || match.matchDate > activeRange.end)) return false
    if (filters.categoryId && match.categoryId !== filters.categoryId) return false
    if (filters.teamId && match.teamId !== filters.teamId) return false
    if (filters.seasonId && match.seasonId !== filters.seasonId) return false
    if (filters.matchday && match.matchday !== Number(filters.matchday)) return false
    if (filters.opponentId && match.opponentId !== filters.opponentId) return false
    if (filters.status && match.status !== filters.status) return false
    if (filters.location && match.matchLocation !== filters.location) return false
    if (filters.startDate && match.matchDate < filters.startDate) return false
    if (filters.endDate && match.matchDate > filters.endDate) return false
    return true
  })

  const groupedMatches = [
    { key: 'HOME', title: 'En Oropesa', matches: visibleMatches.filter(match => match.matchLocation === 'HOME') },
    { key: 'AWAY', title: 'Fuera', matches: visibleMatches.filter(match => match.matchLocation === 'AWAY') },
    {
      key: 'UNKNOWN',
      title: 'Localía por confirmar',
      matches: visibleMatches.filter(match => match.matchLocation === 'UNKNOWN')
    }
  ].filter(group => group.matches.length > 0)

  const updateFilter = event => {
    const { name, value } = event.target
    setFilters(current => ({ ...current, [name]: value }))
  }

  const clearFilters = () => {
    setFilters({
      categoryId: '',
      teamId: '',
      seasonId: '',
      matchday: '',
      opponentId: '',
      status: '',
      location: '',
      startDate: '',
      endDate: ''
    })
  }

  const renderMatchCards = matchesToRender => (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {matchesToRender.map(match => (
        <MatchCard
          key={match.id}
          match={match}
          isAdmin={isAdmin}
          onDetails={() => setDetailsMatch(match)}
          onEdit={() => {
            setShowForm(false)
            setEditingMatch(match)
          }}
          onDelete={() => handleDeleteMatch(match)}
        />
      ))}
    </div>
  )

  const handleMatchCreated = savedMatch => {
    setMatches(current => [enrichMatch(savedMatch, teams, opponents, venues), ...current])
    setShowForm(false)
  }

  const handleMatchUpdated = savedMatch => {
    setMatches(current => current.map(match => (match.id === savedMatch.id ? enrichMatch(savedMatch, teams, opponents, venues) : match)))
    setEditingMatch(null)
  }

  const handleDeleteMatch = async match => {
    const teamsLabel = match.matchLocation === 'UNKNOWN'
      ? `${match.teamName} vs ${match.opponentName}`
      : `${match.homeTeam} vs ${match.awayTeam}`
    if (!window.confirm(`¿Quieres eliminar el partido ${teamsLabel}?`)) {
      return
    }

    setError('')

    try {
      await fetchApi(`/matches/${match.id}`, { method: 'DELETE' })
      setMatches(current => current.filter(item => item.id !== match.id))
      if (editingMatch?.id === match.id) setEditingMatch(null)
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el partido.')
    }
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-black tracking-tight text-white'>Calendario de partidos</h2>
          <p className='mt-1 text-xs text-slate-400'>
            {viewMode === 'weekend'
              ? `Próximo fin de semana: ${formatDate(weekendRange.start)} — ${formatDate(weekendRange.end)}.`
              : viewMode === 'previous'
                ? `Fin de semana pasado: ${formatDate(previousWeekendRange.start)} — ${formatDate(previousWeekendRange.end)}.`
                : 'Consulta y filtra todos los partidos de la temporada.'}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            onClick={() => setViewMode('weekend')}
            aria-pressed={viewMode === 'weekend'}
            className={`cursor-pointer rounded-xl border-2 px-3.5 py-2 text-xs font-bold transition ${
              viewMode === 'weekend'
                ? 'border-blue-300 bg-blue-600 text-white shadow-lg shadow-blue-950/40 ring-2 ring-blue-400/30'
                : 'border-blue-500/40 bg-blue-500/10 text-blue-200 hover:border-blue-400 hover:bg-blue-500/20'
            }`}
          >
            Próximo fin de semana
          </button>
          <button
            type='button'
            onClick={() => setViewMode('previous')}
            aria-pressed={viewMode === 'previous'}
            className={`cursor-pointer rounded-xl border-2 px-3.5 py-2 text-xs font-bold transition ${
              viewMode === 'previous'
                ? 'border-violet-300 bg-violet-600 text-white shadow-lg shadow-violet-950/40 ring-2 ring-violet-400/30'
                : 'border-violet-500/40 bg-violet-500/10 text-violet-200 hover:border-violet-400 hover:bg-violet-500/20'
            }`}
          >
            Fin de semana pasado
          </button>
          <button
            type='button'
            onClick={() => setViewMode('all')}
            aria-pressed={viewMode === 'all'}
            className={`cursor-pointer rounded-xl border-2 px-3.5 py-2 text-xs font-bold transition ${
              viewMode === 'all'
                ? 'border-cyan-300 bg-cyan-600 text-white shadow-lg shadow-cyan-950/40 ring-2 ring-cyan-400/30'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400 hover:bg-cyan-500/20'
            }`}
          >
            Todos los partidos
          </button>

          {isAdmin && (
            <button
              type='button'
              onClick={() => {
                setEditingMatch(null)
                setShowForm(open => !open)
              }}
              className='rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500'
            >
              {showForm ? 'Cancelar' : '+ Añadir partido'}
            </button>
          )}
        </div>
      </div>

      <div className='rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <h3 className='text-sm font-bold text-white'>Filtros</h3>
          <button type='button' onClick={clearFilters} className='text-xs font-semibold text-blue-300 hover:text-blue-200'>
            Limpiar filtros
          </button>
        </div>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <select name='seasonId' value={filters.seasonId} onChange={updateFilter} aria-label='Filtrar por temporada' className='rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white'>
            <option value=''>Todas las temporadas</option>
            {seasons.map(season => <option key={season.id} value={season.id}>{season.name}</option>)}
          </select>
          <select name='categoryId' value={filters.categoryId} onChange={updateFilter} aria-label='Filtrar por categoría' className='rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white'>
            <option value=''>Todas las categorías</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select name='teamId' value={filters.teamId} onChange={updateFilter} aria-label='Filtrar por equipo' className='rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white'>
            <option value=''>Todos los equipos</option>
            {sortedTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <select name='matchday' value={filters.matchday} onChange={updateFilter} aria-label='Filtrar por jornada' className='rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white'>
            <option value=''>Todas las jornadas</option>
            {matchdays.map(matchday => <option key={matchday} value={matchday}>Jornada {matchday}</option>)}
          </select>
          <select name='opponentId' value={filters.opponentId} onChange={updateFilter} aria-label='Filtrar por rival' className='rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white'>
            <option value=''>Todos los rivales</option>
            {sortedOpponents.map(opponent => <option key={opponent.id} value={opponent.id}>{opponent.name}</option>)}
          </select>
          <select name='status' value={filters.status} onChange={updateFilter} aria-label='Filtrar por estado' className='rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white'>
            <option value=''>Todos los estados</option>
            <option value='SCHEDULED'>Programado</option>
            <option value='COMPLETED'>Finalizado</option>
            <option value='SUSPENDED'>Suspendido</option>
            <option value='POSTPONED'>Aplazado</option>
          </select>
          <select name='location' value={filters.location} onChange={updateFilter} aria-label='Filtrar por localía' className='rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white'>
            <option value=''>En casa o fuera</option>
            <option value='HOME'>En Oropesa</option>
            <option value='AWAY'>Fuera</option>
            <option value='UNKNOWN'>Localía por confirmar</option>
          </select>
          <label className='flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400'>
            Desde
            <input type='date' name='startDate' value={filters.startDate} onChange={updateFilter} className='min-w-0 flex-1 bg-transparent text-sm text-white' />
          </label>
          <label className='flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400'>
            Hasta
            <input type='date' name='endDate' value={filters.endDate} onChange={updateFilter} className='min-w-0 flex-1 bg-transparent text-sm text-white' />
          </label>
        </div>
        <p className='mt-3 text-xs text-slate-500' aria-live='polite'>{visibleMatches.length} partidos</p>
      </div>

      {isAdmin && showForm && !editingMatch && (
        <div ref={formSectionRef} className='scroll-mt-6'>
          <AdminMatchForm onMatchCreated={handleMatchCreated} />
        </div>
      )}

      {isAdmin && editingMatch && (
        <div ref={formSectionRef} className='scroll-mt-6'>
          <AdminMatchForm
            key={editingMatch.id}
            initialMatch={editingMatch}
            onMatchUpdated={handleMatchUpdated}
            onCancel={() => setEditingMatch(null)}
          />
        </div>
      )}

      {detailsMatch && <MatchDetailsDialog match={detailsMatch} onClose={closeDetails} />}

      {error && <p className='rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300'>{error}</p>}

      {loading ? (
        <p className='rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400'>Cargando partidos...</p>
      ) : visibleMatches.length === 0 ? (
        <p className='rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500'>
          {viewMode === 'weekend'
            ? 'No hay partidos programados para el próximo fin de semana con estos filtros.'
            : viewMode === 'previous'
              ? 'No hay partidos del fin de semana pasado que coincidan con estos filtros.'
              : 'No hay partidos que coincidan con los filtros seleccionados.'}
        </p>
      ) : (
        <div className='space-y-8'>
          {groupedMatches.map(group => (
            <section key={group.key} aria-labelledby={`matches-${group.key}`}>
              <h3 id={`matches-${group.key}`} className='mb-3 text-lg font-black text-white'>{group.title}</h3>
              {renderMatchCards(group.matches)}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
