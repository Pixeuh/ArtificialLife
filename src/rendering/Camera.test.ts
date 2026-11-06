import { describe, expect, it } from 'vitest'
import { Camera, MAX_ZOOM, MIN_ZOOM, WORLD_SCALE } from './Camera'

describe('camera viewport fitting', () => {
  it('fits and centers the full world in the available viewport', () => {
    const camera = new Camera()
    camera.fitWorld(4_000, 2_500, { x: 1_000, y: 600 })
    expect(camera.zoom).toBeCloseTo(Math.min(1_000 / (4_000 * WORLD_SCALE), 600 / (2_500 * WORLD_SCALE)) * 0.9)
    const center = camera.worldToScreen({ x: 2_000, y: 1_250 }, { x: 1_000, y: 600 })
    expect(center.x).toBeCloseTo(500)
    expect(center.y).toBeCloseTo(300)
  })

  it('respects zoom limits when fitting extreme worlds and viewports', () => {
    const camera = new Camera()
    camera.fitWorld(1, 1, { x: 10_000, y: 10_000 })
    expect(camera.zoom).toBe(MAX_ZOOM)
    camera.fitWorld(1_000_000, 1_000_000, { x: 100, y: 100 })
    expect(camera.zoom).toBe(MIN_ZOOM)
  })

  it('round-trips screen and world coordinates and keeps the cursor anchor while zooming', () => {
    const camera = new Camera()
    camera.pan(31, -19)
    const viewport = { x: 900, y: 600 }
    const cursor = { x: 273, y: 412 }
    const worldPoint = camera.screenToWorld(cursor, viewport)
    expect(camera.worldToScreen(worldPoint, viewport)).toEqual(cursor)
    camera.zoomAt(1.4, cursor, viewport)
    expect(camera.worldToScreen(worldPoint, viewport).x).toBeCloseTo(cursor.x)
    expect(camera.worldToScreen(worldPoint, viewport).y).toBeCloseTo(cursor.y)
  })
})
