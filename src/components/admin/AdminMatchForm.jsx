import { useEffect, useState } from 'react'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

const EMPTY_FORM = {
  teamId: '',
  opponentId: '',
  venueId: '',
  matchday: '',
  matchDate: '',
  matchTime: '',
  homeScore: '',
  awayScore: '',
  status: 'SCHEDULED'
}

const INPUT_STYLES =
  'w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600'

export default function AdminMatchForm({ initialMatch, onMatchCreated, onMatchUpdated, onCancel }) {
  const [teams, setTeams] = useState([])
  const [opponents, setOpponents] = useState([])
  const [venues, setVenues] = useState([])
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadOptions() {
      try {
        const [teamsData, opponentsData, venuesData] = await Promise.all([fetchApi('/teams'), fetchApi('/opponents'), fetchApi('/venues')])

        setTeams(teamsData)
        setOpponents(opponentsData)
        setVenues(venuesData)

        setFormData({
          teamId: initialMatch?.teamId || teamsData[0]?.id || '',
          opponentId: initialMatch?.opponentId || opponentsData[0]?.id || '',
          venueId: initialMatch?.venueId || venuesData.find(venue => venue.isHomeVenue)?.id || venuesData[0]?.id || '',
          matchday: initialMatch?.matchday ?? '',
          matchDate: initialMatch?.matchDate || '',
          matchTime: initialMatch?.matchTime?.slice(0, 5) || '',
          homeScore: initialMatch?.homeScore ?? '',
          awayScore: initialMatch?.awayScore ?? '',
          status: initialMatch?.status || 'SCHEDULED'
        })
      } catch (err) {
        setError(err.message || 'No se pudieron cargar equipos, rivales e instalaciones.')
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [initialMatch])

  const handleChange = event => {
    const { name, value } = event.target
    setFormData(current => ({ ...current, [name]: value }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.teamId || !formData.opponentId || !formData.venueId) {
      setError('Selecciona el equipo, el rival y la instalación.')
      return
    }

    setLoading(true)

    const body = {
      teamId: formData.teamId,
      opponentId: formData.opponentId,
      venueId: formData.venueId,
      matchday: Number(formData.matchday),
      matchDate: formData.matchDate,
      matchTime: formData.matchTime ? `${formData.matchTime}:00` : null,
      homeScore: formData.homeScore === '' ? null : Number(formData.homeScore),
      awayScore: formData.awayScore === '' ? null : Number(formData.awayScore),
      status: formData.status
    }

    try {
      const savedMatch = await fetchApi(initialMatch ? `/matches/${initialMatch.id}` : '/matches', {
        method: initialMatch ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      })

      if (initialMatch) {
        setSuccess('Partido actualizado correctamente.')
        onMatchUpdated?.(savedMatch)
      } else {
        setSuccess('Partido registrado correctamente.')
        onMatchCreated?.(savedMatch)
        setFormData(current => ({
          ...current,
          matchday: '',
          matchDate: '',
          matchTime: '',
          homeScore: '',
          awayScore: '',
          status: 'SCHEDULED'
        }))
      }
    } catch (err) {
      setError(err.message || 'No se pudo guardar el partido.')
    } finally {
      setLoading(false)
    }
  }

  const optionsReady = teams.length > 0 && opponents.length > 0 && venues.length > 0

  return (
    <section className={CARD_STYLES.panel}>
      <div className='border-b border-slate-800 pb-4'>
        <h3 className='text-lg font-black tracking-wide text-white'>{initialMatch ? 'Editar partido' : 'Añadir partido'}</h3>
        <p className='mt-1 text-xs text-slate-400'>Los cambios se guardarán en la base de datos.</p>
      </div>

      {loadingOptions && <p className='text-sm text-slate-400'>Cargando datos del partido...</p>}

      {error && <p className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>{error}</p>}

      {success && <p className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300'>{success}</p>}

      {!loadingOptions && optionsReady && (
        <form
          onSubmit={handleSubmit}
          className='mt-4 space-y-4'
        >
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='space-y-1.5 text-xs font-bold text-slate-400'>
              Equipo del club
              <select
                name='teamId'
                value={formData.teamId}
                onChange={handleChange}
                className={INPUT_STYLES}
                required
              >
                {teams.map(team => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.name}
                    {team.category?.name ? ` — ${team.category.name}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1.5 text-xs font-bold text-slate-400'>
              Equipo rival
              <select
                name='opponentId'
                value={formData.opponentId}
                onChange={handleChange}
                className={INPUT_STYLES}
                required
              >
                {opponents.map(opponent => (
                  <option
                    key={opponent.id}
                    value={opponent.id}
                  >
                    {opponent.name}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1.5 text-xs font-bold text-slate-400'>
              Instalación
              <select
                name='venueId'
                value={formData.venueId}
                onChange={handleChange}
                className={INPUT_STYLES}
                required
              >
                {venues.map(venue => (
                  <option
                    key={venue.id}
                    value={venue.id}
                  >
                    {venue.name} — {venue.city}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1.5 text-xs font-bold text-slate-400'>
              Jornada
              <input
                name='matchday'
                type='number'
                min='1'
                value={formData.matchday}
                onChange={handleChange}
                className={INPUT_STYLES}
                required
              />
            </label>

            <label className='space-y-1.5 text-xs font-bold text-slate-400'>
              Fecha
              <input
                name='matchDate'
                type='date'
                value={formData.matchDate}
                onChange={handleChange}
                className={INPUT_STYLES}
                required
              />
            </label>

            <label className='space-y-1.5 text-xs font-bold text-slate-400'>
              Hora
              <input
                name='matchTime'
                type='time'
                value={formData.matchTime}
                onChange={handleChange}
                className={INPUT_STYLES}
              />
            </label>

            <label className='space-y-1.5 text-xs font-bold text-slate-400'>
              Goles del equipo del club
              <input
                name='homeScore'
                type='number'
                min='0'
                value={formData.homeScore}
                onChange={handleChange}
                className={INPUT_STYLES}
              />
            </label>

            <label className='space-y-1.5 text-xs font-bold text-slate-400'>
              Goles del rival
              <input
                name='awayScore'
                type='number'
                min='0'
                value={formData.awayScore}
                onChange={handleChange}
                className={INPUT_STYLES}
              />
            </label>

            <label className='space-y-1.5 text-xs font-bold text-slate-400 sm:col-span-2'>
              Estado
              <select
                name='status'
                value={formData.status}
                onChange={handleChange}
                className={INPUT_STYLES}
                required
              >
                <option value='SCHEDULED'>Programado</option>
                <option value='COMPLETED'>Finalizado</option>
                <option value='SUSPENDED'>Suspendido</option>
                <option value='POSTPONED'>Aplazado</option>
              </select>
            </label>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row'>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50'
            >
              {loading ? 'Guardando...' : initialMatch ? 'Guardar cambios' : 'Guardar partido'}
            </button>

            {initialMatch && (
              <button
                type='button'
                onClick={onCancel}
                className='rounded-2xl border border-slate-700 px-6 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800'
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {!loadingOptions && !optionsReady && (
        <p className='mt-4 text-sm text-slate-400'>Para crear un partido, primero tiene que haber equipos, rivales e instalaciones registrados.</p>
      )}
    </section>
  )
}
