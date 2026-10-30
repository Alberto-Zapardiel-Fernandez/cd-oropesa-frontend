export default function DashboardPage({ onLogout }) {
  return (
    <div className='min-h-screen bg-slate-950 text-white flex flex-col'>
      <header className='bg-slate-900/90 backdrop-blur-md border-b border-red-500/20 px-6 py-4 flex justify-between items-center shadow-lg'>
        <div className='flex items-center space-x-3'>
          <div className='w-9 h-9 relative bg-white rounded-xl p-1 shadow-md border border-red-600/30 flex items-center justify-center overflow-hidden'>
            <img
              src='/escudo.png'
              alt='Escudo'
              className='object-contain w-full h-full'
              onError={e => {
                e.target.src = '/escudo.jpg'
              }}
            />
          </div>
          <div>
            <h1 className='text-sm font-black tracking-wide text-white'>CD OROPESA</h1>
            <p className='text-[10px] text-red-400 font-bold uppercase tracking-wider'>Panel de Gestión</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className='text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500/20 transition font-semibold'
        >
          Cerrar Sesión
        </button>
      </header>

      <main className='flex-1 p-6 max-w-7xl mx-auto w-full'>
        <div className='bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-3'>
          <h2 className='text-xl font-bold'>¡Bienvenido al panel de control!</h2>
          <p className='text-slate-400 text-sm'>
            El entorno está perfectamente configurado con los colores corporativos, la identidad visual del club y conectado con éxito a Spring Boot.
          </p>
        </div>
      </main>
    </div>
  )
}
