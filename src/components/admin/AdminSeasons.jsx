import { useState, useEffect } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSeasons() {
      try {
        const data = await fetchApi('/seasons')
        setSeasons(data)
      } catch {
        setError('No se pudieron cargar las temporadas.')
      }
    }
    loadSeasons()
  }, [])

  const handleChange = e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  const handleAddSeason = async e => {
    e.preventDefault()
    const trimmedName = formData.name.trim()
    if (!trimmedName || !formData.startDate || !formData.endDate) return

    setLoading(true)
    setError('')

    try {
      const newSeason = await fetchApi('/seasons', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isCurrent: formData.isCurrent
        })
      })

      setSeasons(prev => [...prev, newSeason])
      setFormData({ name: '', startDate: '', endDate: '', isCurrent: false })
    } catch (err) {
      setError(err.message || 'Error al crear la temporada.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async id => {
    if (window.confirm('¿Estás seguro de eliminar esta temporada?')) {
      try {
        await fetchApi(`/seasons/${id}`, { method: 'DELETE' })
        setSeasons(prev => prev.filter(s => s.id !== id))
      } catch {
        alert('No se pudo eliminar la temporada.')
      }
    }
  }

  return (
    <div className={CARD_STYLES.panel}>
      <div>
        <h3 className='text-lg font-black text-white tracking-wide'>Gestión de Temporadas (Base de Datos)</h3>
        <p className='text-xs text-slate-400 mt-0.5'>Define los periodos oficiales del club.</p>
      </div>

      {error && <div className='bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-center text-xs text-red-400'>{error}</div>}

      <form
        onSubmit={handleAddSeason}
        className='space-y-4'
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end'>
          <Input
            label='Nombre Temporada'
            name='name'
            value={formData.name}
            onChange={handleChange}
            placeholder='Ej: 2026/2027'
            required
          />

          <Input
            label='Fecha Inicio'
            name='startDate'
            type='date'
            value={formData.startDate}
            onChange={handleChange}
            required
          />

          <Input
            label='Fecha Fin'
            name='endDate'
            type='date'
            value={formData.endDate}
            onChange={handleChange}
            required
          />

          <div className='flex items-center space-x-2 py-3'>
            <input
              type='checkbox'
              name='isCurrent'
              id='isCurrent'
              checked={formData.isCurrent}
              onChange={handleChange}
              className='w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-600 cursor-pointer'
            />
            <label
              htmlFor='isCurrent'
              className='text-xs font-bold uppercase tracking-wider text-slate-400 cursor-pointer'
            >
              ¿Temporada Activa?
            </label>
          </div>
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-50'
        >
          {loading ? 'Guardando...' : 'Añadir Temporada'}
        </button>
      </form>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2'>
        {seasons.map(season => (
          <div
            key={season.id}
            className={`flex items-center justify-between px-4 py-3.5 ${CARD_STYLES.item}`}
          >
            <div>
              <span className='text-sm font-bold text-white block'>
                {season.name}{' '}
                {season.isCurrent && <span className='text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-2'>Activa</span>}
              </span>
              <span className='text-[10px] text-slate-400 block mt-0.5'>
                Del {season.startDate} al {season.endDate}
              </span>
            </div>
            <button
              onClick={() => handleDelete(season.id)}
              className={CARD_STYLES.actionDelete}
              title='Eliminar temporada'
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
