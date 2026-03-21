import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { THEME } from './constants'
import App from './App.tsx'

// Inject theme colors as CSS custom properties (single source of truth)
const root = document.documentElement
root.style.setProperty('--bg', THEME.bg)
root.style.setProperty('--surface', THEME.surface)
root.style.setProperty('--text', THEME.text)
root.style.setProperty('--text-muted', THEME.textMuted)
root.style.setProperty('--accent', THEME.accent)
root.style.setProperty('--accent-dim', THEME.accentDim)
root.style.setProperty('--accent-secondary', THEME.accentSecondary)
root.style.setProperty('--accent-secondary-dim', THEME.accentSecondaryDim)
root.style.setProperty('--border', THEME.border)

// Type scale (Major Third, ratio 1.25, base 14px)
root.style.setProperty('--text-xs', '11.2px')
root.style.setProperty('--text-sm', '12.25px')
root.style.setProperty('--text-base', '14px')
root.style.setProperty('--text-lg', '17.5px')
root.style.setProperty('--text-xl', '21.9px')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
