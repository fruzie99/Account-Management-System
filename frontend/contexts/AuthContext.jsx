import { createContext, useContext, useMemo, useState } from 'react'
import { loginRequest, signupRequest } from '../services/api'

const AuthContext = createContext(null)
const STORAGE_KEY = 'auth_data'

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { user: null, session: null }
    }

    const parsed = JSON.parse(raw)
    return {
      user: parsed.user ?? null,
      session: parsed.session ?? null,
    }
  } catch (_error) {
    return { user: null, session: null }
  }
}

export const AuthProvider = ({ children }) => {
  const initialState = readStoredAuth()
  const [user, setUser] = useState(initialState.user)
  const [session, setSession] = useState(initialState.session)

  const persistAuth = (nextUser, nextSession) => {
    setUser(nextUser)
    setSession(nextSession)

    if (nextUser && nextSession) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: nextUser, session: nextSession }),
      )
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const signup = async (payload) => {
    const data = await signupRequest(payload)

    if (data?.user && data?.session) {
      persistAuth(data.user, data.session)
    }

    return data
  }

  const login = async (payload) => {
    const data = await loginRequest(payload)
    persistAuth(data.user, data.session)
    return data
  }

  const logout = () => {
    persistAuth(null, null)
  }

  const value = useMemo(
    () => ({
      user,
      session,
      isAuthenticated: Boolean(user && session?.access_token),
      signup,
      login,
      logout,
    }),
    [user, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}