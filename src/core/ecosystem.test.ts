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
})
