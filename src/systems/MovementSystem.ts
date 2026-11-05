import type { SeededRandom } from '../core/SeededRandom'
import type { WorldConfig } from '../core/types'
import type { Organism } from '../organisms/Organism'
import { cellBoundaryExtents } from '../organisms/CellGeometry'
import type { TerrainMap } from '../environment/terrain/TerrainMap'

/** Applies bounded random turns, then moves and reflects at the rectangular world edges. */
export class MovementSystem {
  static update(organisms: Organism[], width: number, height: number, config: WorldConfig, random: SeededRandom, deltaTime: number, terrain?: TerrainMap): void {
    for (const organism of organisms) {
      if (!organism.active) continue
      organism.age += deltaTime
      organism.direction += (random.next() * 2 - 1) * config.turnRate * deltaTime
      terrain?.constrainOrganism(organism)
      const terrainCost = terrain?.movementCostAt(organism.x, organism.y) ?? 1
      const effectiveSpeed = organism.speed / (Number.isFinite(terrainCost) ? terrainCost : 1)
      const nextX = organism.x + Math.cos(organism.direction) * effectiveSpeed * deltaTime
      const nextY = organism.y + Math.sin(organism.direction) * effectiveSpeed * deltaTime

      const extents = cellBoundaryExtents(organism)
      const minX = Math.min(extents.x, width / 2)
      const maxX = Math.max(width - extents.x, width / 2)
      const minY = Math.min(extents.y, height / 2)
      const maxY = Math.max(height - extents.y, height / 2)
      const boundedX = clamp(nextX, minX, maxX)
      const boundedY = clamp(nextY, minY, maxY)
      if (boundedX !== nextX) organism.direction = Math.PI - organism.direction
      if (boundedY !== nextY) organism.direction = -organism.direction
      if (!terrain || terrain.canOccupy(boundedX, boundedY, organism.radius, organism.genome.aspectRatio, organism.direction)) {
        organism.x = boundedX
        organism.y = boundedY
        continue
      }

      const canSlideX = terrain.canOccupy(boundedX, organism.y, organism.radius, organism.genome.aspectRatio, organism.direction)
      const canSlideY = terrain.canOccupy(organism.x, boundedY, organism.radius, organism.genome.aspectRatio, organism.direction)
      if (canSlideX && !canSlideY) {
        organism.x = boundedX
        organism.direction = -organism.direction
      } else if (canSlideY && !canSlideX) {
        organism.y = boundedY
        organism.direction = Math.PI - organism.direction
      } else {
        organism.direction += Math.PI
      }
    }
  }
}

function clamp(value: number, minimum: number, maximum: number): number { return Math.max(minimum, Math.min(maximum, value)) }
