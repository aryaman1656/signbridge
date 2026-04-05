/**
 * context/AuthContext.jsx
 * Manages user auth state including admin flags from backend.
 */

import React, { createContext, useContext, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [userStats, setUserStats] = useState(null)

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

      setUser({
        name:         decoded.name,
        email:        decoded.email,
        photo:        decoded.picture,
        token:        credentialResponse.credential,
        isAdmin:      data.isAdmin      ?? false,
        isSuperAdmin: data.isSuperAdmin ?? false,
      })

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

  const logout = () => { setUser(null); setUserStats(null) }

  return (
    <AuthContext.Provider value={{ user, userStats, login, logout, refreshUserStats }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
