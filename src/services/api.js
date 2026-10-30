const API_URL = import.meta.env.VITE_API_URL

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

  if (response.status === 401) {
    localStorage.removeItem('authToken')
    window.location.href = '/'
    throw new Error('Sesión caducada. Por favor, vuelve a iniciar sesión.')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Ocurrió un error en la petición.')
  }

  if (response.status === 204) return null

  return response.json()
}
