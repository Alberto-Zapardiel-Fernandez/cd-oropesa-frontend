import { useEffect, useState } from 'react'
import { fetchApi } from '../../services/api'
import AdminMatchForm from '../admin/AdminMatchForm'
import MatchCard from './MatchCard'

function formatDate(date) {
  if (!date) return 'Fecha pendiente'

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${date}T00:00:00`))
}

function enrichMatch(match, teams, opponents, venues) {
  const team = teams.find(item => item.id === match.teamId)
  const opponent = opponents.find(item => item.id === match.opponentId)
  const venue = venues.find(item => item.id === match.venueId)

  return {
    ...match,
    category: team?.category?.name || 'Sin categoría',
    homeTeam: team?.name || 'Equipo local',
    awayTeam: opponent?.name || 'Rival',
    location: venue ? `${venue.name} — ${venue.city}` : 'Sede pendiente',
    date: formatDate(match.matchDate),
    time: match.matchTime?.slice(0, 5) || 'Hora pendiente'
  }
}

export default function MatchesSection({ isAdmin }) {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [opponents, setOpponents] = useState([])
  const [venues, setVenues] = useState([])
  const [filterCategory, setFilterCategory] = useState('TODOS')
  const [showForm, setShowForm] = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const categories = [...new Set(matches.map(match => match.category))]
  const visibleMatches = filterCategory === 'TODOS' ? matches : matches.filter(match => match.category === filterCategory)

  const handleMatchCreated = savedMatch => {
    setMatches(current => [enrichMatch(savedMatch, teams, opponents, venues), ...current])
    setShowForm(false)
  }

  const handleMatchUpdated = savedMatch => {
    setMatches(current => current.map(match => (match.id === savedMatch.id ? enrichMatch(savedMatch, teams, opponents, venues) : match)))
    setEditingMatch(null)
  }

  const handleDeleteMatch = async match => {
    if (!window.confirm(`¿Quieres eliminar el partido ${match.homeTeam} vs ${match.awayTeam}?`)) {
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
          <p className='mt-1 text-xs text-slate-400'>Encuentros programados para todas las categorías.</p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {['TODOS', ...categories].map(category => (
            <button
              key={category}
              type='button'
              onClick={() => setFilterCategory(category)}
              className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                filterCategory === category ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {category === 'TODOS' ? 'Todos' : category}
            </button>
          ))}

          {isAdmin && (
            <button
              type='button'
              onClick={() => {
                setEditingMatch(null)
                setShowForm(open => !open)
              }}
              className='rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-500'
            >
              {showForm ? 'Cancelar' : '+ Añadir partido'}
            </button>
          )}
        </div>
      </div>

      {isAdmin && showForm && !editingMatch && <AdminMatchForm onMatchCreated={handleMatchCreated} />}

      {isAdmin && editingMatch && (
        <AdminMatchForm
          key={editingMatch.id}
          initialMatch={editingMatch}
          onMatchUpdated={handleMatchUpdated}
          onCancel={() => setEditingMatch(null)}
        />
      )}

      {error && <p className='rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300'>{error}</p>}

      {loading ? (
        <p className='rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400'>Cargando partidos...</p>
      ) : visibleMatches.length === 0 ? (
        <p className='rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500'>
          No hay partidos registrados para esta categoría.
        </p>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {visibleMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              isAdmin={isAdmin}
              onEdit={() => {
                setShowForm(false)
                setEditingMatch(match)
              }}
              onDelete={() => handleDeleteMatch(match)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
