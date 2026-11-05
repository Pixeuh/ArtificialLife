import { describe, it } from 'vitest'
import { Simulation } from '../core/Simulation'
import { WORLD_DEFAULTS } from '../core/types'
import { FeedingSystem, type FeedingMetrics } from '../systems/FeedingSystem'
import { CellPhysicsSystem } from '../systems/CellPhysicsSystem'

describe('headless fixed-seed performance benchmark', () => {
  it('reports total and per-tick time plus work counters for reproducible scenarios', () => {
    const ticks = 120
    console.info('population,seed,ticks,elapsed_ms,average_tick_ms,active_cells,resources,feed_candidates,feed_naive_upper_bound,physics_candidates')
    for (const population of [100, 500, 1_000]) {
      for (const seed of [2025, 7319]) {
        const simulation = new Simulation({
          id: `bench-${population}-${seed}`, name: 'benchmark', width: 4_000, height: 2_500, seed,
          config: { ...WORLD_DEFAULTS, initialOrganismCount: population, initialFoodCount: 300, maxFoodCount: 300, foodRegenerationRate: 0, mutationRate: 0 },
        })
        simulation.world.paused = false
        const start = performance.now()
        for (let tick = 0; tick < ticks; tick += 1) simulation.step()
        const elapsed = performance.now() - start
        const feedMetrics: FeedingMetrics = { candidateChecks: 0, blockerChecks: 0 }
        FeedingSystem.update(simulation.world.organisms, simulation.world.resources, simulation.world.config, feedMetrics)
        const physics = CellPhysicsSystem.resolve(simulation.world.organisms, simulation.world.width, simulation.world.height, 1)
        console.info([population, seed, ticks, elapsed.toFixed(2), (elapsed / ticks).toFixed(4), simulation.world.organisms.filter(cell => cell.active).length, simulation.world.resources.length, feedMetrics.candidateChecks, population * simulation.world.resources.length, physics.candidatePairs].join(','))
      }
    }
  })
})
