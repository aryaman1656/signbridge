/**
 * context/AuthContext.jsx
 * Manages user authentication state using real Google OAuth tokens.
 */

import React, { createContext, useContext, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  // Called when Google login succeeds — pass the credential response from GoogleLogin
  const login = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      setUser({
        name:    decoded.name,
        email:   decoded.email,
        photo:   decoded.picture,
        token:   credentialResponse.credential,
      })
    } catch (err) {
      console.error('Failed to decode Google token:', err)
    }
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
