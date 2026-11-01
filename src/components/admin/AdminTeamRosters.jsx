import { useEffect, useMemo, useState } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

const SELECT_STYLES =
  'w-full min-w-0 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600'
const POSITION_OPTIONS = [
  { value: 'GOALKEEPER', label: 'Portero' },
  { value: 'DEFENDER', label: 'Defensa' },
  { value: 'MIDFIELDER', label: 'Centrocampista' },
  { value: 'FORWARD', label: 'Delantero' }
]

const normalizeDorsal = dorsal => {
  if (typeof dorsal === 'number' || typeof dorsal === 'string') return dorsal
  if (dorsal && typeof dorsal === 'object' && 'value' in dorsal) {
    const value = dorsal.value
    return typeof value === 'number' || typeof value === 'string' ? value : ''
  }
  return ''
}

const createDrafts = roster =>
  Object.fromEntries(
    roster.map(entry => [
      entry.id,
      {
        dorsal: normalizeDorsal(entry.dorsal),
        status: entry.status,
        positions: entry.positions || []
      }
    ])
  )

export default function AdminTeamRosters({ initialTeamId = '' }) {
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId)
  const [teamPlayers, setTeamPlayers] = useState([])
  const [playerToAdd, setPlayerToAdd] = useState('')
  const [dorsalToAdd, setDorsalToAdd] = useState('')
  const [positionsToAdd, setPositionsToAdd] = useState([])
  const [rosterDrafts, setRosterDrafts] = useState({})
  const [loadingData, setLoadingData] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(Boolean(initialTeamId))
  const [savingRoster, setSavingRoster] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedTeam = teams.find(team => team.id === selectedTeamId)
  const availablePlayers = useMemo(
    () => players.filter(player => !teamPlayers.some(entry => entry.playerId === player.id)),
    [players, teamPlayers]
  )

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        const [teamsData, playersData] = await Promise.all([
          fetchApi('/teams'),
          fetchApi('/players')
        ])
        if (!active) return
        setTeams(teamsData)
        setPlayers(playersData)
      } catch (err) {
        if (active) setError(err.message || 'No se pudieron cargar equipos y jugadores.')
      } finally {
        if (active) setLoadingData(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedTeamId) return undefined

    let active = true

    async function loadRoster() {
      try {
        const roster = await fetchApi(`/teams/${selectedTeamId}/players`)
        if (!active) return
        setTeamPlayers(roster)
        setRosterDrafts(createDrafts(roster))
      } catch (err) {
        if (!active) return
        setTeamPlayers([])
        setRosterDrafts({})
        setError(err.message || 'No se pudo cargar la plantilla del equipo.')
      } finally {
        if (active) setLoadingRoster(false)
      }
    }

    loadRoster()
    return () => {
      active = false
    }
  }, [selectedTeamId])

  const handleSelectTeam = event => {
    setSelectedTeamId(event.target.value)
    setTeamPlayers([])
    setRosterDrafts({})
    setPlayerToAdd('')
    setDorsalToAdd('')
    setPositionsToAdd([])
    setLoadingRoster(Boolean(event.target.value))
    setError('')
    setNotice('')
  }

  const handleAddPlayer = async event => {
    event.preventDefault()
    if (!selectedTeam || !playerToAdd) return

    setError('')
    setNotice('')
    setSavingRoster(true)

    try {
      const createdEntry = await fetchApi(`/teams/${selectedTeam.id}/players`, {
        method: 'POST',
        body: JSON.stringify({
          playerId: playerToAdd,
          dorsal: dorsalToAdd === '' ? null : Number(dorsalToAdd),
          positions: positionsToAdd,
          status: 'PENDING_DOCS'
        })
      })

      try {
        const freshRoster = await fetchApi(`/teams/${selectedTeam.id}/players`)
        setTeamPlayers(freshRoster)
        setRosterDrafts(createDrafts(freshRoster))
        setNotice('Jugador inscrito; plantilla actualizada.')
      } catch (refreshError) {
        setTeamPlayers(current => [...current, createdEntry])
        setRosterDrafts(current => ({
          ...current,
          [createdEntry.id]: {
            dorsal: normalizeDorsal(createdEntry.dorsal) || dorsalToAdd,
            status: createdEntry.status || 'PENDING_DOCS',
            positions: createdEntry.positions || []
          }
        }))
        setError(`La inscripción se guardó, pero no se pudo refrescar la plantilla: ${refreshError.message}`)
      }

      setPlayerToAdd('')
      setDorsalToAdd('')
      setPositionsToAdd([])
    } catch (err) {
      setError(err.message || 'No se pudo inscribir al jugador en el equipo.')
    } finally {
      setSavingRoster(false)
    }
  }

  const handleSaveEntry = async entry => {
    const draft = rosterDrafts[entry.id]
    if (!selectedTeam || !draft) return

    setError('')
    setNotice('')
    setSavingRoster(true)

    try {
      const updated = await fetchApi(`/teams/${selectedTeam.id}/players/${entry.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          dorsal: draft.dorsal === '' ? null : Number(draft.dorsal),
          clearDorsal: draft.dorsal === '',
          status: draft.status,
          positions: draft.positions
        })
      })

      setTeamPlayers(current => current.map(item => item.id === entry.id ? updated : item))
      setRosterDrafts(current => ({
        ...current,
        [entry.id]: {
          dorsal: normalizeDorsal(updated.dorsal),
          status: updated.status,
          positions: updated.positions || []
        }
      }))
      setNotice('Inscripción actualizada correctamente.')
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la inscripción.')
    } finally {
      setSavingRoster(false)
    }
  }

  const handleRemoveEntry = async entry => {
    const confirmed = window.confirm(
      `¿Quieres quitar a ${entry.firstName} ${entry.lastName} de ${selectedTeam.name}? Su ficha personal no se eliminará.`
    )
    if (!confirmed) return

    setError('')
    setNotice('')
    try {
      await fetchApi(`/teams/${selectedTeam.id}/players/${entry.id}`, { method: 'DELETE' })
      setTeamPlayers(current => current.filter(item => item.id !== entry.id))
      setRosterDrafts(current => {
        const next = { ...current }
        delete next[entry.id]
        return next
      })
      setNotice('Jugador quitado de la plantilla. Su ficha personal se conserva.')
    } catch (err) {
      setError(err.message || 'No se pudo quitar el jugador de la plantilla.')
    }
  }

  return (
    <div className={`${CARD_STYLES.panel} space-y-6`}>
      <header>
        <h3 className='text-lg font-black tracking-wide text-white'>Plantillas de equipos</h3>
        <p className='mt-1 text-xs text-slate-400'>
          Inscribe jugadores en uno o varios equipos y gestiona dorsal, demarcaciones y estado por equipo.
        </p>
      </header>

      {error && (
        <p role='alert' className='break-words rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 [overflow-wrap:anywhere]'>
          {error}
        </p>
      )}
      {notice && (
        <p role='status' aria-live='polite' className='rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300'>
          {notice}
        </p>
      )}

      {loadingData ? (
        <p className='text-sm text-slate-400'>Cargando equipos y jugadores...</p>
      ) : teams.length === 0 ? (
        <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500'>
          Primero crea un equipo en la pestaña Equipos.
        </p>
      ) : (
        <>
          <label className='block space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
            Equipo y temporada
            <select
              value={selectedTeamId}
              onChange={handleSelectTeam}
              className={SELECT_STYLES}
            >
              <option value=''>Selecciona un equipo</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} · {team.season?.name || 'Sin temporada'}
                </option>
              ))}
            </select>
          </label>

          {selectedTeam && (
            <section className='min-w-0 space-y-5 border-t border-slate-800 pt-5'>
              <div>
                <h4 className='break-words text-base font-bold text-white [overflow-wrap:anywhere]'>
                  {selectedTeam.name}
                </h4>
                <p className='mt-1 break-words text-xs text-slate-400 [overflow-wrap:anywhere]'>
                  {selectedTeam.category?.name || 'Sin categoría'} · {selectedTeam.season?.name || 'Sin temporada'}
                  {selectedTeam.groupName ? ` · ${selectedTeam.groupName}` : ''}
                </p>
                <p className='mt-1 text-xs text-slate-500'>Quitar a alguien de aquí no borra su ficha personal.</p>
              </div>

              <form onSubmit={handleAddPlayer} className='grid min-w-0 gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-[minmax(0,1fr)_120px]'>
                <label className='min-w-0 space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 sm:col-span-2'>
                  Jugador
                  <select
                    value={playerToAdd}
                    onChange={event => setPlayerToAdd(event.target.value)}
                    className={SELECT_STYLES}
                    required
                    disabled={availablePlayers.length === 0 || loadingRoster}
                  >
                    <option value=''>Selecciona un jugador</option>
                    {availablePlayers.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.firstName} {player.lastName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className='min-w-0'>
                  <Input
                    label='Dorsal'
                    name='newPlayerDorsal'
                    type='number'
                    value={dorsalToAdd}
                    onChange={event => setDorsalToAdd(event.target.value)}
                    placeholder='Sin dorsal'
                  />
                </div>

                <div className='min-w-0 sm:col-span-2'>
                  <PositionSelector
                    value={positionsToAdd}
                    onChange={setPositionsToAdd}
                    name='new-player-positions'
                  />
                </div>

                <button
                  type='submit'
                  disabled={savingRoster || loadingRoster || !playerToAdd || (dorsalToAdd !== '' && (Number(dorsalToAdd) < 0 || Number(dorsalToAdd) > 99))}
                  className='min-h-11 self-end rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50'
                >
                  {savingRoster ? 'Guardando...' : 'Inscribir jugador'}
                </button>
                <p className='text-xs text-slate-500 sm:col-span-2'>El dorsal puede dejarse vacío y debe estar entre 0 y 99.</p>
              </form>

              {availablePlayers.length === 0 && (
                <p className='text-xs text-slate-500'>
                  No hay jugadores disponibles para añadir. Primero crea su ficha en Jugadores.
                </p>
              )}

              {loadingRoster ? (
                <p className='text-sm text-slate-400'>Cargando plantilla...</p>
              ) : teamPlayers.length === 0 ? (
                <p className='rounded-xl border border-slate-800 p-4 text-center text-sm text-slate-500'>
                  Este equipo aún no tiene jugadores inscritos.
                </p>
              ) : (
                <div className='space-y-3'>
                  {teamPlayers.map(entry => {
                    const draft = rosterDrafts[entry.id] || {
                      dorsal: normalizeDorsal(entry.dorsal),
                      status: entry.status,
                      positions: entry.positions || []
                    }
                    const displayedDorsal = normalizeDorsal(draft.dorsal)

                    return (
                      <article key={entry.id} className='grid min-w-0 gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:grid-cols-[minmax(0,1fr)_120px] lg:grid-cols-[minmax(0,1fr)_120px_minmax(190px,0.8fr)_auto_auto]'>
                        <div className='flex min-w-0 items-center gap-3 lg:col-span-1'>
                          <span className='flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-2 text-sm font-black text-blue-300'>
                            {displayedDorsal === '' ? '—' : `#${displayedDorsal}`}
                          </span>
                          <p className='min-w-0 break-words text-sm font-semibold text-white [overflow-wrap:anywhere]'>
                            {entry.firstName} {entry.lastName}
                          </p>
                        </div>

                        <Input
                          label='Dorsal'
                          name={`dorsal-${entry.id}`}
                          type='number'
                          value={displayedDorsal}
                          onChange={event => setRosterDrafts(current => ({
                            ...current,
                            [entry.id]: { ...draft, dorsal: event.target.value }
                          }))}
                        />

                        <div className='min-w-0 sm:col-span-2 lg:col-span-3'>
                          <PositionSelector
                            value={draft.positions || []}
                            onChange={positions => setRosterDrafts(current => ({
                              ...current,
                              [entry.id]: { ...draft, positions }
                            }))}
                            name={`positions-${entry.id}`}
                          />
                        </div>

                        <label className='min-w-0 space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
                          Estado
                          <select
                            value={draft.status}
                            onChange={event => setRosterDrafts(current => ({
                              ...current,
                              [entry.id]: { ...draft, status: event.target.value }
                            }))}
                            className={SELECT_STYLES}
                          >
                            <option value='PENDING_DOCS'>Documentación pendiente</option>
                            <option value='ACTIVE'>Activo</option>
                            <option value='INACTIVE'>Inactivo</option>
                            <option value='EXPIRED_LICENSE'>Licencia caducada</option>
                          </select>
                        </label>

                        <button
                          type='button'
                          onClick={() => handleSaveEntry(entry)}
                          disabled={savingRoster || (draft.dorsal !== '' && (Number(draft.dorsal) < 0 || Number(draft.dorsal) > 99))}
                          className='min-h-11 rounded-xl bg-slate-700 px-4 py-3 text-xs font-bold text-white hover:bg-slate-600 disabled:opacity-50'
                        >
                          Guardar
                        </button>
                        <button
                          type='button'
                          onClick={() => handleRemoveEntry(entry)}
                          className={`${CARD_STYLES.actionDelete} min-h-11`}
                          title='Quitar de la plantilla (conserva la ficha)'
                          aria-label={`Quitar a ${entry.firstName} ${entry.lastName} de la plantilla`}
                        >
                          Quitar
                        </button>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function PositionSelector({ value, onChange, name }) {
  const selectedPositions = value || []

  const togglePosition = position => {
    onChange(
      selectedPositions.includes(position)
        ? selectedPositions.filter(item => item !== position)
        : [...selectedPositions, position]
    )
  }

  return (
    <fieldset className='min-w-0 space-y-2'>
      <legend className='text-xs font-bold uppercase tracking-wider text-slate-400'>
        Demarcaciones (puedes elegir varias)
      </legend>
      <div className='flex flex-wrap gap-2'>
        {POSITION_OPTIONS.map(option => (
          <label
            key={`${name}-${option.value}`}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
              selectedPositions.includes(option.value)
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}
          >
            <input
              type='checkbox'
              checked={selectedPositions.includes(option.value)}
              onChange={() => togglePosition(option.value)}
              className='accent-blue-600'
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
