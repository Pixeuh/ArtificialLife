import type { WorldConfig } from '../core/types'
import type { FoodResource } from '../environment/FoodResource'
import type { Organism } from '../organisms/Organism'
import { cellBoundaryExtents, getCellAxes, supportRadius } from '../organisms/CellGeometry'
import { SpatialHashGrid } from './SpatialHashGrid'

export interface FeedingMetrics { candidateChecks: number; blockerChecks: number }

/** Organisms are processed by stable array order; the first touching organism claims each food item. */
export class FeedingSystem {
  static update(organisms: Organism[], resources: FoodResource[], config: WorldConfig, metrics?: FeedingMetrics, functionalDifferentiation = true): number {
    if (metrics) { metrics.candidateChecks = 0; metrics.blockerChecks = 0 }
    let maxExtent = 1
    for (const organism of organisms) {
      const extent = cellBoundaryExtents(organism)
      maxExtent = Math.max(maxExtent, extent.x, extent.y)
    }
    const grid = new SpatialHashGrid(maxExtent * 2)
    grid.rebuild(organisms)
    const candidates: number[] = []
    let writeIndex = 0
    let eatenCount = 0
    for (let resourceIndex = 0; resourceIndex < resources.length; resourceIndex += 1) {
      const resource = resources[resourceIndex]
      let consumed = false
      // Include cells beside the source-to-target segment as possible occluders.
      grid.query(resource.x, resource.y, resource.radius + maxExtent * 2, candidates)
      for (const candidateIndex of candidates) {
        if (metrics) metrics.candidateChecks += 1
        const organism = organisms[candidateIndex]
        if (!organism.active) continue
        const dx = organism.x - resource.x
        const dy = organism.y - resource.y
        const distance = Math.hypot(dx, dy)
        const bodyReach = distance < Number.EPSILON ? organism.radius : supportRadius(organism, dx / distance, dy / distance)
        const reach = resource.radius + bodyReach * (functionalDifferentiation ? 0.8 + 0.4 * organism.expression.foraging : 1)
        if (dx * dx + dy * dy <= reach * reach) {
          if (!hasNutrientAccess(organism, resource.x, resource.y, organisms, candidates, metrics)) continue
          organism.energy = Math.min(organism.maxEnergy, config.maxEnergy, finiteEnergy(organism.energy) + finiteEnergy(resource.energy))
          organism.foodConsumed += 1
          eatenCount += 1
          consumed = true
          break
        }
      }
      if (!consumed) resources[writeIndex++] = resource
    }
    resources.length = writeIndex
    return eatenCount
  }
}

/** A cell can consume a resource only if no other cell blocks the center-to-center ray. */
function hasNutrientAccess(target: Organism, sourceX: number, sourceY: number, organisms: readonly Organism[], candidates: readonly number[], metrics?: FeedingMetrics): boolean {
  const dx = target.x - sourceX
  const dy = target.y - sourceY
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared < Number.EPSILON) return true
  for (const index of candidates) {
    if (metrics) metrics.blockerChecks += 1
    const blocker = organisms[index]
    if (blocker === target || !blocker.active) continue
    const t = ((blocker.x - sourceX) * dx + (blocker.y - sourceY) * dy) / lengthSquared
    if (t <= 0 || t >= 1) continue
    const closestX = sourceX + t * dx
    const closestY = sourceY + t * dy
    const cosine = Math.cos(blocker.direction)
    const sine = Math.sin(blocker.direction)
    const localX = (closestX - blocker.x) * cosine + (closestY - blocker.y) * sine
    const localY = -(closestX - blocker.x) * sine + (closestY - blocker.y) * cosine
    const axes = getCellAxes(blocker)
    if ((localX / axes.radiusX) ** 2 + (localY / axes.radiusY) ** 2 <= 1) return false
  }
  return true
}

function finiteEnergy(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}
