import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const signupRequest = async (payload) => {
  const { data } = await api.post('/auth/signup', payload)
  return data
}

export const loginRequest = async (payload) => {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export default api