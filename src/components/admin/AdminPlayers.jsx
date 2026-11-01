import { useEffect, useState } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  birthDate: '',
  dni: '',
  licenseNumber: '',
  address: '',
  photoUrl: '',
  dniFileUrl: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  gdprConsent: false
}

const normalizeText = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()

const safeHttpUrl = value => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

export default function AdminPlayers() {
  const [players, setPlayers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingPlayerId, setEditingPlayerId] = useState(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPlayers() {
      try {
        const data = await fetchApi('/players')
        setPlayers(data)
      } catch (err) {
        setError(err.message || 'No se pudieron cargar las fichas de jugadores.')
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [])

  useEffect(() => {
    if (!notice) return undefined

    const timeoutId = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  const handleChange = event => {
    const { name, value, type, checked } = event.target
    setForm(current => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleEdit = player => {
    setEditingPlayerId(player.id)
    setForm({
      ...EMPTY_FORM,
      ...player,
      birthDate: player.birthDate || '',
      gdprConsent: Boolean(player.gdprConsent)
    })
    setSearch(`${player.firstName} ${player.lastName}`)
    setError('')
    setNotice('')
  }

  const handleCancelEdit = () => {
    setEditingPlayerId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    const payload = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dni: form.dni.trim() || null,
      licenseNumber: form.licenseNumber.trim() || null,
      address: form.address.trim() || null,
      photoUrl: form.photoUrl.trim() || null,
      dniFileUrl: form.dniFileUrl.trim() || null,
      guardianName: form.guardianName.trim() || null,
      guardianPhone: form.guardianPhone.trim() || null,
      guardianEmail: form.guardianEmail.trim() || null
    }

    try {
      if (editingPlayerId) {
        const updatedPlayer = await fetchApi(`/players/${editingPlayerId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })

        setPlayers(current => [updatedPlayer, ...current.filter(player => player.id !== editingPlayerId)])
        setNotice(`Ficha de ${payload.firstName} ${payload.lastName} actualizada.`)
      } else {
        const newPlayer = await fetchApi('/players', {
          method: 'POST',
          body: JSON.stringify(payload)
        })

        setPlayers(current => [newPlayer, ...current.filter(player => player.id !== newPlayer.id)])
        setNotice(`Jugador ${payload.firstName} ${payload.lastName} insertado correctamente.`)
      }

      setSearch(`${payload.firstName} ${payload.lastName}`)
      setEditingPlayerId(null)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err.message || 'No se pudo guardar la ficha del jugador.')
    } finally {
      setSaving(false)
    }
  }

  const normalizedSearch = normalizeText(search.trim())
  const matchingPlayers = normalizedSearch
    ? players.filter(player => normalizeText(`${player.firstName} ${player.lastName} ${player.address || ''}`).includes(normalizedSearch))
    : []
  const visiblePlayers = matchingPlayers.slice(0, 5)

  return (
    <div className={`${CARD_STYLES.panel} space-y-6`}>
      {notice && (
        <div
          role='status'
          aria-live='polite'
          className='fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] items-start justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 text-sm text-emerald-300 shadow-2xl sm:left-auto sm:w-auto sm:max-w-md'
        >
          <span>{notice}</span>
          <button
            type='button'
            onClick={() => setNotice('')}
            className='min-h-6 min-w-6 font-bold text-emerald-200'
            aria-label='Cerrar aviso'
          >
            ×
          </button>
        </div>
      )}

      <div>
        <h3 className='text-lg font-black tracking-wide text-white'>Fichas de jugadores</h3>
        <p className='mt-1 text-xs text-slate-400'>Los datos personales se gestionan por separado de la inscripción en cada equipo.</p>
      </div>

      {error && (
        <p
          role='alert'
          className='rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300'
        >
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className='space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4'
      >
        <h4 className='text-sm font-bold text-white'>{editingPlayerId ? 'Editar ficha' : 'Dar de alta jugador'}</h4>

        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <Input
            label='Nombre'
            name='firstName'
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <Input
            label='Apellidos'
            name='lastName'
            value={form.lastName}
            onChange={handleChange}
            required
          />
          <Input
            label='Fecha de nacimiento'
            name='birthDate'
            type='date'
            value={form.birthDate}
            onChange={handleChange}
            required
          />
          <Input
            label='DNI/NIE'
            name='dni'
            value={form.dni || ''}
            onChange={handleChange}
          />
          <Input
            label='N.º licencia'
            name='licenseNumber'
            value={form.licenseNumber || ''}
            onChange={handleChange}
          />
          <Input
            label='Dirección'
            name='address'
            value={form.address || ''}
            onChange={handleChange}
          />
          <Input
            label='URL de la foto'
            name='photoUrl'
            type='url'
            value={form.photoUrl || ''}
            onChange={handleChange}
            placeholder='https://...'
          />
          <Input
            label='URL del documento DNI'
            name='dniFileUrl'
            type='url'
            value={form.dniFileUrl || ''}
            onChange={handleChange}
            placeholder='https://...'
          />
          <Input
            label='Nombre del tutor'
            name='guardianName'
            value={form.guardianName || ''}
            onChange={handleChange}
          />
          <Input
            label='Teléfono del tutor'
            name='guardianPhone'
            type='tel'
            value={form.guardianPhone || ''}
            onChange={handleChange}
          />
          <Input
            label='Email del tutor'
            name='guardianEmail'
            type='email'
            value={form.guardianEmail || ''}
            onChange={handleChange}
          />
        </div>

        <label className='flex min-h-11 items-center gap-2 text-sm text-slate-300'>
          <input
            type='checkbox'
            name='gdprConsent'
            checked={form.gdprConsent}
            onChange={handleChange}
            className='h-4 w-4 accent-blue-600'
          />
          Consentimiento RGPD registrado
        </label>

        <div className='flex flex-col gap-3 sm:flex-row'>
          <button
            type='submit'
            disabled={saving}
            className='min-h-11 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50'
          >
            {saving ? 'Guardando...' : editingPlayerId ? 'Guardar cambios' : 'Crear ficha'}
          </button>

          {editingPlayerId && (
            <button
              type='button'
              onClick={handleCancelEdit}
              className='min-h-11 rounded-2xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800'
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className='space-y-3'>
        <Input
          label='Buscar jugador por nombre o dirección'
          name='playerSearch'
          type='search'
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder='Empieza a escribir para buscar...'
        />

        {loading ? (
          <p className='text-sm text-slate-400'>Cargando jugadores...</p>
        ) : players.length === 0 ? (
          <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500'>Todavía no hay fichas creadas.</p>
        ) : !normalizedSearch ? (
          <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-center text-sm text-slate-500'>
            Escribe un nombre o una dirección para buscar en las fichas.
          </p>
        ) : matchingPlayers.length === 0 ? (
          <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-center text-sm text-slate-500'>
            No hay jugadores que coincidan con la búsqueda.
          </p>
        ) : (
          <>
            <p className='text-xs text-slate-400'>
              {matchingPlayers.length === 1 ? '1 jugador encontrado' : `${matchingPlayers.length} jugadores encontrados`}
              {matchingPlayers.length > 5 && ' · Mostrando los 5 primeros; concreta la búsqueda para acotar.'}
            </p>

            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {visiblePlayers.map(player => (
                <div
                  key={player.id}
                  className={`flex min-w-0 items-center justify-between gap-3 px-4 py-3.5 ${CARD_STYLES.item}`}
                >
                  <div className='min-w-0'>
                    {safeHttpUrl(player.photoUrl) && (
                      <img
                        src={safeHttpUrl(player.photoUrl)}
                        alt={`Foto de ${player.firstName} ${player.lastName}`}
                        className='mb-2 h-16 w-16 rounded-xl border border-slate-700 object-cover'
                        loading='lazy'
                      />
                    )}
                    <span className='block break-words text-sm font-bold text-white'>
                      {player.firstName} {player.lastName}
                    </span>
                    <span className='mt-1 block text-xs text-slate-400'>Nacimiento: {player.birthDate || 'Sin fecha'}</span>
                    {safeHttpUrl(player.dniFileUrl) && (
                      <a
                        href={safeHttpUrl(player.dniFileUrl)}
                        target='_blank'
                        rel='noreferrer'
                        className='mt-1 inline-block min-h-11 py-3 text-xs font-semibold text-blue-300 underline'
                      >
                        Ver documento DNI
                      </a>
                    )}
                  </div>
                  <button
                    type='button'
                    onClick={() => handleEdit(player)}
                    className='min-h-11 shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800'
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
