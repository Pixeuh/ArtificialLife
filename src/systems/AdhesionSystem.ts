import type { World } from '../core/World'
import { cellBoundaryExtents, supportRadius } from '../organisms/CellGeometry'
import type { TerrainMap } from '../environment/terrain/TerrainMap'

/** Enforces distance constraints after movement and removes overstretched bonds. */
export class AdhesionSystem {
  static constrain(world: World, terrain?: TerrainMap): number {
    const cells = new Map(world.organisms.map(cell => [cell.id, cell]))
    let write = 0
    let broken = 0
    for (const link of world.links) {
      const a = cells.get(link.cellAId)
      const b = cells.get(link.cellBId)
      if (!a || !b) { broken += 1; continue }
      let dx = b.x - a.x
      let dy = b.y - a.y
      let distance = Math.hypot(dx, dy)
      let nx: number
      let ny: number
      if (distance < Number.EPSILON) {
        nx = Math.cos(a.direction)
        ny = Math.sin(a.direction)
      } else {
        nx = dx / distance
        ny = dy / distance
      }
      const targetLength = Math.max(link.restLength, supportRadius(a, nx, ny) + supportRadius(b, -nx, -ny) + 0.1)
      const breakDistance = Math.max(link.breakDistance, targetLength * (1 + link.strength * 0.75))
      if (distance > breakDistance) { broken += 1; continue }

      // Move both cells toward their inherited bond length, preserving cell identity.
      const correction = (distance - targetLength) * 0.5
      const correctionX = nx * correction
      const correctionY = ny * correction
      const extentA = cellBoundaryExtents(a)
      const extentB = cellBoundaryExtents(b)
      a.x = clampToWorld(a.x + correctionX, extentA.x, world.width)
      a.y = clampToWorld(a.y + correctionY, extentA.y, world.height)
      b.x = clampToWorld(b.x - correctionX, extentB.x, world.width)
      b.y = clampToWorld(b.y - correctionY, extentB.y, world.height)
      terrain?.constrainOrganism(a)
      terrain?.constrainOrganism(b)
      if (Math.hypot(b.x - a.x, b.y - a.y) > breakDistance) { broken += 1; continue }
      world.links[write++] = link
    }
    world.links.length = write
    return broken
  }

  static removeDangling(world: World): number {
    const cells = new Set(world.organisms.map(cell => cell.id))
    let write = 0
    for (const link of world.links) {
      if (!cells.has(link.cellAId) || !cells.has(link.cellBId)) continue
      world.links[write++] = link
    }
    const removed = world.links.length - write
    world.links.length = write
    return removed
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (maximum < minimum) return (maximum + minimum) / 2
  return Math.max(minimum, Math.min(maximum, value))
}

function clampToWorld(value: number, extent: number, dimension: number): number {
  if (dimension <= extent * 2) return dimension / 2
  return clamp(value, extent, dimension - extent)
}
