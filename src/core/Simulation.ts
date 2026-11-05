import { SeededRandom } from './SeededRandom'
import { SimulationClock } from './SimulationClock'
import { World } from './World'
import { FeedingSystem } from '../systems/FeedingSystem'
import { MovementSystem } from '../systems/MovementSystem'
import { OrganismFactory } from '../organisms/OrganismFactory'
import { ResourceManager } from '../environment/ResourceManager'
import type { WorldDefinition } from './types'

/** One independent simulation instance. It has no React, DOM, or Canvas dependency. */
export class Simulation {
  world: World
  readonly random: SeededRandom
  readonly clock = new SimulationClock()
  private definition: WorldDefinition
  private resourceManager: ResourceManager

  constructor(definition: WorldDefinition) {
    this.definition = definition
    this.world = new World(definition)
    this.random = new SeededRandom(definition.seed)
    this.resourceManager = this.initializeEcosystem()
  }

  step(): void {
    const deltaTime = this.world.config.tickDuration
    // Stable tick order: move/age, resolve feeding, regenerate, then advance clock.
    MovementSystem.update(this.world.organisms, this.world.width, this.world.height, this.world.config, this.random, deltaTime)
    FeedingSystem.update(this.world.organisms, this.world.resources, this.world.config)
    this.resourceManager.regenerate(deltaTime)
    this.world.step()
  }

  advance(elapsedSeconds: number): number {
    return this.clock.advance(this.world, elapsedSeconds, () => this.step())
  }

  setSpeed(speed: number): void {
    if (![1, 2, 5, 10].includes(speed)) throw new RangeError('Speed must be one of ×1, ×2, ×5, or ×10.')
    this.world.speed = speed
  }

  reset(definition: WorldDefinition = this.definition): void {
    this.definition = definition
    this.world = new World(definition)
    this.random.reset(definition.seed)
    this.clock.reset()
    this.resourceManager = this.initializeEcosystem()
  }

  private initializeEcosystem(): ResourceManager {
    const config = this.world.config
    this.world.organisms = OrganismFactory.createAll(config.initialOrganismCount, this.world.width, this.world.height, config, this.random)
    const resources: import('../environment/FoodResource').FoodResource[] = []
    const manager = new ResourceManager(resources, this.world.width, this.world.height, config, this.random)
    manager.createInitial(Math.min(config.initialFoodCount, config.maxFoodCount))
    this.world.resources = resources
    return manager
  }
}
