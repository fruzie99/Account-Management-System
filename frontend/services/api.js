import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

const AUTH_STORAGE_KEY = 'auth_data'

const getAccessToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!raw) {
      return ''
    }

    const parsed = JSON.parse(raw)
    return parsed?.session?.access_token || ''
  } catch (_error) {
    return ''
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export const signupRequest = async (payload) => {
  const { data } = await api.post('/auth/signup', payload)
  return data
}

export const loginRequest = async (payload) => {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export const getDashboardRequest = async () => {
  const { data } = await api.get('/account/dashboard')
  return data
}

export const getStatementRequest = async () => {
  const { data } = await api.get('/account/statement')
  return data
}

export default api