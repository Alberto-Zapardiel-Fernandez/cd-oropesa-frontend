import { useState } from 'react'
import MatchCard from './MatchCard'
import AdminMatchForm from '../admin/AdminMatchForm'
import AdminCategories from '../admin/AdminCategories'
import AdminTeams from '../admin/AdminTeams'

export default function MatchesSection({ isAdmin }) {
  const [matches, setMatches] = useState([
    {
      id: 1,
      category: 'Benjamines',
      homeTeam: 'CD Oropesa',
      awayTeam: 'CF Talavera A',
      date: 'Sábado 7',
      time: '10:00',
      location: 'Municipal de Oropesa'
    },
    {
      id: 2,
      category: 'Alevines',
      homeTeam: 'CD Oropesa',
      awayTeam: 'EMD Navalmoral',
      date: 'Sábado 7',
      time: '11:30',
      location: 'Municipal de Oropesa'
    }
  ])

  const [adminTab, setAdminTab] = useState('MATCHES')
  const [filterCategory, setFilterCategory] = useState('TODOS')

  const handleNewMatchCreated = newMatch => {
    setMatches(prev => [...prev, { ...newMatch, id: Date.now() }])
  }

  const handleDeleteMatch = id => {
    setMatches(prev => prev.filter(m => m.id !== id))
  }

  const filteredMatches = filterCategory === 'TODOS' ? matches : matches.filter(m => m.category.toUpperCase().includes(filterCategory.toUpperCase()))

  return (
    <div className='space-y-8'>
      {/* PESTAÑAS DE ADMINISTRACIÓN CON COLORES ESTÁNDAR Y LIMPIOS */}
      {isAdmin && (
        <section className='space-y-4'>
          <div className='flex flex-wrap gap-2 border-b border-slate-800 pb-3'>
            <button
              onClick={() => setAdminTab('MATCHES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                adminTab === 'MATCHES'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              ➕ Nuevo Partido
            </button>
            <button
              onClick={() => setAdminTab('CATEGORIES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                adminTab === 'CATEGORIES'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              📁 Categorías
            </button>
            <button
              onClick={() => setAdminTab('TEAMS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                adminTab === 'TEAMS'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🛡️ Equipos
            </button>
          </div>

          {/* Paneles de Admin */}
          {adminTab === 'MATCHES' && <AdminMatchForm onMatchCreated={handleNewMatchCreated} />}
          {adminTab === 'CATEGORIES' && <AdminCategories />}
          {adminTab === 'TEAMS' && <AdminTeams />}
        </section>
      )}

      {/* VISTA DEL CALENDARIO DE PARTIDOS */}
      <section className='space-y-6'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl'>
          <div>
            <h2 className='text-2xl font-black text-white tracking-tight'>Calendario de Partidos</h2>
            <p className='text-slate-400 text-xs mt-1'>Encuentros oficiales programados para todas las categorías.</p>
          </div>

          {/* Botones de Filtro por Categoría */}
          <div className='flex flex-wrap gap-2'>
            {['TODOS', 'Benjamines', 'Alevines', 'Infantiles', 'Cadetes'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <div className='bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm'>
            No hay partidos registrados para esta categoría.
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {filteredMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onDelete={handleDeleteMatch}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
