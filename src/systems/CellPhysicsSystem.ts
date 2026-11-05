import type { Organism } from '../organisms/Organism'
import { cellBoundaryExtents, supportRadius } from '../organisms/CellGeometry'
import { SpatialHashGrid } from './SpatialHashGrid'
import type { TerrainMap } from '../environment/terrain/TerrainMap'

export interface CollisionResolution { readonly candidatePairs: number; readonly resolvedPairs: number }
interface Pair { readonly first: number; readonly second: number }

/** Resolves oriented-ellipse contacts with a uniform spatial hash and three relaxed passes. */
export class CellPhysicsSystem {
  static resolve(organisms: readonly Organism[], width: number, height: number, passes = 2, terrain?: TerrainMap): CollisionResolution {
    if (organisms.length < 2) return { candidatePairs: 0, resolvedPairs: 0 }
    let candidatePairs = 0
    let resolvedPairs = 0
    for (let iteration = 0; iteration < passes; iteration += 1) {
      const pairs = findCandidatePairs(organisms)
      candidatePairs += pairs.length
      for (const pair of pairs) {
        const a = organisms[pair.first]
        const b = organisms[pair.second]
        let dx = b.x - a.x
        let dy = b.y - a.y
        let distance = Math.hypot(dx, dy)
        if (distance < Number.EPSILON) {
          const angle = stablePairAngle(a.id, b.id)
          dx = Math.cos(angle)
          dy = Math.sin(angle)
          distance = 1
        }
        const nx = dx / distance
        const ny = dy / distance
        const minimumDistance = supportRadius(a, nx, ny) + supportRadius(b, -nx, -ny)
        const overlap = minimumDistance - distance
        if (overlap <= 1e-4) continue
        resolvedPairs += 1
        const correction = overlap * 0.48
        a.x -= nx * correction
        a.y -= ny * correction
        b.x += nx * correction
        b.y += ny * correction
        clampToWorld(a, width, height)
        clampToWorld(b, width, height)
        terrain?.constrainOrganism(a)
        terrain?.constrainOrganism(b)
      }
    }
    return { candidatePairs, resolvedPairs }
  }
}

function findCandidatePairs(cells: readonly Organism[]): Pair[] {
  let maxExtent = 1
  for (const cell of cells) {
    const extents = cellBoundaryExtents(cell)
    maxExtent = Math.max(maxExtent, extents.x, extents.y)
  }
  const grid = new SpatialHashGrid(maxExtent * 2)
  grid.rebuild(cells)
  const nearby: number[] = []
  const pairs: Pair[] = []
  for (let first = 0; first < cells.length; first += 1) {
    const cell = cells[first]
    grid.query(cell.x, cell.y, maxExtent * 2, nearby)
    for (const second of nearby) if (second > first) pairs.push({ first, second })
  }
  return pairs
}

function clampToWorld(cell: Organism, width: number, height: number): void {
  const extents = cellBoundaryExtents(cell)
  cell.x = clamp(cell.x, Math.min(extents.x, width / 2), Math.max(width - extents.x, width / 2))
  cell.y = clamp(cell.y, Math.min(extents.y, height / 2), Math.max(height - extents.y, height / 2))
}

function stablePairAngle(first: string, second: string): number {
  const key = first + '|' + second
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619)
  return ((hash >>> 0) / 0x1_0000_0000) * Math.PI * 2
}

function clamp(value: number, minimum: number, maximum: number): number { return Math.max(minimum, Math.min(maximum, value)) }
