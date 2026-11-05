import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'
import { WorldRenderer } from '../rendering/WorldRenderer'

describe('theme preference', () => {
  it('uses a saved theme before the operating system preference', () => {
    expect(resolveTheme('light', false)).toBe('light')
    expect(resolveTheme('dark', true)).toBe('dark')
  })

  it('uses the system preference when there is no saved choice', () => {
    expect(resolveTheme(null, true)).toBe('light')
    expect(resolveTheme(null, false)).toBe('dark')
  })

  it('defaults to dark when neither source provides a preference', () => {
    expect(resolveTheme(null, undefined)).toBe('dark')
  })

  it('ignores invalid saved values and falls back to the system preference', () => {
    expect(resolveTheme('system', true)).toBe('light')
  })

  it('reads the active canvas palette from CSS custom properties', () => {
    const palette = WorldRenderer.readPalette(name => name === '--canvas-background' ? '#f2f6f3' : '')
    expect(palette.background).toBe('#f2f6f3')
    expect(palette.organism).toBe(WorldRenderer.defaultPalette.organism)
  })
})
