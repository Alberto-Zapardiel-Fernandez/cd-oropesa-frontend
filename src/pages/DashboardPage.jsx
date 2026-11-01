import { useState } from 'react'
import MatchesSection from '../components/matches/MatchesSection'
import AdminCategories from '../components/admin/AdminCategories'
import AdminTeams from '../components/admin/AdminTeams'
import AdminSeasons from '../components/admin/AdminSeasons'
import AdminVenues from '../components/admin/AdminVenues'
import AdminPlayers from '../components/admin/AdminPlayers'
import AdminTeamRosters from '../components/admin/AdminTeamRosters'
import AdminCoaches from '../components/admin/AdminCoaches'

export default function DashboardPage({ onLogout }) {
  const role = localStorage.getItem('userRole')
  const isAdmin = role === 'ADMIN'

  const roleLabels = {
    ADMIN: 'Administrador',
    COORDINATOR: 'Coordinador',
    COACH: 'Entrenador',
    VISITOR: 'Visitante'
  }
  const [activeNav, setActiveNav] = useState('MATCHES')
  const [adminTab, setAdminTab] = useState('CATEGORIES')
  const [rosterTeamId, setRosterTeamId] = useState('')

  const openTeamRoster = team => {
    setRosterTeamId(team.id)
    setAdminTab('ROSTERS')
    setActiveNav('ADMIN')
  }

  const tabClass = tab =>
    `rounded-xl px-4 py-2 text-xs font-bold transition ${
      adminTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
    }`

  return (
    <div className='flex min-h-screen flex-col bg-slate-950 text-white'>
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-4 shadow-lg backdrop-blur-md sm:px-6'>
        <div className='flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2'>
          <div className='flex items-center space-x-3'>
            <div className='relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-white p-1 shadow-md'>
              <img
                src='/escudo.png'
                alt='Escudo'
                className='h-full w-full object-contain'
              />
            </div>
            <div>
              <h1 className='text-sm font-black tracking-wide text-white'>CD OROPESA</h1>
              <p className='text-[10px] font-bold uppercase tracking-wider text-blue-400'>Gestión Club</p>
            </div>
          </div>

          <nav className='flex flex-wrap items-center gap-1 border-l border-slate-800 pl-3 sm:pl-4'>
            <button
              onClick={() => setActiveNav('MATCHES')}
              className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition ${
                activeNav === 'MATCHES' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              📅 Partidos
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveNav('ADMIN')}
                className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeNav === 'ADMIN' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚙️ Administración
              </button>
            )}
          </nav>
        </div>

        <div className='flex flex-wrap items-center justify-end gap-2'>
          <span className='rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300'>
            Rol: <strong className='text-blue-400'>{roleLabels[role] || 'Sin rol'}</strong>
          </span>
          <button
            onClick={onLogout}
            className='cursor-pointer rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20'
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className='mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6'>
        {activeNav === 'MATCHES' && <MatchesSection isAdmin={isAdmin} />}

        {activeNav === 'ADMIN' && isAdmin && (
          <div className='space-y-6'>
            <div className='flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3'>
              <button
                onClick={() => setAdminTab('CATEGORIES')}
                className={tabClass('CATEGORIES')}
              >
                📁 Categorías
              </button>
              <button
                onClick={() => setAdminTab('TEAMS')}
                className={tabClass('TEAMS')}
              >
                🛡️ Equipos
              </button>
              <button
                onClick={() => setAdminTab('PLAYERS')}
                className={tabClass('PLAYERS')}
              >
                👥 Jugadores
              </button>
              <button
                onClick={() => setAdminTab('COACHES')}
                className={tabClass('COACHES')}
              >
                🧑‍🏫 Cuerpo técnico
              </button>
              <button
                onClick={() => {
                  setRosterTeamId('')
                  setAdminTab('ROSTERS')
                }}
                className={tabClass('ROSTERS')}
              >
                📋 Plantillas
              </button>
              <button
                onClick={() => setAdminTab('SEASONS')}
                className={tabClass('SEASONS')}
              >
                📅 Temporadas
              </button>
              <button
                onClick={() => setAdminTab('VENUES')}
                className={tabClass('VENUES')}
              >
                🏟️ Instalaciones
              </button>
            </div>

            {adminTab === 'CATEGORIES' && <AdminCategories />}
            {adminTab === 'TEAMS' && <AdminTeams onManageRoster={openTeamRoster} />}
            {adminTab === 'PLAYERS' && <AdminPlayers />}
            {adminTab === 'COACHES' && <AdminCoaches />}
            {adminTab === 'ROSTERS' && <AdminTeamRosters initialTeamId={rosterTeamId} />}
            {adminTab === 'SEASONS' && <AdminSeasons />}
            {adminTab === 'VENUES' && <AdminVenues />}
          </div>
        )}
      </main>
    </div>
  )
}
