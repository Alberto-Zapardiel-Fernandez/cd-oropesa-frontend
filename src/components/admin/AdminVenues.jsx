import { useEffect, useState } from 'react'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

const EMPTY_FORM = {
  name: '',
  address: '',
  city: '',
  isHomeVenue: false,
  surfaceType: '',
  googleMapsUrl: '',
  imageUrl: '',
  notes: ''
}

const INPUT_STYLES =
  'w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600'

function getVenueBody(form) {
  return {
    name: form.name.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    isHomeVenue: form.isHomeVenue,
    surfaceType: form.surfaceType.trim(),
    googleMapsUrl: form.googleMapsUrl.trim(),
    imageUrl: form.imageUrl.trim(),
    notes: form.notes.trim()
  }
}

export default function AdminVenues() {
  const [venues, setVenues] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadVenues() {
      try {
        const data = await fetchApi('/venues')
        setVenues(data)
      } catch (err) {
        setError(err.message || 'No se pudieron cargar las instalaciones.')
      } finally {
        setLoading(false)
      }
    }

    loadVenues()
  }, [])

  const handleChange = event => {
    const { name, value, type, checked } = event.target
    setForm(current => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setMessage('')

    const body = getVenueBody(form)

    if (!body.name || !body.city) {
      setError('El nombre y la ciudad son obligatorios.')
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        const updatedVenue = await fetchApi(`/venues/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        })

        setVenues(current => current.map(venue => (venue.id === editingId ? updatedVenue : venue)))
        setMessage('Instalación actualizada correctamente.')
      } else {
        const newVenue = await fetchApi('/venues', {
          method: 'POST',
          body: JSON.stringify(body)
        })

        setVenues(current => [...current, newVenue])
        setMessage('Instalación creada correctamente.')
      }

      resetForm()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la instalación.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = venue => {
    setError('')
    setMessage('')
    setEditingId(venue.id)
    setForm({
      name: venue.name || '',
      address: venue.address || '',
      city: venue.city || '',
      isHomeVenue: Boolean(venue.isHomeVenue),
      surfaceType: venue.surfaceType || '',
      googleMapsUrl: venue.googleMapsUrl || '',
      imageUrl: venue.imageUrl || '',
      notes: venue.notes || ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async venue => {
    if (!window.confirm(`¿Quieres eliminar "${venue.name}"?`)) return

    setError('')
    setMessage('')

    try {
      await fetchApi(`/venues/${venue.id}`, { method: 'DELETE' })
      setVenues(current => current.filter(item => item.id !== venue.id))

      if (editingId === venue.id) {
        resetForm()
      }

      setMessage('Instalación eliminada correctamente.')
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la instalación.')
    }
  }

  return (
    <div className={`${CARD_STYLES.panel} space-y-6`}>
      <div>
        <h3 className='text-lg font-black tracking-wide text-white'>Gestión de instalaciones</h3>
        <p className='mt-1 text-xs text-slate-400'>Añade, consulta, edita o elimina los campos deportivos.</p>
      </div>

      {error && <p className='rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300'>{error}</p>}

      {message && <p className='rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-300'>{message}</p>}

      <form
        onSubmit={handleSubmit}
        className='space-y-4'
      >
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
            Nombre
            <input
              name='name'
              value={form.name}
              onChange={handleChange}
              className={INPUT_STYLES}
              placeholder='Campo Municipal de Oropesa'
              required
            />
          </label>

          <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
            Ciudad
            <input
              name='city'
              value={form.city}
              onChange={handleChange}
              className={INPUT_STYLES}
              placeholder='Oropesa'
              required
            />
          </label>

          <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
            Dirección
            <input
              name='address'
              value={form.address}
              onChange={handleChange}
              className={INPUT_STYLES}
              placeholder='Dirección de la instalación'
            />
          </label>

          <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
            Tipo de superficie
            <input
              name='surfaceType'
              value={form.surfaceType}
              onChange={handleChange}
              className={INPUT_STYLES}
              placeholder='Césped Artificial'
            />
          </label>

          <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
            Google Maps
            <input
              name='googleMapsUrl'
              type='url'
              value={form.googleMapsUrl}
              onChange={handleChange}
              className={INPUT_STYLES}
              placeholder='https://maps.google.com/...'
            />
          </label>

          <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
            URL de imagen
            <input
              name='imageUrl'
              type='url'
              value={form.imageUrl}
              onChange={handleChange}
              className={INPUT_STYLES}
              placeholder='https://...'
            />
          </label>
        </div>

        <label className='flex items-center gap-3 text-sm text-slate-300'>
          <input
            name='isHomeVenue'
            type='checkbox'
            checked={form.isHomeVenue}
            onChange={handleChange}
            className='h-4 w-4 accent-blue-600'
          />
          Es una instalación local del CD Oropesa
        </label>

        <label className='block space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
          Notas
          <textarea
            name='notes'
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className={INPUT_STYLES}
          />
        </label>

        <div className='flex flex-col gap-3 sm:flex-row'>
          <button
            type='submit'
            disabled={saving}
            className='flex-1 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50'
          >
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Añadir instalación'}
          </button>

          {editingId && (
            <button
              type='button'
              onClick={resetForm}
              className='rounded-2xl border border-slate-700 px-6 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800'
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <section className='space-y-3 border-t border-slate-800 pt-5'>
        <h4 className='font-bold text-white'>Instalaciones registradas</h4>

        {loading ? (
          <p className='text-sm text-slate-400'>Cargando instalaciones...</p>
        ) : venues.length === 0 ? (
          <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500'>
            No hay instalaciones registradas.
          </p>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {venues.map(venue => (
              <article
                key={venue.id}
                className={`space-y-3 p-4 ${CARD_STYLES.item}`}
              >
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h5 className='font-bold text-white'>{venue.name}</h5>
                    {venue.isHomeVenue && <span className='rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-bold text-blue-300'>LOCAL</span>}
                  </div>

                  <p className='mt-1 text-xs text-slate-400'>
                    {venue.city}
                    {venue.address ? ` · ${venue.address}` : ''}
                  </p>

                  {venue.surfaceType && <p className='mt-1 text-xs text-slate-400'>Superficie: {venue.surfaceType}</p>}

                  {venue.notes && <p className='mt-2 whitespace-pre-wrap text-xs text-slate-500'>{venue.notes}</p>}
                </div>

                <div className='flex flex-wrap gap-3 text-xs'>
                  {venue.googleMapsUrl && (
                    <a
                      href={venue.googleMapsUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='text-blue-300 hover:text-blue-200'
                    >
                      Ver mapa
                    </a>
                  )}

                  {venue.imageUrl && (
                    <a
                      href={venue.imageUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='text-blue-300 hover:text-blue-200'
                    >
                      Ver imagen
                    </a>
                  )}
                </div>

                <div className='flex gap-2 border-t border-slate-800 pt-3'>
                  <button
                    type='button'
                    onClick={() => handleEdit(venue)}
                    className='flex-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700'
                  >
                    Editar
                  </button>
                  <button
                    type='button'
                    onClick={() => handleDelete(venue)}
                    className='flex-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20'
                  >
                    Borrar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
