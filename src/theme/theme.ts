export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'artificial-life-theme'

export function resolveTheme(savedTheme: string | null, prefersLight: boolean | undefined): Theme {
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return prefersLight ? 'light' : 'dark'
}

export function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const bootstrapped = document.documentElement.dataset.theme
    if (bootstrapped === 'light' || bootstrapped === 'dark') return bootstrapped
  }

  let savedTheme: string | null = null
  let prefersLight: boolean | undefined
  try {
    savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    // Storage can be disabled by browser privacy settings.
  }
  try {
    prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches
  } catch {
    prefersLight = undefined
  }
  return resolveTheme(savedTheme, prefersLight)
}

export function applyTheme(theme: Theme, persist = false): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f1f5f2' : '#080c10')
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Keep the theme active for this session even when storage is unavailable.
    }
  }
}
