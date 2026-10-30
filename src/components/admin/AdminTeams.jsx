import { useState, useEffect } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

export default function AdminTeams() {
  const [teams, setTeams] = useState([])
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    seasonId: '', // UUID por defecto o configurable
    groupName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [teamsData, categoriesData] = await Promise.all([fetchApi('/teams'), fetchApi('/categories')])
        setTeams(teamsData)
        setCategories(categoriesData)
        if (categoriesData.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: categoriesData[0].id }))
        }
      } catch {
        setError('No se pudieron cargar los datos iniciales desde el servidor.')
      }
    }
    loadInitialData()
  }, [])

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAddTeam = async e => {
    e.preventDefault()
    const trimmedName = formData.name.trim()
    if (!trimmedName || !formData.categoryId) return

    setLoading(true)
    setError('')

    try {
      const newTeam = await fetchApi('/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          categoryId: formData.categoryId,
          seasonId: formData.seasonId,
          groupName: formData.groupName.trim()
        })
      })

      setTeams(prev => [...prev, newTeam])
      setFormData(prev => ({ ...prev, name: '', groupName: '' }))
    } catch (err) {
      setError(err.message || 'Error al crear el equipo.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async id => {
    if (window.confirm('¿Estás seguro de eliminar este equipo?')) {
      try {
        await fetchApi(`/teams/${id}`, { method: 'DELETE' })
        setTeams(prev => prev.filter(t => t.id !== id))
      } catch {
        alert('No se pudo eliminar el equipo.')
      }
    }
  }

  return (
    <div className={CARD_STYLES.panel}>
      <div>
        <h3 className='text-lg font-black text-white tracking-wide'>Gestión de Equipos (Base de Datos)</h3>
        <p className='text-xs text-slate-400 mt-0.5'>Añade o elimina los equipos oficiales del club vinculados a sus categorías.</p>
      </div>

      {error && <div className='bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-center text-xs text-red-400'>{error}</div>}

      <form
        onSubmit={handleAddTeam}
        className='space-y-4'
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end'>
          <Input
            label='Nombre del Equipo'
            name='name'
            value={formData.name}
            onChange={handleChange}
            placeholder='Ej: CD Oropesa Cadete A'
            required
          />

          <div className='space-y-1.5'>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-400'>Categoría</label>
            <select
              name='categoryId'
              value={formData.categoryId}
              onChange={handleChange}
              className='w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition cursor-pointer'
              required
            >
              {categories.map(cat => (
                <option
                  key={cat.id}
                  value={cat.id}
                >
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label='Grupo'
            name='groupName'
            value={formData.groupName}
            onChange={handleChange}
            placeholder='Ej: Grupo 1 Provincial'
          />

          <Input
            label='ID de Temporada'
            name='seasonId'
            value={formData.seasonId}
            onChange={handleChange}
            placeholder='UUID de Temporada'
            required
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-50'
        >
          {loading ? 'Guardando...' : 'Añadir Equipo'}
        </button>
      </form>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2'>
        {teams.map(team => {
          const categoryObj = categories.find(c => c.id === team.categoryId)
          return (
            <div
              key={team.id}
              className={`flex items-center justify-between px-4 py-3.5 ${CARD_STYLES.item}`}
            >
              <div>
                <span className='text-sm font-bold text-white block'>{team.name}</span>
                <span className='text-[10px] text-slate-400 block mt-0.5'>
                  {team.groupName || 'Sin grupo'} • {categoryObj ? categoryObj.name : 'Categoría general'}
                </span>
              </div>
              <button
                onClick={() => handleDelete(team.id)}
                className={CARD_STYLES.actionDelete}
                title='Eliminar equipo'
              >
                🗑️
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
