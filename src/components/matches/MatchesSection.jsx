import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchApi } from '../../services/api'
import AdminMatchForm from '../admin/AdminMatchForm'
import MatchCard from './MatchCard'
import { getMatchLocation } from './matchLocation'
import { getWeekendRange } from './weekendRanges'

const FILTER_LABEL_STYLES = 'flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-400'
const FILTER_CONTROL_STYLES = 'h-11 w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30'

function formatDate(date) {
  if (!date) return 'Fecha pendiente'

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${date}T00:00:00`))
}

function formatWeekendRange(range) {
  const saturday = new Date(`${range.start}T00:00:00`)
  const sunday = new Date(`${range.end}T00:00:00`)
  const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long' })
  const saturdayMonth = monthFormatter.format(saturday)
  const sundayMonth = monthFormatter.format(sunday)

  if (saturday.getFullYear() === sunday.getFullYear() && saturday.getMonth() === sunday.getMonth()) {
    return `Fin de semana ${saturday.getDate()} y ${sunday.getDate()} de ${sundayMonth} de ${sunday.getFullYear()}`
  }

  if (saturday.getFullYear() === sunday.getFullYear()) {
    return `Fin de semana del ${saturday.getDate()} de ${saturdayMonth} al ${sunday.getDate()} de ${sundayMonth} de ${sunday.getFullYear()}`
  }

  return `Fin de semana del ${saturday.getDate()} de ${saturdayMonth} de ${saturday.getFullYear()} al ${sunday.getDate()} de ${sundayMonth} de ${sunday.getFullYear()}`
}

function formatHistoryTitle(filters, seasons, teams) {
  const season = seasons.find(item => item.id === filters.seasonId)?.name
  const team = teams.find(item => item.id === filters.teamId)?.name
  const period = filters.startDate || filters.endDate
    ? ` · ${filters.startDate || 'inicio'} — ${filters.endDate || 'actualidad'}`
    : ''

  return `Historial${team ? ` · ${team}` : ''}${season ? ` · ${season}` : ''}${period}`
}

function getWeekendMatchRange(range) {
  const friday = new Date(`${range.start}T00:00:00`)
  friday.setDate(friday.getDate() - 1)

  return {
    start: [
      friday.getFullYear(),
      String(friday.getMonth() + 1).padStart(2, '0'),
      String(friday.getDate()).padStart(2, '0')
    ].join('-'),
    end: range.end
  }
}

function formatScheduleTitle(range, weekendMatches) {
  const matchRange = getWeekendMatchRange(range)
  const hasFridayMatch = weekendMatches.some(match => match.matchDate === matchRange.start)
  if (!hasFridayMatch) return formatWeekendRange(range)

  const friday = new Date(`${matchRange.start}T00:00:00`)
  const sunday = new Date(`${matchRange.end}T00:00:00`)
  const formatDateOptions = { day: 'numeric', month: 'long' }
  const fridayLabel = new Intl.DateTimeFormat('es-ES', formatDateOptions).format(friday)
  const sundayLabel = new Intl.DateTimeFormat('es-ES', formatDateOptions).format(sunday)

  return `Partidos del ${fridayLabel} al ${sundayLabel} de ${sunday.getFullYear()}`
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

function groupMatchesByLocation(matches) {
  return [
    { key: 'HOME', title: 'En Oropesa' },
    { key: 'AWAY', title: 'Fuera' },
    { key: 'UNKNOWN', title: 'Localía por confirmar' }
  ].map(group => ({
    ...group,
    matches: matches.filter(match => match.matchLocation === group.key)
  })).filter(group => group.matches.length > 0)
}

function getMatchSummary(matches) {
  return matches.reduce((summary, match) => {
    if (
      match.matchLocation === 'UNKNOWN' ||
      match.homeScore == null ||
      match.awayScore == null
    ) {
      return summary
    }

    const oropesaScore = match.matchLocation === 'AWAY' ? match.awayScore : match.homeScore
    const opponentScore = match.matchLocation === 'AWAY' ? match.homeScore : match.awayScore

    if (oropesaScore > opponentScore) {
      summary.wins += 1
      summary.points += 3
    } else if (oropesaScore === opponentScore) {
      summary.draws += 1
      summary.points += 1
    } else {
      summary.losses += 1
    }

    return summary
  }, { wins: 0, draws: 0, losses: 0, points: 0 })
}

function MatchSummary({ summary }) {
  return (
    <div className='flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-bold'>
      <span className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300'>{summary.wins} Ganados</span>
      <span className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-300'>{summary.draws} Empates</span>
      <span className='rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300'>{summary.losses} Perdidos</span>
      <span className='rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2 text-white'>{summary.points} Puntos</span>
    </div>
  )
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

function PrintableWeekend({ title, groups }) {
  return (
    <section className='matches-print-weekend'>
      <h2>{title}</h2>
      {groups.length === 0 ? (
        <p>No hay partidos para el fin de semana y los filtros seleccionados.</p>
      ) : groups.map(group => (
        <section key={group.key} className='matches-print-group'>
          <h3>{group.title}</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Partido</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {group.matches.map(match => {
                const firstTeam = match.matchLocation === 'UNKNOWN' ? match.teamName : match.homeTeam
                const secondTeam = match.matchLocation === 'UNKNOWN' ? match.opponentName : match.awayTeam
                const hasCompleteScore = match.homeScore != null && match.awayScore != null
                const shortDate = new Intl.DateTimeFormat('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }).format(new Date(`${match.matchDate}T00:00:00`))

                return (
                  <tr key={match.id}>
                    <td>
                      {shortDate}<br />
                      {match.time}<br />
                      {(match.status === 'POSTPONED' || match.status === 'SUSPENDED') && (
                        <span>{formatStatus(match.status)}</span>
                      )}
                    </td>
                    <td>
                      <strong className='matches-print-team-names'>{firstTeam} — {secondTeam}</strong>
                    </td>
                    <td>
                      {hasCompleteScore ? `${match.homeScore} — ${match.awayScore}` : 'Pendiente'}
                      {match.matchLocation === 'UNKNOWN' && hasCompleteScore && (
                        <><br /><span>Marcador local–visitante</span></>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ))}
    </section>
  )
}

export default function MatchesSection({ isAdmin }) {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [opponents, setOpponents] = useState([])
  const [venues, setVenues] = useState([])
  const [weekendOffset, setWeekendOffset] = useState(0)
  const [viewMode, setViewMode] = useState('weekend')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
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

  const weekendRange = getWeekendRange(weekendOffset)
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
  const getMatchesForWeekend = range => {
    const matchRange = getWeekendMatchRange(range)
    return sortedMatches.filter(match =>
      match.matchDate >= matchRange.start && match.matchDate <= matchRange.end
    )
  }
  const selectedWeekendMatchRange = getWeekendMatchRange(weekendRange)
  const matchesBeforeLimit = sortedMatches.filter(match => {
    if (viewMode === 'weekend' && (match.matchDate < selectedWeekendMatchRange.start || match.matchDate > selectedWeekendMatchRange.end)) return false
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
  const historyLimitApplies = viewMode === 'history' && filters.seasonId && filters.teamId
  const visibleMatches = historyLimitApplies ? matchesBeforeLimit.slice(0, 26) : matchesBeforeLimit
  const hasMoreThanHistoryLimit = historyLimitApplies && matchesBeforeLimit.length > visibleMatches.length
  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const locationGroups = groupMatchesByLocation(visibleMatches)
  const displayGroups = viewMode === 'history'
    ? [{ key: 'ALL', title: 'Todos los partidos', matches: visibleMatches }]
    : locationGroups
  const matchSummary = viewMode === 'history' ? getMatchSummary(visibleMatches) : null
  const selectedSummaryTeam = sortedTeams.find(team => team.id === filters.teamId)?.name
  const selectedSummaryCategory = categories.find(category => category.id === filters.categoryId)?.name
  const summaryContext = selectedSummaryTeam || selectedSummaryCategory || 'Todos los equipos'
  const printTitle = viewMode === 'history'
    ? formatHistoryTitle(filters, seasons, sortedTeams)
    : formatScheduleTitle(weekendRange, getMatchesForWeekend(weekendRange))
  const weekendMatches = getMatchesForWeekend(weekendRange)
  const candidateRestTeams = sortedTeams.filter(team => {
    if (filters.teamId && team.id !== filters.teamId) return false
    if (filters.seasonId && team.season?.id !== filters.seasonId) return false
    if (filters.categoryId && team.category?.id !== filters.categoryId) return false
    return true
  })
  const candidateTeamIds = new Set(candidateRestTeams.map(team => team.id))
  const relevantWeekendMatches = weekendMatches.filter(match => candidateTeamIds.has(match.teamId))
  const weekendTeamCounts = relevantWeekendMatches.reduce((entries, match) => {
    entries.set(match.teamId, (entries.get(match.teamId) || 0) + 1)
    return entries
  }, new Map())
  const teamsWithOneWeekendMatch = candidateRestTeams.filter(team => weekendTeamCounts.get(team.id) === 1)
  const restingTeams = viewMode === 'weekend' &&
    !filters.teamId &&
    candidateRestTeams.length >= 3 &&
    teamsWithOneWeekendMatch.length === candidateRestTeams.length - 1 &&
    relevantWeekendMatches.length === teamsWithOneWeekendMatch.length
    ? candidateRestTeams.filter(team => !weekendTeamCounts.has(team.id))
    : []

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

  const switchViewMode = mode => {
    setViewMode(mode)
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
      <div className='rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-xl sm:p-6'>
        <div className='grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center'>
          <h2 className='text-center text-2xl font-black tracking-tight text-white lg:text-left'>Calendario de partidos</h2>
          <nav aria-label='Navegación por fines de semana' className='flex justify-center'>
            {viewMode === 'weekend' ? (
              <div className='inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5 sm:gap-3 sm:p-2'>
              <button
                type='button'
                onClick={() => setWeekendOffset(offset => offset - 1)}
                aria-label='Ver fin de semana anterior'
                title='Fin de semana anterior'
                className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-blue-400 hover:bg-blue-500/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50'
              >
                <svg aria-hidden='true' viewBox='0 0 20 20' fill='none' className='h-5 w-5'>
                  <path d='m12.5 4-6 6 6 6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </button>
              <p aria-live='polite' className='min-w-0 px-1 text-center text-xs font-bold leading-relaxed text-white sm:px-2 sm:text-sm'>
                {formatScheduleTitle(weekendRange, getMatchesForWeekend(weekendRange))}
              </p>
              <button
                type='button'
                onClick={() => setWeekendOffset(offset => offset + 1)}
                aria-label='Ver fin de semana siguiente'
                title='Fin de semana siguiente'
                className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-blue-400 hover:bg-blue-500/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50'
              >
                <svg aria-hidden='true' viewBox='0 0 20 20' fill='none' className='h-5 w-5'>
                  <path d='m7.5 4 6 6-6 6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </button>
              </div>
            ) : (
              <p aria-live='polite' className='text-center text-xs font-bold leading-relaxed text-white sm:text-sm'>
                {formatHistoryTitle(filters, seasons, sortedTeams)}
              </p>
            )}
          </nav>
          <div className='flex flex-wrap items-center justify-center gap-2 lg:justify-end'>
            <button
              type='button'
              onClick={() => window.print()}
              disabled={loading || Boolean(error)}
              title='En el diálogo de impresión, selecciona «Guardar como PDF».'
              aria-label='Imprimir o guardar el resumen de partidos como PDF'
              className='inline-flex items-center gap-2 rounded-xl border-2 border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-200 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <svg
                aria-hidden='true'
                viewBox='0 0 24 24'
                fill='none'
                className='h-5 w-5 shrink-0 text-red-400'
              >
                <path
                  d='M7 3.75h7l4.25 4.25v11A1.25 1.25 0 0 1 17 20.25H7A1.25 1.25 0 0 1 5.75 19V5A1.25 1.25 0 0 1 7 3.75Z'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinejoin='round'
                />
                <path d='M14 4v4h4' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
                <path d='M8 14.25h8M8 17h5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
              </svg>
              <span>PDF</span>
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
      </div>

      <div className='flex flex-wrap justify-center gap-2' role='tablist' aria-label='Tipo de consulta'>
        <button
          type='button'
          role='tab'
          aria-selected={viewMode === 'weekend'}
          onClick={() => switchViewMode('weekend')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${viewMode === 'weekend' ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
        >
          Próximo fin de semana
        </button>
        <button
          type='button'
          role='tab'
          aria-selected={viewMode === 'history'}
          onClick={() => switchViewMode('history')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${viewMode === 'history' ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
        >
          Consultar historial
        </button>
      </div>

      <div className='rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <button
            type='button'
            onClick={() => setFiltersExpanded(expanded => !expanded)}
            aria-expanded={filtersExpanded}
            aria-controls='matches-filters'
            className='inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-left text-sm font-bold text-white transition hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-blue-500/50'
          >
            <svg
              aria-hidden='true'
              viewBox='0 0 20 20'
              fill='none'
              className={`h-4 w-4 text-slate-400 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
            >
              <path d='m5 7.5 5 5 5-5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <span className='rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-200'>
                {activeFilterCount} activos
              </span>
            )}
            <span className='sr-only'>{filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>
          {activeFilterCount > 0 && (
            <button type='button' onClick={clearFilters} className='rounded-lg px-2 py-2 text-xs font-semibold text-blue-300 hover:bg-slate-800/70 hover:text-blue-200'>
              Limpiar filtros
            </button>
          )}
        </div>
        <div id='matches-filters' hidden={!filtersExpanded} className='border-t border-slate-800/80 pt-4'>
            <div className='grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              <label className={FILTER_LABEL_STYLES}>
                Temporada
                <select name='seasonId' value={filters.seasonId} onChange={updateFilter} aria-label='Filtrar por temporada' className={FILTER_CONTROL_STYLES}>
                  <option value=''>Todas las temporadas</option>
                  {seasons.map(season => <option key={season.id} value={season.id}>{season.name}</option>)}
                </select>
              </label>
              <label className={FILTER_LABEL_STYLES}>
                Categoría
                <select name='categoryId' value={filters.categoryId} onChange={updateFilter} aria-label='Filtrar por categoría' className={FILTER_CONTROL_STYLES}>
                  <option value=''>Todas las categorías</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className={FILTER_LABEL_STYLES}>
                Equipo
                <select name='teamId' value={filters.teamId} onChange={updateFilter} aria-label='Filtrar por equipo' className={FILTER_CONTROL_STYLES}>
                  <option value=''>Todos los equipos</option>
                  {sortedTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
              <label className={FILTER_LABEL_STYLES}>
                Jornada
                <select name='matchday' value={filters.matchday} onChange={updateFilter} aria-label='Filtrar por jornada' className={FILTER_CONTROL_STYLES}>
                  <option value=''>Todas las jornadas</option>
                  {matchdays.map(matchday => <option key={matchday} value={matchday}>Jornada {matchday}</option>)}
                </select>
              </label>
              <label className={FILTER_LABEL_STYLES}>
                Rival
                <select name='opponentId' value={filters.opponentId} onChange={updateFilter} aria-label='Filtrar por rival' className={FILTER_CONTROL_STYLES}>
                  <option value=''>Todos los rivales</option>
                  {sortedOpponents.map(opponent => <option key={opponent.id} value={opponent.id}>{opponent.name}</option>)}
                </select>
              </label>
              <label className={FILTER_LABEL_STYLES}>
                Estado
                <select name='status' value={filters.status} onChange={updateFilter} aria-label='Filtrar por estado' className={FILTER_CONTROL_STYLES}>
                  <option value=''>Todos los estados</option>
                  <option value='SCHEDULED'>Programado</option>
                  <option value='COMPLETED'>Finalizado</option>
                  <option value='SUSPENDED'>Suspendido</option>
                  <option value='POSTPONED'>Aplazado</option>
                </select>
              </label>
              <label className={FILTER_LABEL_STYLES}>
                Localía
                <select name='location' value={filters.location} onChange={updateFilter} aria-label='Filtrar por localía' className={FILTER_CONTROL_STYLES}>
                  <option value=''>En casa o fuera</option>
                  <option value='HOME'>En Oropesa</option>
                  <option value='AWAY'>Fuera</option>
                  <option value='UNKNOWN'>Localía por confirmar</option>
                </select>
              </label>
              <label className={FILTER_LABEL_STYLES}>
                Desde
                <input type='date' name='startDate' value={filters.startDate} onChange={updateFilter} className={FILTER_CONTROL_STYLES} />
              </label>
              <label className={FILTER_LABEL_STYLES}>
                Hasta
                <input type='date' name='endDate' value={filters.endDate} onChange={updateFilter} className={FILTER_CONTROL_STYLES} />
              </label>
            </div>
        </div>
        <p className='mt-3 text-xs text-slate-500' aria-live='polite'>
          {visibleMatches.length} partidos{activeFilterCount > 0 ? ` · ${activeFilterCount} filtros activos` : ''}
          {hasMoreThanHistoryLimit ? ' · Mostrando los primeros 26' : ''}
        </p>
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
          {viewMode === 'history'
            ? 'No hay partidos que coincidan con los filtros históricos.'
            : 'No hay partidos programados para este fin de semana que coincidan con los filtros.'}
        </p>
      ) : (
        <div className='space-y-8'>
          {displayGroups.map(locationGroup => (
            <section key={locationGroup.key} aria-label={locationGroup.title}>
              {viewMode === 'history' ? (
                <div className='mb-3 space-y-2 text-center'>
                  <h3 className='text-lg font-black text-white'>Resumen del Oropesa ({summaryContext})</h3>
                  <MatchSummary summary={matchSummary} />
                </div>
              ) : (
                <h3 className='mb-3 text-lg font-black text-white'>{locationGroup.title}</h3>
              )}
              {renderMatchCards(locationGroup.matches)}
            </section>
          ))}
          {restingTeams.length > 0 && (
            <section aria-label='Equipos que descansan'>
              <h3 className='mb-3 text-lg font-black text-white'>Descansan</h3>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {restingTeams.map(team => (
                  <article key={team.id} className='rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4'>
                    <p className='text-xs font-bold uppercase tracking-wider text-amber-300'>Sin partido esta jornada</p>
                    <h4 className='mt-1 text-lg font-black text-white'>{team.name}</h4>
                    <p className='mt-1 text-sm text-amber-100/80'>Descanso identificado por el calendario de este fin de semana.</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {createPortal(<div className='matches-print-content'>
        <header className='matches-print-header'>
          <h1>CD Oropesa · Calendario de partidos</h1>
          <p>{viewMode === 'history' ? 'Historial de partidos y filtros seleccionados.' : 'Partidos del fin de semana y filtros seleccionados.'}</p>
        </header>
        <PrintableWeekend
          title={printTitle}
          groups={displayGroups}
        />
        <footer className='matches-print-footer'>CD Oropesa · Calendario para compartir</footer>
      </div>, document.body)}
    </section>
  )
}
