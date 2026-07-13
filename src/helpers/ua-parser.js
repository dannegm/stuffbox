const BROWSER_PATTERNS = [
  { pattern: /edg\//i, name: 'edge' },
  { pattern: /opr\//i, name: 'opera' },
  { pattern: /chrome/i, name: 'chrome' },
  { pattern: /firefox/i, name: 'firefox' },
  { pattern: /safari/i, name: 'safari' },
]

const OS_PATTERNS = [
  { pattern: /windows/i, name: 'windows' },
  { pattern: /iphone|ipad/i, name: 'ios' },
  { pattern: /android/i, name: 'android' },
  { pattern: /mac os x|macos|macintosh/i, name: 'macos' },
  { pattern: /cros/i, name: 'chromeos' },
  { pattern: /linux/i, name: 'linux' },
]

const BOT_PATTERN = /bot|crawler|spider|headless/i

// stuffbox has no public/anon content, so unlike bins there's no per-vendor
// bot attribution — this is only here so data-device can fall back to 'bot'
// for the rare crawler that hits an /i or /l deep link.
export const parseUA = (ua) => {
  if (!ua) return { browser: 'unknown', os: 'unknown', device: 'unknown' }

  const browser = BROWSER_PATTERNS.find((b) => b.pattern.test(ua))?.name ?? 'unknown'
  const os = OS_PATTERNS.find((o) => o.pattern.test(ua))?.name ?? 'unknown'

  if (BOT_PATTERN.test(ua)) return { browser, os, device: 'bot' }

  let device = 'desktop'
  if (/tablet|ipad/i.test(ua)) device = 'tablet'
  else if (/mobile|iphone|android/i.test(ua)) device = 'mobile'

  return { browser, os, device }
}
