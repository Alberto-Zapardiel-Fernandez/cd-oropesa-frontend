import { useState, useEffect } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

export default function AdminMatchForm({ onMatchCreated }) {
  const [categories, setCategories] = useState([])
  const [teams, setTeams] = useState([])

  const [formData, setFormData] = useState({
    categoryId: '',
    homeTeamId: '',
    awayTeamId: '',
    date: '',
    time: '',
    location: 'Municipal de Oropesa'
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Cargar categorías y equipos reales de la BD al montar el formulario
  useEffect(() => {
    async function loadFormData() {
      try {
        const [catsData, teamsData] = await Promise.all([fetchApi('/categories'), fetchApi('/teams')])
        setCategories(catsData)
        setTeams(teamsData)

        // Seleccionar por defecto el primer elemento si existe para evitar vacíos
        if (catsData.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: catsData[0].id }))
        }
        if (teamsData.length > 0) {
          const localTeam = teamsData.find(t => t.type === 'Local') || teamsData[0]
          setFormData(prev => ({ ...prev, homeTeamId: localTeam.id }))
        }
      } catch (err) {
        setMessage({ text: 'Error al cargar categorías o equipos desde el servidor.', type: 'error', err })
      }
    }
    loadFormData()
  }, [])

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      // Llamada real al endpoint de partidos en Spring Boot
      const savedMatch = await fetchApi('/matches', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      setMessage({ text: '¡Partido registrado con éxito en la base de datos!', type: 'success' })
      if (onMatchCreated) onMatchCreated(savedMatch)

      // Limpiar campos específicos de fecha y hora
      setFormData(prev => ({ ...prev, date: '', time: '' }))
    } catch (err) {
      setMessage({ text: err.message || 'Error al guardar el partido.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={CARD_STYLES.panel}>
      <div className='border-b border-slate-800 pb-4'>
        <h3 className='text-lg font-black text-white tracking-wide'>Panel Admin: Registrar Nuevo Partido</h3>
        <p className='text-xs text-slate-400 mt-0.5'>Selecciona categorías y equipos sincronizados directamente con tu base de datos.</p>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold text-center ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className='space-y-4'
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {/* Selector Dinámico de Categorías */}
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

          <div className='space-y-1.5'>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-400'>Ubicación / Campo</label>
            <input
              type='text'
              name='location'
              required
              value={formData.location}
              onChange={handleChange}
              className='w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {/* Selector Dinámico de Equipo Local */}
          <div className='space-y-1.5'>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-400'>Equipo Local</label>
            <select
              name='homeTeamId'
              value={formData.homeTeamId}
              onChange={handleChange}
              className='w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition cursor-pointer'
              required
            >
              {teams.map(team => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.name} ({team.type})
                </option>
              ))}
            </select>
          </div>

          {/* Selector Dinámico de Equipo Visitante */}
          <div className='space-y-1.5'>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-400'>Equipo Visitante / Rival</label>
            <select
              name='awayTeamId'
              value={formData.awayTeamId}
              onChange={handleChange}
              className='w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition cursor-pointer'
              required
            >
              <option value=''>Selecciona un rival...</option>
              {teams.map(team => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <Input
            label='Fecha'
            name='date'
            required
            value={formData.date}
            placeholder='Ej: Sábado 7'
            onChange={handleChange}
          />
          <Input
            label='Hora'
            name='time'
            required
            value={formData.time}
            placeholder='Ej: 10:00'
            onChange={handleChange}
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold rounded-2xl text-sm shadow-xl shadow-blue-600/20 transition cursor-pointer disabled:opacity-50 mt-2'
        >
          {loading ? 'Guardando partido...' : 'Registrar Partido en el Sistema'}
        </button>
      </form>
    </div>
  )
}
