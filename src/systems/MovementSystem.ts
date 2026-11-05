import type { SeededRandom } from '../core/SeededRandom'
import type { WorldConfig } from '../core/types'
import type { Organism } from '../organisms/Organism'

/** Applies bounded random turns, then moves and reflects at the rectangular world edges. */
export class MovementSystem {
  static update(organisms: Organism[], width: number, height: number, config: WorldConfig, random: SeededRandom, deltaTime: number): void {
    for (const organism of organisms) {
      organism.age += deltaTime
      organism.direction += (random.next() * 2 - 1) * config.turnRate * deltaTime
      organism.x += Math.cos(organism.direction) * organism.speed * deltaTime
      organism.y += Math.sin(organism.direction) * organism.speed * deltaTime

      const minX = organism.radius
      const maxX = width - organism.radius
      if (organism.x < minX) {
        organism.x = minX
        organism.direction = Math.PI - organism.direction
      } else if (organism.x > maxX) {
        organism.x = maxX
        organism.direction = Math.PI - organism.direction
      }
      const minY = organism.radius
      const maxY = height - organism.radius
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
