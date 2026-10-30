// Servicio centralizado para llamadas HTTP a Spring Boot
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

export async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('authToken')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })

  // Si el token expira o no estás autorizado
  if (response.status === 401) {
    localStorage.removeItem('authToken')
    window.location.href = '/' // Redirigir al login
    throw new Error('Sesión caducada. Por favor, vuelve a iniciar sesión.')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Error en el servidor: ${response.status}`)
  }

  // Si la respuesta es vacía (ej: 204 No Content al borrar)
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
