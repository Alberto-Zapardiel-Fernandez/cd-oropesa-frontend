// Servicio centralizado para llamadas HTTP a Spring Boot
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

export async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('authToken')
  const isFormData = options.body instanceof FormData
  const { timeoutMs = 60000, ...requestOptions } = options
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...requestOptions.headers
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...requestOptions,
      headers,
      signal: controller.signal
    })

    // Si el token expira o no estás autorizado
    if (response.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('userRole')
      sessionStorage.setItem('sessionExpired', 'true')
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
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'La petición tardó demasiado y se canceló. Comprueba la conexión e inténtalo de nuevo.',
        { cause: error }
      )
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
