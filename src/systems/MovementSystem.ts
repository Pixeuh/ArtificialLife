import type { SeededRandom } from '../core/SeededRandom'
import type { WorldConfig } from '../core/types'
import type { Organism } from '../organisms/Organism'
import { cellBoundaryExtents } from '../organisms/CellGeometry'

/** Applies bounded random turns, then moves and reflects at the rectangular world edges. */
export class MovementSystem {
  static update(organisms: Organism[], width: number, height: number, config: WorldConfig, random: SeededRandom, deltaTime: number): void {
    for (const organism of organisms) {
      if (!organism.active) continue
      organism.age += deltaTime
      organism.direction += (random.next() * 2 - 1) * config.turnRate * deltaTime
      organism.x += Math.cos(organism.direction) * organism.speed * deltaTime
      organism.y += Math.sin(organism.direction) * organism.speed * deltaTime

      const extents = cellBoundaryExtents(organism)
      const minX = Math.min(extents.x, width / 2)
      const maxX = Math.max(width - extents.x, width / 2)
      if (organism.x < minX) {
        organism.x = minX
        organism.direction = Math.PI - organism.direction
      } else if (organism.x > maxX) {
        organism.x = maxX
        organism.direction = Math.PI - organism.direction
      }
      const minY = Math.min(extents.y, height / 2)
      const maxY = Math.max(height - extents.y, height / 2)
      if (organism.y < minY) {
        organism.y = minY
        organism.direction = -organism.direction
      } else if (organism.y > maxY) {
        organism.y = maxY
        organism.direction = -organism.direction
      }
    }
  }
}
