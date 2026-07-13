'use client'

import { useEffect } from 'react'
import { useSettings } from '@/hooks/use-settings'

// Local setting: 'system' (default) | 'light' | 'dark'. Resolves to the
// shadcn-standard .dark class on <html> — 'system' tracks the OS preference
// live via matchMedia, no polling.
export const ThemeProvider = ({ children }) => {
  const [theme] = useSettings('theme', 'system')

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', isDark)
    }

    apply()

    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return children
}
