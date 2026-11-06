import type { Point } from '../core/types'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4
export const WORLD_SCALE = 0.14

/** Camera offset is measured in screen pixels; world units are scaled by zoom. */
export class Camera {
  zoom = 1
  offset: Point = { x: 0, y: 0 }

  worldToScreen(point: Point, viewport: Point): Point {
    const scale = WORLD_SCALE * this.zoom
    return { x: viewport.x / 2 + this.offset.x + point.x * scale, y: viewport.y / 2 + this.offset.y + point.y * scale }
  }

  screenToWorld(point: Point, viewport: Point): Point {
    const scale = WORLD_SCALE * this.zoom
    return { x: (point.x - viewport.x / 2 - this.offset.x) / scale, y: (point.y - viewport.y / 2 - this.offset.y) / scale }
  }

  pan(dx: number, dy: number): void {
    this.offset = { x: this.offset.x + dx, y: this.offset.y + dy }
  }

  zoomAt(factor: number, cursor: Point, viewport: Point): void {
    const before = this.screenToWorld(cursor, viewport)
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor))
    const scale = WORLD_SCALE * this.zoom
    this.offset = { x: cursor.x - viewport.x / 2 - before.x * scale, y: cursor.y - viewport.y / 2 - before.y * scale }
  }

  reset(): void {
    this.zoom = 1
    this.offset = { x: 0, y: 0 }
  }

  centerOnWorld(width: number, height: number): void {
    this.zoom = 1
    this.offset = { x: -width * WORLD_SCALE / 2, y: -height * WORLD_SCALE / 2 }
  }

  follow(point: Point): void {
    const scale = WORLD_SCALE * this.zoom
    this.offset = { x: -point.x * scale, y: -point.y * scale }
  }
}
