import type { Organism } from '../organisms/Organism'

/** Costs use simulated time and commanded distance, including movement clipped by a wall. */
export class MetabolismSystem {
  static update(organisms: readonly Organism[], deltaTime: number): void {
    for (const organism of organisms) {
      if (!organism.active) continue
      const dt = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0
      const baseCost = organism.baseMetabolismRate * dt
      // The movement cost is based on requested speed × dt, not the wall-clipped displacement.
      const movementCost = organism.speed * dt * organism.movementEnergyCost
      const current = Number.isFinite(organism.energy) ? Math.max(0, organism.energy) : 0
      const cost = Number.isFinite(baseCost + movementCost) ? Math.max(0, baseCost + movementCost) : current
      organism.energy = Math.max(0, Math.min(organism.maxEnergy, current) - cost)
    }
  }
}
