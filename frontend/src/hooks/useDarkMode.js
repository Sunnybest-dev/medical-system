import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('mediai-theme')
    if (stored) return stored === 'dark'
    return false // default light mode — user must opt in to dark
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('mediai-theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('mediai-theme', 'light')
    }
  }, [dark])

  return [dark, setDark]
}
