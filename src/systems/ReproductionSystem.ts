import type { SeededRandom } from '../core/SeededRandom'
import type { World } from '../core/World'
import { OrganismFactory } from '../organisms/OrganismFactory'
import type { Organism } from '../organisms/Organism'
import { supportRadius } from '../organisms/CellGeometry'

/** Asexual division is paid for by splitting the parent's existing energy reserve. */
export class ReproductionSystem {
  static update(world: World, random: SeededRandom): number {
    const parents = world.organisms
    const offspring: Organism[] = []
    const occupants = [...parents]
    for (const parent of parents) {
      if (!parent.active || parent.energy < world.config.divisionEnergyThreshold) continue
      if (parents.length + offspring.length >= world.config.maximumPopulation) break

      const daughterEnergy = parent.energy / 2
      const daughter = OrganismFactory.createOffspring(
        parent,
        `organism-${world.nextOrganismNumber.toString().padStart(6, '0')}`,
        world.width,
        world.height,
        world.config,
        random,
        daughterEnergy,
        world.terrain,
        occupants,
        world.tick + 1,
      )
      if (!daughter) continue
      parent.energy = daughterEnergy
      occupants.push(daughter)
      world.nextOrganismNumber += 1
      offspring.push(daughter)
      world.divisions += 1

      // Adhesion is heritable and probabilistic; high adhesion improves attachment
      // likelihood but every attached cell pays an ongoing energy cost.
      const strength = (parent.genome.adhesion + daughter.genome.adhesion) / 2
      if (random.next() < strength) {
        const dx = daughter.x - parent.x
        const dy = daughter.y - parent.y
        const distance = Math.max(Number.EPSILON, Math.hypot(dx, dy))
        const restLength = supportRadius(parent, dx / distance, dy / distance) + supportRadius(daughter, -dx / distance, -dy / distance) + 0.1
        const persistence = (parent.genome.bondPersistence + daughter.genome.bondPersistence) / 2
        const structuralExpression = (parent.expression.resilience + daughter.expression.resilience) / 2
        const structuralFactor = world.config.functionalDifferentiation ? 0.85 + structuralExpression * 0.3 : 1
        const breakDistance = restLength * (1 + strength * (0.35 + persistence * 0.4)) * structuralFactor
        if (world.terrain.canOccupy(daughter.x, daughter.y, daughter.radius, daughter.genome.aspectRatio, daughter.direction) && distance <= breakDistance) {
          world.links.push({ id: `${parent.id}::${daughter.id}`, cellAId: parent.id, cellBId: daughter.id, restLength, breakDistance, strength })
        }
      }
    }
    parents.push(...offspring)
    return offspring.length
  }
}
