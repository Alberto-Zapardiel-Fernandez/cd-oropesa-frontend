import { useState } from 'react'
import Input from '../components/common/Input'

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        throw new Error('Credenciales incorrectas o usuario no autorizado.')
      }

      const data = await response.json()
      const token = data.token || data.accessToken

      if (!token) throw new Error('No se recibió el token de autenticación.')
      const validRoles = ['ADMIN', 'COORDINATOR', 'COACH', 'VISITOR']

      if (!validRoles.includes(data.role)) {
        throw new Error('El servidor no devolvió un rol válido.')
      }

      localStorage.setItem('authToken', token)
      localStorage.setItem('userRole', data.role)
      onLoginSuccess()
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen w-full flex items-center justify-center bg-linear-to-br from-slate-950 via-red-950/40 to-blue-950/50 p-4'>
      <div className='w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-2xl shadow-red-950/30 space-y-6'>
        {/* Cabecera y Escudo Oficial */}
        <div className='flex flex-col items-center text-center space-y-3'>
          <div className='w-20 h-20 relative bg-white rounded-2xl p-1.5 shadow-xl border-2 border-red-600/30 flex items-center justify-center overflow-hidden'>
            <img
              src='/escudo.png'
              alt='CD Oropesa'
              className='object-contain w-full h-full'
              onError={e => {
                // Fallback por si la extensión cambia a .jpg
                e.target.src = '/escudo.jpg'
              }}
            />
          </div>
          <div>
            <h1 className='text-xl font-black text-white tracking-wider'>CD OROPESA</h1>
            <p className='text-xs text-red-400 font-bold uppercase tracking-widest mt-0.5'>Gestión Oficial</p>
          </div>
        </div>

        {error && (
          <div className='bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 text-center'>
            <p className='text-xs text-red-400 font-semibold'>{error}</p>
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className='space-y-4'
        >
          <Input
            label='Correo electrónico'
            type='email'
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder='nombre@correo.com'
          />

          <Input
            label='Contraseña'
            type='password'
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder='••••••••'
          />

          <button
            type='submit'
            disabled={loading}
            className='w-full mt-2 py-4 bg-linear-to-r from-red-600 to-blue-700 hover:from-red-500 hover:to-blue-600 active:scale-[0.99] text-white font-bold rounded-2xl text-sm shadow-xl shadow-red-600/20 transition disabled:opacity-50'
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className='text-center pt-2'>
          <p className='text-[10px] text-slate-500 uppercase tracking-widest font-semibold'>Fundado en 1923 • Sistema Seguro</p>
        </div>
      </div>
    </div>
  )
}
