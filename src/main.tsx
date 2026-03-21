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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
