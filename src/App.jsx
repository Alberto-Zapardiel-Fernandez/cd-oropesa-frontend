import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  // Inicializamos el estado directamente leyendo localStorage de forma limpia y síncrona al cargar
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('authToken')
  })

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userRole')
    setIsAuthenticated(false)
  }

  return isAuthenticated ? <DashboardPage onLogout={handleLogout} /> : <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
}
