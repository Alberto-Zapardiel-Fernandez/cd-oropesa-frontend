import { useState, useEffect } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

// Diccionario para traducir los géneros del backend al castellano
const GENDER_TRANSLATIONS = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  MIXED: 'Mixto'
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    gender: 'MALE',
    minAge: '',
    maxAge: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchApi('/categories')
        setCategories(data)
      } catch {
        setError('No se pudieron cargar las categorías desde el servidor.')
      }
    }
    loadCategories()
  }, [])

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAddCategory = async e => {
    e.preventDefault()
    const trimmedName = formData.name.trim()
    if (!trimmedName) return

    // Verificación en el frontend para evitar duplicados idénticos por nombre
    const exists = categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())
    if (exists) {
      setError('Ya existe una categoría registrada con ese nombre.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const newCat = await fetchApi('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          gender: formData.gender,
          minAge: Number(formData.minAge) || 0,
          maxAge: Number(formData.maxAge) || 0
        })
      })

      setCategories(prev => [...prev, newCat])
      setFormData({ name: '', gender: 'MALE', minAge: '', maxAge: '' })
    } catch (err) {
      setError(err.message || 'Error al crear la categoría.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async id => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        await fetchApi(`/categories/${id}`, { method: 'DELETE' })
        setCategories(prev => prev.filter(c => c.id !== id))
      } catch {
        alert('No se pudo eliminar la categoría.')
      }
    }
  }

  return (
    <div className={CARD_STYLES.panel}>
      <div>
        <h3 className='text-lg font-black text-white tracking-wide'>Gestión de Categorías (Base de Datos)</h3>
        <p className='text-xs text-slate-400 mt-0.5'>Añade o elimina las categorías oficiales sincronizadas con Spring Boot.</p>
      </div>

      {error && <div className='bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-center text-xs text-red-400'>{error}</div>}

      <form
        onSubmit={handleAddCategory}
        className='space-y-4'
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end'>
          <Input
            label='Nombre'
            name='name'
            value={formData.name}
            onChange={handleChange}
            placeholder='Ej: Cadete A'
            required
          />

          <div className='space-y-1.5'>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-400'>Género</label>
            <select
              name='gender'
              value={formData.gender}
              onChange={handleChange}
              className='w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition cursor-pointer'
            >
              <option value='MALE'>Masculino</option>
              <option value='FEMALE'>Femenino</option>
              <option value='MIXED'>Mixto</option>
            </select>
          </div>

          <Input
            label='Edad Mínima'
            name='minAge'
            type='number'
            value={formData.minAge}
            onChange={handleChange}
            placeholder='Ej: 14'
          />

          <Input
            label='Edad Máxima'
            name='maxAge'
            type='number'
            value={formData.maxAge}
            onChange={handleChange}
            placeholder='Ej: 16'
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-50'
        >
          {loading ? 'Guardando...' : 'Añadir Categoría'}
        </button>
      </form>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2'>
        {categories.map(cat => (
          <div
            key={cat.id}
            className={`flex items-center justify-between px-4 py-3.5 ${CARD_STYLES.item}`}
          >
            <div>
              <span className='text-sm font-bold text-white block'>{cat.name}</span>
              <span className='text-[10px] text-slate-400 block mt-0.5'>
                {GENDER_TRANSLATIONS[cat.gender] || cat.gender}
                {cat.minAge > 0 && cat.maxAge > 0 ? ` • ${cat.minAge}-${cat.maxAge} años` : ''}
              </span>
            </div>
            <button
              onClick={() => handleDelete(cat.id)}
              className={CARD_STYLES.actionDelete}
              title='Eliminar categoría'
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
