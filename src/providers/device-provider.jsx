'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { parseUA } from '@/helpers/ua-parser'

const toPageSlug = (pathname) => {
  if (pathname === '/') return 'home'
  return pathname.split('/')[1] || 'home'
}

// Sets data-browser/os/device/touch on <html> once, and data-page on every
// navigation — all consumed by the Tailwind custom variants in src/css/variants.css.
export const DeviceProvider = ({ children }) => {
  const pathname = usePathname()

  useEffect(() => {
    const { browser, os, device } = parseUA(navigator.userAgent)
    document.documentElement.setAttribute('data-browser', browser)
    document.documentElement.setAttribute('data-os', os)
    document.documentElement.setAttribute('data-device', device)
    document.documentElement.setAttribute('data-touch', window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-page', toPageSlug(pathname))
  }, [pathname])

  return children
}
