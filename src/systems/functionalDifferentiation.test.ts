import { describe, expect, it } from 'vitest'
import { Simulation } from '../core/Simulation'
import { SeededRandom } from '../core/SeededRandom'
import { Organism } from '../organisms/Organism'
import { FoodResource } from '../environment/FoodResource'
import { CellExpressionSystem } from './CellExpressionSystem'
import { EnergyTransferSystem } from './EnergyTransferSystem'
import { FeedingSystem } from './FeedingSystem'
import { MetabolismSystem } from './MetabolismSystem'
import { MovementSystem } from './MovementSystem'
import { ReproductionSystem } from './ReproductionSystem'
import { createDifferentiationExperiment } from '../experiments/differentiation'

const bareSimulation = (id = 'functional-test') => new Simulation({
  id, name: id, width: 1_000, height: 800, seed: 41,
  config: { initialOrganismCount: 0, initialFoodCount: 0, maxFoodCount: 0, mutationRate: 0, adhesionEnergyCost: 0 },
})

describe('functional differentiation', () => {
  it('expresses inherited capacities differently under different local resource conditions', () => {
    const simulation = bareSimulation()
    const genome = { adhesion: 0, aspectRatio: 1, foraging: 0.5, motility: 0.5, resilience: 0.5 }
    const supplied = new Organism('supplied', 120, 120, 0, 0, 5, 20, 100, 0, 0, genome)
    const scarce = new Organism('scarce', 600, 600, 0, 0, 5, 20, 100, 0, 0, genome)
    simulation.world.organisms = [supplied, scarce]
    simulation.world.resources = [new FoodResource('nearby', 121, 121, 2, 240)]
    CellExpressionSystem.update(simulation.world)
    expect(supplied.expression.localResourceSignal).toBeGreaterThan(scarce.expression.localResourceSignal)
    expect(supplied.expression.foraging).toBeLessThan(scarce.expression.foraging)
    expect(supplied.genome.foraging).toBe(scarce.genome.foraging)
  })

  it('changes resource access, movement effort, and maintenance through expressed functions', () => {
    const weakForager = new Organism('weak', 100, 100, 0, 0, 5, 20, 100, 0, 0)
    const strongForager = new Organism('strong', 100, 100, 0, 0, 5, 20, 100, 0, 0)
    weakForager.expression = { foraging: 0, motility: 0.5, resilience: 0.5, localResourceSignal: 0, colonyEdgeSignal: 0.5 }
    strongForager.expression = { ...weakForager.expression, foraging: 1 }
    const food = [new FoodResource('edge-food', 107, 100, 2, 30)]
    FeedingSystem.update([weakForager], food, bareSimulation().world.config, undefined, true)
    expect(food).toHaveLength(1)
    FeedingSystem.update([strongForager], food, bareSimulation().world.config, undefined, true)
    expect(food).toHaveLength(0)
    expect(strongForager.foodConsumed).toBe(1)

    const lowMotor = new Organism('low-motor', 200, 200, 0, 10, 5, 100, 100, 0.1, 0.01)
    const highMotor = new Organism('high-motor', 200, 200, 0, 10, 5, 100, 100, 0.1, 0.01)
    lowMotor.expression = { ...weakForager.expression, motility: 0 }
    highMotor.expression = { ...weakForager.expression, motility: 1 }
    const config = { ...bareSimulation().world.config, functionalDifferentiation: true }
    MovementSystem.update([lowMotor], 1_000, 800, config, new SeededRandom(8), 1)
    MovementSystem.update([highMotor], 1_000, 800, config, new SeededRandom(8), 1)
    expect(highMotor.x).toBeGreaterThan(lowMotor.x)
    MetabolismSystem.update([lowMotor], 1, [], 0, undefined, true)
    MetabolismSystem.update([highMotor], 1, [], 0, undefined, true)
    expect(highMotor.energy).toBeLessThan(lowMotor.energy)
  })

  it('uses resistance to strengthen bonds while charging its ongoing maintenance cost', () => {
    const low = bareSimulation('low-resilience')
    const high = bareSimulation('high-resilience')
    for (const [simulation, resilience] of [[low, 0], [high, 1]] as const) {
      const parent = new Organism('parent', 100, 100, 0, 0, 5, 100, 100, 0, 0, { adhesion: 1, aspectRatio: 1, resilience })
      parent.expression = { foraging: 0.5, motility: 0.5, resilience, localResourceSignal: 0, colonyEdgeSignal: 0.5 }
      simulation.world.organisms = [parent]
      ReproductionSystem.update(simulation.world, new SeededRandom(9))
    }
    expect(high.world.links[0].breakDistance).toBeGreaterThan(low.world.links[0].breakDistance)
    const weakCell = low.world.organisms[0]
    const strongCell = high.world.organisms[0]
    weakCell.energy = strongCell.energy = 50
    MetabolismSystem.update([weakCell], 1, low.world.links, 0.1, undefined, true)
    MetabolismSystem.update([strongCell], 1, high.world.links, 0.1, undefined, true)
    expect(strongCell.energy).toBeLessThan(weakCell.energy)
  })

  it('shares energy only along extant links and accounts for dissipation without creating energy', () => {
    const simulation = bareSimulation()
    const donor = new Organism('donor', 100, 100, 0, 0, 5, 80)
    const receiver = new Organism('receiver', 110, 100, 0, 0, 5, 10)
    simulation.world.organisms = [donor, receiver]
    simulation.world.links = [{ id: 'bond', cellAId: donor.id, cellBId: receiver.id, restLength: 10, breakDistance: 20, strength: 0.8 }]
    const before = donor.energy + receiver.energy
    const metrics = EnergyTransferSystem.update(simulation.world, 1)
    expect(metrics.transferred).toBeCloseTo(0.4)
    expect(metrics.dissipated).toBeCloseTo(0.04)
    expect(donor.energy + receiver.energy).toBeCloseTo(before - metrics.dissipated)
    expect(receiver.energy).toBeGreaterThan(10)
    expect(donor.energy).toBeGreaterThanOrEqual(0)
    simulation.world.links = []
    const isolatedMetrics = EnergyTransferSystem.update(simulation.world, 1)
    expect(isolatedMetrics.transferred).toBe(0)
  })

  it('records persistent parentage and birth tick through reproduction and save restoration', () => {
    const simulation = bareSimulation('lineage-test')
    simulation.world.tick = 17
    const founder = new Organism('founder', 100, 100, 0, 0, 5, 100)
    simulation.world.organisms = [founder]
    ReproductionSystem.update(simulation.world, new SeededRandom(12))
    const child = simulation.world.organisms[1]
    expect(child.parentId).toBe(founder.id)
    expect(child.lineageId).toBe(founder.id)
    expect(child.birthTick).toBe(18)
    expect(child.genome).toMatchObject({ foraging: founder.genome.foraging, motility: founder.genome.motility, resilience: founder.genome.resilience })
    const restored = Simulation.fromSave(JSON.parse(JSON.stringify(simulation.save())))
    expect(restored.world.snapshot().organisms.map(cell => ({ parentId: cell.parentId, lineageId: cell.lineageId, birthTick: cell.birthTick }))).toEqual(simulation.world.snapshot().organisms.map(cell => ({ parentId: cell.parentId, lineageId: cell.lineageId, birthTick: cell.birthTick })))
  })

  it('defines all four matched 2×2 factorial conditions and replays them deterministically', () => {
    const conditions = createDifferentiationExperiment(20_260_901)
    expect(conditions.map(item => [item.config?.functionalDifferentiation, item.config?.energyTransferEnabled])).toEqual([[false, false], [true, false], [false, true], [true, true]])
    expect(new Set(conditions.map(item => item.seed)).size).toBe(1)
    const treatment = new Simulation(conditions[3])
    const repeated = new Simulation(conditions[3])
    const control = new Simulation(conditions[0])
    const differentiationOnly = new Simulation(conditions[1])
    const transferOnly = new Simulation(conditions[2])
    for (let tick = 0; tick < 1_200; tick += 1) { treatment.step(); repeated.step(); control.step() }
    differentiationOnly.step(); transferOnly.step()
    const result = treatment.world.snapshot()
    const controlResult = control.world.snapshot()
    expect(result).toEqual(repeated.world.snapshot())
    expect(result.statistics.totalEnergyTransferred).toBeGreaterThan(0)
    expect(result.statistics.energyTransferLoss).toBeGreaterThan(0)
    expect(controlResult.statistics.totalEnergyTransferred).toBe(0)
    expect(result.statistics.differentiatedColonyRatio).toBeGreaterThan(0)
    expect(result.organisms.every(cell => cell.parentId === null || cell.lineageId.length > 0)).toBe(true)
    console.info('Differentiation comparison', JSON.stringify({ seconds: result.simulatedTime, seed: result.seed, treatment: { population: result.statistics.population, divisions: result.statistics.divisions, deaths: result.statistics.totalDeaths, colonies: result.statistics.colonies, differentiatedColonyRatio: result.statistics.differentiatedColonyRatio, transferred: result.statistics.totalEnergyTransferred, transferLoss: result.statistics.energyTransferLoss, averageEnergyHighForaging: result.statistics.averageEnergyHighForaging, averageEnergyLowForaging: result.statistics.averageEnergyLowForaging }, control: { population: controlResult.statistics.population, divisions: controlResult.statistics.divisions, deaths: controlResult.statistics.totalDeaths, colonies: controlResult.statistics.colonies, energy: controlResult.statistics.averageEnergy } }))
  }, 30_000)
})
