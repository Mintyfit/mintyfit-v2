'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ dark: false, toggle: () => {} })

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false)

  // On mount: read localStorage preference, fallback to OS preference
  useEffect(() => {
    const stored = localStorage.getItem('mintyfit-theme')
    if (stored) {
      setDark(stored === 'dark')
    } else {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  // Apply / remove .dark class on <html> whenever dark changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  function toggle() {
    setDark(prev => {
      const next = !prev
      localStorage.setItem('mintyfit-theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
