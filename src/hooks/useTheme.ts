import { useState, useCallback, useEffect } from 'react'
import { refreshTheme } from '../constants'

type Theme = 'dark' | 'light'

function getCurrentTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getCurrentTheme)

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
    // Allow CSS to recompute, then refresh the JS THEME object
    requestAnimationFrame(() => {
      refreshTheme()
      window.dispatchEvent(new Event('themechange'))
    })
    setThemeState(t)
  }, [])

  const toggle = useCallback(() => {
    setTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setTheme])

  return { theme, toggle }
}
