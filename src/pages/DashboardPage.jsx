import { useState } from 'react'
import MatchesSection from '../components/matches/MatchesSection'
import AdminCategories from '../components/admin/AdminCategories' // Ajustado con la ruta real
import AdminTeams from '../components/admin/AdminTeams'
import AdminSeasons from '../components/admin/AdminSeasons'

export default function DashboardPage({ onLogout }) {
  const [isAdmin] = useState(true)
  const [activeNav, setActiveNav] = useState('MATCHES')
  const [adminTab, setAdminTab] = useState('CATEGORIES')

  return (
    <div className='min-h-screen bg-slate-950 text-white flex flex-col'>
      {/* Header Corporativo */}
      <header className='bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg'>
        <div className='flex items-center space-x-6'>
          <div className='flex items-center space-x-3'>
            <div className='w-9 h-9 relative bg-white rounded-xl p-1 shadow-md border border-slate-700 flex items-center justify-center overflow-hidden'>
              <img
                src='/escudo.png'
                alt='Escudo'
                className='object-contain w-full h-full'
              />
            </div>
            <div>
              <h1 className='text-sm font-black tracking-wide text-white'>CD OROPESA</h1>
              <p className='text-[10px] text-blue-400 font-bold uppercase tracking-wider'>Gestión Club</p>
            </div>
          </div>

          <nav className='hidden md:flex space-x-1 pl-4 border-l border-slate-800'>
            <button
              onClick={() => setActiveNav('MATCHES')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeNav === 'MATCHES' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              📅 Partidos
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveNav('ADMIN')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeNav === 'ADMIN' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚙️ Administración
              </button>
            )}
          </nav>
        </div>

        <div className='flex items-center space-x-4'>
          <span className='text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700'>
            Rol: <strong className='text-blue-400'>{isAdmin ? 'Administrador' : 'Coordinador'}</strong>
          </span>
          <button
            onClick={onLogout}
            className='text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500/20 transition font-semibold cursor-pointer'
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Vista principal dinámica */}
      <main className='flex-1 p-6 max-w-7xl mx-auto w-full space-y-6'>
        {activeNav === 'MATCHES' && <MatchesSection isAdmin={isAdmin} />}

        {activeNav === 'ADMIN' && isAdmin && (
          <div className='space-y-6'>
            <div className='flex items-center space-x-2 border-b border-slate-800 pb-3'>
              <button
                onClick={() => setAdminTab('CATEGORIES')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  adminTab === 'CATEGORIES' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                📁 Categorías
              </button>
              <button
                onClick={() => setAdminTab('TEAMS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  adminTab === 'TEAMS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                🛡️ Equipos
              </button>
              <button
                onClick={() => setAdminTab('SEASONS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  adminTab === 'SEASONS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                📅 Temporadas
              </button>
            </div>

            {adminTab === 'CATEGORIES' && <AdminCategories />}
            {adminTab === 'TEAMS' && <AdminTeams />}
            {adminTab === 'SEASONS' && <AdminSeasons />}
          </div>
        )}
      </main>
    </div>
  )
}
