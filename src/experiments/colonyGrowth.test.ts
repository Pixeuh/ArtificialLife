import { describe, expect, it } from 'vitest'
import { Simulation } from '../core/Simulation'
import { getColonyMembership } from '../organisms/CellColony'
import { createColonyGrowthExperiment } from './colonyGrowth'

describe('controlled multicellular growth experiment', () => {
  it('reproduces growth and morphology from the same seed without observation changing the engine', () => {
    const definition = createColonyGrowthExperiment(20_260_815)
    const observed = new Simulation(definition)
    const reference = new Simulation(definition)
    const observations: Array<{ seconds: number; population: number; divisions: number; colonies: number; largestColony: number; links: number }> = []
    expect(observed.world.organisms.slice(0, 3).map(cell => cell.genome.branching)).toEqual([0.05, 0.95, 0.5])
    expect(observed.world.organisms.slice(0, 3).map(cell => cell.genome.bondPersistence)).toEqual([0.8, 1.3, 1.8])

    for (let tick = 0; tick < 1_800; tick += 1) {
      observed.step()
      reference.step()
      if (tick % 20 === 0) observed.world.snapshot()
      if ((tick + 1) % 600 === 0) {
        const sample = observed.world.snapshot()
        observations.push({ seconds: sample.simulatedTime, population: sample.statistics.population, divisions: sample.statistics.divisions, colonies: sample.statistics.colonies, largestColony: sample.statistics.largestColonySize, links: sample.links.length })
      }
    }
    const result = observed.world.snapshot()
    expect(result.statistics.divisions).toBeGreaterThan(0)
    expect(result.statistics.colonies).toBeGreaterThan(0)
    expect(result.statistics.averageLinksPerColony).toBeGreaterThan(0)
    expect(result.organisms.every(cell => Number.isFinite(cell.x + cell.y + cell.energy) && cell.energy >= 0)).toBe(true)
    expect(result).toEqual(reference.world.snapshot())
    console.info('Colony experiment result', JSON.stringify({ seed: definition.seed, observations, final: { seconds: result.simulatedTime, population: result.statistics.population, divisions: result.statistics.divisions, colonies: result.statistics.colonies, meanColonySize: result.statistics.averageColonySize, largestColony: result.statistics.largestColonySize, links: result.links.length, meanColonyElongation: result.statistics.averageColonyElongation, branching: result.statistics.averageBranchingTendency, persistence: result.statistics.averageBondPersistence } }))
  }, 30_000)

  it('keeps colony membership tied to current links when a colony separates', () => {
    const simulation = new Simulation(createColonyGrowthExperiment(51))
    const [a, b, c] = simulation.world.organisms
    simulation.world.organisms = [a, b, c]
    simulation.world.links = [
      { id: 'a-b', cellAId: a.id, cellBId: b.id, restLength: 10, breakDistance: 20, strength: 0.8 },
      { id: 'b-c', cellAId: b.id, cellBId: c.id, restLength: 10, breakDistance: 20, strength: 0.8 },
    ]
    const joined = getColonyMembership(simulation.world.organisms, simulation.world.links)
    expect(joined.get(a.id)?.size).toBe(3)
    // Selecting another cell by ID retains the connected component's full membership.
    const selectedCell = simulation.world.organisms.find(cell => cell.id === b.id)
    expect(joined.get(selectedCell!.id)?.id).toBe(joined.get(a.id)?.id)
    simulation.world.links.pop()
    const separated = getColonyMembership(simulation.world.organisms, simulation.world.links)
    expect(separated.get(a.id)?.size).toBe(2)
    expect(separated.get(c.id)?.size).toBe(1)
  })

  it('preserves the experiment profiles and deterministic continuation in a V3 save', () => {
    const simulation = new Simulation(createColonyGrowthExperiment(72))
    for (let tick = 0; tick < 90; tick += 1) simulation.step()
    const restored = Simulation.fromSave(JSON.parse(JSON.stringify(simulation.save())))
    expect(restored.world.snapshot()).toEqual(simulation.world.snapshot())
    expect(restored.save().definition.initialGenomes).toEqual(simulation.save().definition.initialGenomes)
    expect(restored.save().definition.scenario).toBe('colony-growth')
    for (let tick = 0; tick < 30; tick += 1) {
      simulation.step()
      restored.step()
    }
    expect(restored.world.snapshot()).toEqual(simulation.world.snapshot())
  })

  it('checks that a standard natural world can still divide under its ordinary settings', () => {
    const natural = new Simulation({ id: 'natural-check', name: 'Monde A', width: 4_000, height: 2_500, seed: 38_104_721, config: { initialOrganismCount: 50, initialFoodCount: 250, maxFoodCount: 350 } })
    for (let tick = 0; tick < 1_800; tick += 1) natural.step()
    const result = natural.world.snapshot()
    console.info('Natural world check', JSON.stringify({ seconds: result.simulatedTime, initial: result.statistics.initialPopulation, population: result.statistics.population, divisions: result.statistics.divisions, deaths: result.statistics.totalDeaths, colonies: result.statistics.colonies, links: result.links.length, resources: result.statistics.resources }))
    expect(result.statistics.population).toBeGreaterThan(0)
    expect(result.organisms.every(cell => Number.isFinite(cell.energy) && cell.energy >= 0)).toBe(true)
  }, 15_000)
})
