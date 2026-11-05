import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { validateSession } from './services/api'

const validRoles = ['ADMIN', 'COORDINATOR', 'COACH', 'VISITOR']

export default function App() {
  const [authStatus, setAuthStatus] = useState(() =>
    localStorage.getItem('authToken') ? 'checking' : 'anonymous'
  )

  useEffect(() => {
    const token = localStorage.getItem('authToken')

    if (!token) {
      localStorage.removeItem('userRole')
      return
    }

    let cancelled = false
    const role = localStorage.getItem('userRole')

    const clearSession = marker => {
      if (cancelled) return

      localStorage.removeItem('authToken')
      localStorage.removeItem('userRole')
      sessionStorage.setItem(marker, 'true')

      setAuthStatus('anonymous')
    }

    validateSession(token)
      .then(response => {
        if (cancelled) return

        if (response.ok && validRoles.includes(role)) {
          setAuthStatus('authenticated')
          return
        }

        clearSession(
          response.status === 401 || response.status === 403 || response.ok
            ? 'sessionExpired'
            : 'sessionValidationFailed'
        )
      })
      .catch(() => clearSession('sessionValidationFailed'))

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userRole')
    setAuthStatus('anonymous')
  }

  if (authStatus === 'checking') {
    return (
      <main className='flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300'>
        Comprobando sesión...
      </main>
    )
  }

  return authStatus === 'authenticated'
    ? <DashboardPage onLogout={handleLogout} />
    : <LoginPage onLoginSuccess={() => setAuthStatus('authenticated')} />
}
