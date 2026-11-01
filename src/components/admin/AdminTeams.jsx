import { useEffect, useState } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

const EMPTY_OPPONENT_FORM = {
  name: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  notes: ''
}

const EMPTY_TEAM_FORM = {
  name: '',
  categoryId: '',
  seasonId: '',
  groupName: ''
}

const SELECT_STYLES =
  'w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600'

export default function AdminTeams({ onManageRoster }) {
  const [opponents, setOpponents] = useState([])
  const [opponentForm, setOpponentForm] = useState(EMPTY_OPPONENT_FORM)
  const [opponentSearch, setOpponentSearch] = useState('')

  const [teams, setTeams] = useState([])
  const [categories, setCategories] = useState([])
  const [seasons, setSeasons] = useState([])
  const [teamForm, setTeamForm] = useState(EMPTY_TEAM_FORM)

  const [loadingData, setLoadingData] = useState(true)
  const [savingOpponent, setSavingOpponent] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [opponentsData, teamsData, categoriesData, seasonsData] = await Promise.all([
          fetchApi('/opponents'),
          fetchApi('/teams'),
          fetchApi('/categories'),
          fetchApi('/seasons')
        ])

        setOpponents(opponentsData)
        setTeams(teamsData)
        setCategories(categoriesData)
        setSeasons(seasonsData)
        setTeamForm(current => ({
          ...current,
          categoryId: categoriesData[0]?.id || '',
          seasonId: seasonsData.find(season => season.isCurrent)?.id || seasonsData[0]?.id || ''
        }))
      } catch (err) {
        setError(err.message || 'No se pudieron cargar los datos de equipos y rivales.')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  const handleOpponentFormChange = event => {
    const { name, value } = event.target
    setOpponentForm(current => ({ ...current, [name]: value }))
  }

  const handleTeamFormChange = event => {
    const { name, value } = event.target
    setTeamForm(current => ({ ...current, [name]: value }))
  }

  const handleAddOpponent = async event => {
    event.preventDefault()
    setError('')

    const name = opponentForm.name.trim()

    if (!name) {
      setError('El nombre del equipo rival es obligatorio.')
      return
    }

    const alreadyExists = opponents.some(opponent => opponent.name.toLocaleLowerCase() === name.toLocaleLowerCase())

    if (alreadyExists) {
      setError('Ese equipo rival ya está registrado.')
      return
    }

    setSavingOpponent(true)

    try {
      const newOpponent = await fetchApi('/opponents', {
        method: 'POST',
        body: JSON.stringify({
          name,
          contactPerson: opponentForm.contactPerson.trim(),
          contactPhone: opponentForm.contactPhone.trim(),
          contactEmail: opponentForm.contactEmail.trim(),
          notes: opponentForm.notes.trim()
        })
      })

      setOpponents(current => [...current, newOpponent])
      setOpponentForm(EMPTY_OPPONENT_FORM)
    } catch (err) {
      setError(err.message || 'No se pudo guardar el equipo rival.')
    } finally {
      setSavingOpponent(false)
    }
  }

  const handleDeleteOpponent = async opponent => {
    const confirmed = window.confirm(`¿Quieres eliminar el rival "${opponent.name}"?`)

    if (!confirmed) return

    setError('')

    try {
      await fetchApi(`/opponents/${opponent.id}`, { method: 'DELETE' })
      setOpponents(current => current.filter(item => item.id !== opponent.id))
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el rival. Comprueba si ya está asociado a un partido.')
    }
  }

  const handleAddTeam = async event => {
    event.preventDefault()
    setError('')

    if (!teamForm.name.trim() || !teamForm.categoryId || !teamForm.seasonId) {
      setError('Completa el nombre, la categoría y la temporada del equipo.')
      return
    }

    setSavingTeam(true)

    try {
      const newTeam = await fetchApi('/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: teamForm.name.trim(),
          categoryId: teamForm.categoryId,
          seasonId: teamForm.seasonId,
          groupName: teamForm.groupName.trim()
        })
      })

      setTeams(current => [...current, newTeam])
      setTeamForm(current => ({
        ...current,
        name: '',
        groupName: ''
      }))
    } catch (err) {
      setError(err.message || 'No se pudo guardar el equipo del club.')
    } finally {
      setSavingTeam(false)
    }
  }

  const handleDeleteTeam = async team => {
    const confirmed = window.confirm(`¿Quieres eliminar el equipo "${team.name}"?`)

    if (!confirmed) return

    setError('')

    try {
      await fetchApi(`/teams/${team.id}`, { method: 'DELETE' })
      setTeams(current => current.filter(item => item.id !== team.id))
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el equipo.')
    }
  }

  const search = opponentSearch.trim().toLocaleLowerCase()
  const visibleOpponents = opponents.filter(opponent => opponent.name.toLocaleLowerCase().includes(search))

  return (
    <div className={`${CARD_STYLES.panel} space-y-8`}>
      {error && <p className='rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300'>{error}</p>}

      {loadingData ? (
        <p className='text-sm text-slate-400'>Cargando equipos y rivales...</p>
      ) : (
        <>
          <section className='space-y-4'>
            <div className='border-b border-slate-800 pb-4'>
              <h3 className='text-lg font-black tracking-wide text-white'>Equipos rivales</h3>
              <p className='mt-1 text-xs text-slate-400'>Registra los equipos visitantes y sus datos de contacto.</p>
            </div>

            <form
              onSubmit={handleAddOpponent}
              className='space-y-4'
            >
              <div className='grid gap-3 sm:grid-cols-2'>
                <Input
                  label='Nombre'
                  name='name'
                  value={opponentForm.name}
                  onChange={handleOpponentFormChange}
                  placeholder='C.F. Talavera Benjamín A'
                  required
                />

                <Input
                  label='Persona de contacto'
                  name='contactPerson'
                  value={opponentForm.contactPerson}
                  onChange={handleOpponentFormChange}
                  placeholder='Nombre de la persona de contacto'
                />

                <Input
                  label='Teléfono de contacto'
                  name='contactPhone'
                  type='tel'
                  value={opponentForm.contactPhone}
                  onChange={handleOpponentFormChange}
                  placeholder='Teléfono'
                />

                <Input
                  label='Correo electrónico de contacto'
                  name='contactEmail'
                  type='email'
                  value={opponentForm.contactEmail}
                  onChange={handleOpponentFormChange}
                  placeholder='correo@club.es'
                />
              </div>

              <div className='space-y-1.5'>
                <label
                  htmlFor='opponent-notes'
                  className='block text-xs font-bold uppercase tracking-wider text-slate-400'
                >
                  Notas
                </label>
                <textarea
                  id='opponent-notes'
                  name='notes'
                  value={opponentForm.notes}
                  onChange={handleOpponentFormChange}
                  rows={3}
                  className={SELECT_STYLES}
                />
              </div>

              <button
                type='submit'
                disabled={savingOpponent}
                className='w-full rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50'
              >
                {savingOpponent ? 'Guardando...' : 'Añadir equipo rival'}
              </button>
            </form>

            <Input
              label='Buscar rival'
              name='opponentSearch'
              value={opponentSearch}
              onChange={event => setOpponentSearch(event.target.value)}
              placeholder='Escribe el nombre del equipo rival'
            />

            {visibleOpponents.length === 0 ? (
              <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500'>
                {opponents.length === 0 ? 'Todavía no hay equipos rivales registrados.' : 'No hay rivales que coincidan con la búsqueda.'}
              </p>
            ) : (
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {visibleOpponents.map(opponent => (
                  <div
                    key={opponent.id}
                    className={`flex items-start justify-between gap-3 px-4 py-3.5 ${CARD_STYLES.item}`}
                  >
                    <div className='min-w-0'>
                      <span className='block break-words text-sm font-bold text-white [overflow-wrap:anywhere]'>{opponent.name}</span>
                      {opponent.contactPerson && (
                        <span className='mt-1 block break-words text-xs text-slate-400 [overflow-wrap:anywhere]'>
                          Contacto: {opponent.contactPerson}
                        </span>
                      )}
                      {opponent.contactPhone && (
                        <span className='block break-words text-xs text-slate-400 [overflow-wrap:anywhere]'>Teléfono: {opponent.contactPhone}</span>
                      )}
                      {opponent.contactEmail && <span className='block break-all text-xs text-slate-400'>Email: {opponent.contactEmail}</span>}
                      {opponent.notes && (
                        <span className='mt-1 block break-words text-xs text-slate-500 [overflow-wrap:anywhere]'>{opponent.notes}</span>
                      )}
                    </div>

                    <button
                      type='button'
                      onClick={() => handleDeleteOpponent(opponent)}
                      className={CARD_STYLES.actionDelete}
                      title='Eliminar rival'
                      aria-label={`Eliminar ${opponent.name}`}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className='space-y-4 border-t border-slate-800 pt-6'>
            <div className='border-b border-slate-800 pb-4'>
              <h3 className='text-lg font-black tracking-wide text-white'>Equipos del CD Oropesa</h3>
              <p className='mt-1 text-xs text-slate-400'>Los equipos del club se vinculan a una categoría y una temporada.</p>
            </div>

            <form
              onSubmit={handleAddTeam}
              className='space-y-4'
            >
              <div className='grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                <Input
                  label='Nombre del equipo'
                  name='name'
                  value={teamForm.name}
                  onChange={handleTeamFormChange}
                  placeholder='Ej: CD Oropesa Benjamín'
                  required
                />

                <label className='space-y-1.5 text-xs font-bold text-slate-400'>
                  Categoría
                  <select
                    name='categoryId'
                    value={teamForm.categoryId}
                    onChange={handleTeamFormChange}
                    className={SELECT_STYLES}
                    required
                    disabled={categories.length === 0}
                  >
                    <option
                      value=''
                      disabled
                    >
                      Selecciona una categoría
                    </option>
                    {categories.map(category => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <Input
                  label='Grupo'
                  name='groupName'
                  value={teamForm.groupName}
                  onChange={handleTeamFormChange}
                  placeholder='Ej: Grupo 1 Provincial'
                />

                <label className='space-y-1.5 text-xs font-bold text-slate-400'>
                  Temporada
                  <select
                    name='seasonId'
                    value={teamForm.seasonId}
                    onChange={handleTeamFormChange}
                    className={SELECT_STYLES}
                    required
                    disabled={seasons.length === 0}
                  >
                    <option
                      value=''
                      disabled
                    >
                      Selecciona una temporada
                    </option>
                    {seasons.map(season => (
                      <option
                        key={season.id}
                        value={season.id}
                      >
                        {season.name}
                        {season.isCurrent ? ' (Activa)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type='submit'
                disabled={savingTeam || categories.length === 0 || seasons.length === 0}
                className='w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:opacity-50'
              >
                {savingTeam ? 'Guardando...' : 'Añadir equipo del club'}
              </button>
            </form>

            {seasons.length === 0 && <p className='text-sm text-amber-300'>Primero crea una temporada en la pestaña Temporadas.</p>}

            {teams.length === 0 ? (
              <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500'>
                Todavía no hay equipos del club registrados.
              </p>
            ) : (
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {teams.map(team => (
                  <div
                    key={team.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3.5 ${CARD_STYLES.item}`}
                  >
                    <button
                      type='button'
                      onClick={() => onManageRoster?.(team)}
                      className='min-w-0 flex-1 text-left'
                    >
                      <span className='block break-words text-sm font-bold text-white [overflow-wrap:anywhere]'>{team.name}</span>
                      <span className='mt-0.5 block break-words text-[10px] text-slate-400 [overflow-wrap:anywhere]'>
                        {team.groupName || 'Sin grupo'}
                        {' · '}
                        {team.category?.name || 'Sin categoría'}
                        {' · '}
                        {team.season?.name || 'Sin temporada'}
                      </span>
                      <span className='mt-2 block text-xs font-semibold text-blue-400'>Gestionar plantilla</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => handleDeleteTeam(team)}
                      className={CARD_STYLES.actionDelete}
                      title='Eliminar equipo'
                      aria-label={`Eliminar ${team.name}`}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
