/**
 * context/LanguageContext.jsx
 * Fetches published languages from backend on mount.
 * Provides session-level language selection, persisted to localStorage.
 */

import React, { createContext, useContext, useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [languages,       setLanguages]       = useState([])
  const [sessionLanguage, setSessionLanguage] = useState(null)
  const [loadingLangs,    setLoadingLangs]    = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/languages/`)
      .then(r => r.json())
      .then(data => {
        setLanguages(data)
        if (data.length > 0) {
          const saved = localStorage.getItem('sb_session_language')
          const valid = data.find(l => l.code === saved)
          setSessionLanguage(valid ? valid.code : data[0].code)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLangs(false))
  }, [])

  const changeSessionLanguage = (code) => {
    setSessionLanguage(code)
    localStorage.setItem('sb_session_language', code)
  }

  return (
    <LanguageContext.Provider value={{ languages, sessionLanguage, changeSessionLanguage, loadingLangs }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
