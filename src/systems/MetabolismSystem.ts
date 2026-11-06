import type { Organism } from '../organisms/Organism'
import type { CellLinkSnapshot } from '../core/types'
import type { TerrainMap } from '../environment/terrain/TerrainMap'

/** Movement energy follows terrain-adjusted commanded distance without applying terrain cost twice. */
export class MetabolismSystem {
  static update(organisms: readonly Organism[], deltaTime: number, links: readonly CellLinkSnapshot[] = [], adhesionEnergyCost = 0, terrain?: TerrainMap, functionalDifferentiation = false): void {
    const linkCount = new Map<string, number>()
    for (const link of links) {
      linkCount.set(link.cellAId, (linkCount.get(link.cellAId) ?? 0) + 1)
      linkCount.set(link.cellBId, (linkCount.get(link.cellBId) ?? 0) + 1)
    }
    for (const organism of organisms) {
      if (!organism.active) continue
      const dt = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0
      const baseCost = organism.baseMetabolismRate * dt
      const terrainCost = terrain?.movementCostAt(organism.x, organism.y) ?? 1
      const motorFactor = functionalDifferentiation ? 0.6 + 0.8 * organism.expression.motility : 1
      const effectiveSpeed = organism.speed * motorFactor / (Number.isFinite(terrainCost) ? terrainCost : 1)
      const movementCost = effectiveSpeed * dt * organism.movementEnergyCost * (functionalDifferentiation ? 0.7 + 0.6 * organism.expression.motility : 1)
      const persistence = organism.genome.bondPersistence
      const attachmentCost = (linkCount.get(organism.id) ?? 0) * Math.max(0, adhesionEnergyCost) * persistence * dt * (functionalDifferentiation ? 0.7 + 0.6 * organism.expression.resilience : 1)
      const specializationCost = functionalDifferentiation ? organism.baseMetabolismRate * dt * (0.2 * organism.expression.foraging + 0.15 * organism.expression.resilience) : 0
      const current = Number.isFinite(organism.energy) ? Math.max(0, organism.energy) : 0
      const totalCost = baseCost + movementCost + attachmentCost + specializationCost
      const cost = Number.isFinite(totalCost) ? Math.max(0, totalCost) : current
      organism.energy = Math.max(0, Math.min(organism.maxEnergy, current) - cost)
    }
  }
}
