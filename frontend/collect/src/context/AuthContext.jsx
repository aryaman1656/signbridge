/**
 * context/AuthContext.jsx
 * Manages user auth state including admin flags from backend.
 * Auth is persisted in localStorage so login survives page refreshes.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const AuthContext = createContext(null)

const STORAGE_KEY = 'sb_user'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw)
    // Validate the Google JWT hasn't expired
    const decoded = jwtDecode(stored.token)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return stored
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(() => loadStoredUser())
  const [userStats, setUserStats] = useState(null)

  // Restore userStats on mount if we have a stored user
  useEffect(() => {
    if (user?.email) {
      refreshUserStats(user.email)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (credentialResponse) => {
    try {
      const decoded  = jwtDecode(credentialResponse.credential)

      // Register with backend — get back isAdmin + isSuperAdmin flags
      const res  = await fetch(`${API_URL}/auth/google`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: credentialResponse.credential })
      })
      const data = await res.json()

      const newUser = {
        name:         decoded.name,
        email:        decoded.email,
        photo:        decoded.picture,
        token:        credentialResponse.credential,
        isAdmin:      data.isAdmin      ?? false,
        isSuperAdmin: data.isSuperAdmin ?? false,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
      setUser(newUser)

      await refreshUserStats(decoded.email)
    } catch (err) {
      console.error('Login error:', err)
    }
  }

  const refreshUserStats = async (email) => {
    try {
      const res  = await fetch(`${API_URL}/stats/me?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      setUserStats(data)
    } catch (err) {
      console.error('Failed to fetch user stats:', err)
    }
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setUserStats(null)
  }

  return (
    <AuthContext.Provider value={{ user, userStats, login, logout, refreshUserStats }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
