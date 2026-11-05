import { describe, expect, it } from 'vitest'
import { SeededRandom } from './SeededRandom'
import { Simulation } from './Simulation'
import { WORLD_DEFAULTS, type WorldConfig } from './types'
import { Organism } from '../organisms/Organism'
import { OrganismFactory } from '../organisms/OrganismFactory'
import { FoodResource } from '../environment/FoodResource'
import { ResourceManager } from '../environment/ResourceManager'
import { MovementSystem } from '../systems/MovementSystem'
import { FeedingSystem } from '../systems/FeedingSystem'
import { MetabolismSystem } from '../systems/MetabolismSystem'
import { LifecycleSystem } from '../systems/LifecycleSystem'

const config = (patch: Partial<WorldConfig> = {}): WorldConfig => ({ ...WORLD_DEFAULTS, initialOrganismCount: 5, initialFoodCount: 8, maxFoodCount: 12, ...patch })
const definition = (id = 'test-world', seed = 12345, settings = config()) => ({ id, name: id, width: 500, height: 400, seed, config: settings })

describe('ecosystem determinism and systems', () => {
  it('creates the same organisms for the same seed and configuration', () => {
    const settings = config({ initialOrganismCount: 12 })
    const first = OrganismFactory.createAll(12, 500, 400, settings, new SeededRandom(19)).map(item => item.snapshot())
    const second = OrganismFactory.createAll(12, 500, 400, settings, new SeededRandom(19)).map(item => item.snapshot())
    expect(first).toEqual(second)
  })

  it('creates the same initial food for the same seed and configuration', () => {
    const make = () => {
      const foods: FoodResource[] = []
      const manager = new ResourceManager(foods, 500, 400, config(), new SeededRandom(20))
      manager.createInitial(8)
      return foods.map(food => food.snapshot())
    }
    expect(make()).toEqual(make())
  })

  it('moves organisms smoothly according to their direction', () => {
    const settings = config({ turnRate: 0 })
    const organism = new Organism('o-1', 100, 100, 0, 10, 5, 50)
    MovementSystem.update([organism], 500, 400, settings, new SeededRandom(1), 0.5)
    expect(organism.x).toBeCloseTo(105)
    expect(organism.y).toBe(100)
    expect(organism.age).toBeCloseTo(0.5)
  })

  it('reflects direction at world boundaries and keeps organisms inside', () => {
    const settings = config({ turnRate: 0 })
    const organism = new Organism('o-edge', 94, 100, 0, 30, 5, 50)
    MovementSystem.update([organism], 100, 200, settings, new SeededRandom(2), 0.1)
    expect(organism.x).toBe(95)
    expect(Math.cos(organism.direction)).toBeLessThan(0)
    expect(organism.y).toBeGreaterThanOrEqual(organism.radius)
    expect(organism.y).toBeLessThanOrEqual(200 - organism.radius)
  })

  it('detects contact and awards a food resource to only the first organism', () => {
    const settings = config({ maxEnergy: 100 })
    const first = new Organism('first', 50, 50, 0, 0, 5, 80)
    const second = new Organism('second', 50, 50, 0, 0, 5, 10)
    const resources = [new FoodResource('food-0', 60, 50, 5, 30)]
    FeedingSystem.update([first, second], resources, settings)
    expect(resources).toHaveLength(0)
    expect(first.energy).toBe(100)
    expect(first.foodConsumed).toBe(1)
    expect(second.energy).toBe(10)
    expect(second.foodConsumed).toBe(0)
  })

  it('regenerates resources deterministically and respects the configured cap', () => {
    const make = () => {
      const settings = config({ maxFoodCount: 3, foodRegenerationRate: 2 })
      const resources: FoodResource[] = []
      const manager = new ResourceManager(resources, 500, 400, settings, new SeededRandom(77))
      manager.createInitial(1)
      manager.regenerate(1)
      manager.regenerate(1)
      return resources.map(resource => resource.snapshot())
    }
    expect(make()).toEqual(make())
    expect(make()).toHaveLength(3)
  })

  it('recreates the configured population and resources on reset', () => {
    const simulation = new Simulation(definition())
    simulation.step()
    simulation.reset()
    expect(simulation.world.organisms).toHaveLength(5)
    expect(simulation.world.resources).toHaveLength(8)
    expect(simulation.world.tick).toBe(0)
    expect(simulation.world.organisms.every(organism => organism.age === 0)).toBe(true)
  })

  it('keeps two ecosystem simulations independent', () => {
    const first = new Simulation(definition('a', 1))
    const second = new Simulation(definition('b', 2))
    first.step()
    first.world.resources.pop()
    expect(second.world.tick).toBe(0)
    expect(second.world.resources).toHaveLength(8)
    expect(second.world.organisms.every(organism => organism.age === 0)).toBe(true)
  })

  it('reproduces complete ecosystem state after an equal number of ticks', () => {
    const first = new Simulation(definition('same', 908))
    const second = new Simulation(definition('same', 908))
    for (let tick = 0; tick < 240; tick += 1) { first.step(); second.step() }
    expect(first.world.snapshot()).toEqual(second.world.snapshot())
  })

  it('charges base metabolism while stationary and movement energy in addition', () => {
    const idle = new Organism('idle', 100, 100, 0, 0, 5, 10, 100, 0.5, 0.01)
    const moving = new Organism('moving', 100, 100, 0, 10, 5, 10, 100, 0.5, 0.01)
    MetabolismSystem.update([idle, moving], 2)
    expect(idle.energy).toBeCloseTo(9)
    expect(moving.energy).toBeCloseTo(8.8)
  })

  it('scales metabolic expenses with simulated duration and keeps energy finite/nonnegative', () => {
    const organism = new Organism('o', 20, 20, 0, 0, 2, 0.1, 100, 1, 0)
    MetabolismSystem.update([organism], 1)
    expect(organism.energy).toBe(0)
    MetabolismSystem.update([organism], Number.POSITIVE_INFINITY)
    expect(Number.isFinite(organism.energy)).toBe(true)
    expect(organism.energy).toBeGreaterThanOrEqual(0)
  })

  it('preserves historical consumption and counts starvation death once', () => {
    const simulation = new Simulation(definition('history', 12, config({ initialOrganismCount: 1, initialFoodCount: 0, baseMetabolismRate: 30, movementEnergyCost: 0, organismSpeed: 0 })))
    const organism = simulation.world.organisms[0]
    organism.energy = 0.5
    simulation.world.resources.push(new FoodResource('nearby', organism.x, organism.y, 5, 0.2))
    simulation.step()
    expect(simulation.world.organisms).toHaveLength(0)
    expect(simulation.world.snapshot().statistics).toMatchObject({ population: 0, totalDeaths: 1, starvationDeaths: 1, totalFoodConsumed: 1 })
    LifecycleSystem.removeDead(simulation.world)
    expect(simulation.world.totalDeaths).toBe(1)
  })

  it('removes an organism at zero energy before it can move or consume food', () => {
    const simulation = new Simulation(definition('zero', 9, config({ initialOrganismCount: 1, initialFoodCount: 0 })))
    const organism = simulation.world.organisms[0]
    organism.energy = 0
    const before = { x: organism.x, y: organism.y }
    simulation.world.resources.push(new FoodResource('nearby', organism.x, organism.y, 5, 30))
    simulation.step()
    expect(simulation.world.organisms).toHaveLength(0)
    expect(simulation.world.resources).toHaveLength(1)
    expect(simulation.world.totalFoodConsumed).toBe(0)
    expect({ x: organism.x, y: organism.y }).toEqual(before)
  })

  it('caps initial energy, sanitizes invalid metabolic settings, and resets historical counters', () => {
    const simulation = new Simulation(definition('normalize', 4, config({ initialOrganismCount: 1, initialEnergy: 120, maxEnergy: 25, baseMetabolismRate: Number.NaN, movementEnergyCost: -2 })))
    expect(simulation.world.config.initialEnergy).toBe(25)
    expect(simulation.world.config.baseMetabolismRate).toBe(0)
    expect(simulation.world.config.movementEnergyCost).toBe(0)
    expect(simulation.world.organisms[0].energy).toBe(25)
    simulation.world.totalDeaths = 4
    simulation.world.totalFoodConsumed = 11
    simulation.reset()
    expect(simulation.world.snapshot().statistics).toMatchObject({ totalDeaths: 0, starvationDeaths: 0, totalFoodConsumed: 0, population: 1 })
  })

  it('applies the same per-tick energy rule regardless of simulation speed', () => {
    const setup = () => new Simulation(definition('speed', 5, config({ initialOrganismCount: 1, initialFoodCount: 0, turnRate: 0 })))
    const ordinary = setup()
    const accelerated = setup()
    ordinary.step()
    accelerated.setSpeed(10)
    accelerated.step()
    expect(accelerated.world.organisms[0].energy).toBe(ordinary.world.organisms[0].energy)
    expect(accelerated.world.tick).toBe(ordinary.world.tick)
  })

  it('reports an empty extinct population with zero averages', () => {
    const simulation = new Simulation(definition('extinct', 7, config({ initialOrganismCount: 0, initialFoodCount: 0 })))
    expect(simulation.world.snapshot().statistics).toMatchObject({ population: 0, averageEnergy: 0, averageAge: 0, initialPopulation: 0 })
  })
})
