import { deriveSeed, SeededRandom } from './SeededRandom'
import { SimulationClock } from './SimulationClock'
import { World } from './World'
import { FeedingSystem } from '../systems/FeedingSystem'
import { MovementSystem } from '../systems/MovementSystem'
import { MetabolismSystem } from '../systems/MetabolismSystem'
import { LifecycleSystem } from '../systems/LifecycleSystem'
import { OrganismFactory } from '../organisms/OrganismFactory'
import { ReproductionSystem } from '../systems/ReproductionSystem'
import { AdhesionSystem } from '../systems/AdhesionSystem'
import { CellPhysicsSystem } from '../systems/CellPhysicsSystem'
import { ResourceManager } from '../environment/ResourceManager'
import type { WorldDefinition } from './types'
import type { SimulationSave, SimulationSaveV2 } from './SimulationSave'
import { Organism } from '../organisms/Organism'
import { FoodResource } from '../environment/FoodResource'

/** One independent simulation instance. It has no React, DOM, or Canvas dependency. */
export class Simulation {
  world: World
  readonly random: SeededRandom
  resourceRandom: SeededRandom
  readonly clock = new SimulationClock()
  private definition: WorldDefinition
  private resourceManager: ResourceManager

  constructor(definition: WorldDefinition) {
    this.definition = definition
    this.world = new World(definition)
    this.random = new SeededRandom(definition.seed)
    this.resourceRandom = new SeededRandom(deriveSeed(definition.seed, 'resources-v1'))
    this.resourceManager = this.initializeEcosystem()
  }

  step(): void {
    const deltaTime = this.world.config.tickDuration
    // Stable tick order: prune; move; constrain/break links; feed; charge each cell
    // (including link maintenance); prune; divide; regenerate resources; advance time.
    LifecycleSystem.removeDead(this.world)
    MovementSystem.update(this.world.organisms, this.world.width, this.world.height, this.world.config, this.random, deltaTime, this.world.terrain)
    CellPhysicsSystem.resolve(this.world.organisms, this.world.width, this.world.height, 2, this.world.terrain)
    AdhesionSystem.constrain(this.world, this.world.terrain)
    CellPhysicsSystem.resolve(this.world.organisms, this.world.width, this.world.height, 1, this.world.terrain)
    this.world.totalFoodConsumed += FeedingSystem.update(this.world.organisms, this.world.resources, this.world.config)
    MetabolismSystem.update(this.world.organisms, deltaTime, this.world.links, this.world.config.adhesionEnergyCost, this.world.terrain)
    LifecycleSystem.removeDead(this.world)
    AdhesionSystem.removeDangling(this.world)
    const births = ReproductionSystem.update(this.world, this.random)
    if (births > 0) {
      AdhesionSystem.constrain(this.world, this.world.terrain)
      CellPhysicsSystem.resolve(this.world.organisms, this.world.width, this.world.height, 1, this.world.terrain)
    }
    this.resourceManager.regenerate(deltaTime)
    this.world.step()
    if (this.world.simulatedTime - this.world.lastHistoryTime >= 1) this.world.recordHistorySample()
  }

  advance(elapsedSeconds: number): number {
    return this.clock.advance(this.world, elapsedSeconds, () => this.step())
  }

  save(): SimulationSaveV2 {
    const world = this.world
    return {
      format: 'artificial-life-simulation', version: 2,
      definition: { id: world.id, name: world.name, width: world.width, height: world.height, seed: world.seed, originType: world.originType, interventionMode: world.interventionMode, config: world.config, terrainConfig: world.terrain.config },
      randomState: this.random.getState(), clockAccumulator: this.clock.getAccumulator(),
      resourceRandomState: this.resourceRandom.getState(),
      world: {
        tick: world.tick, simulatedTime: world.simulatedTime, paused: world.paused, speed: world.speed,
        initialPopulation: world.initialPopulation,
        organisms: world.organisms.map(cell => ({ id: cell.id, x: cell.x, y: cell.y, direction: cell.direction, speed: cell.speed, radius: cell.radius, energy: cell.energy, maxEnergy: cell.maxEnergy, baseMetabolismRate: cell.baseMetabolismRate, movementEnergyCost: cell.movementEnergyCost, genome: { ...cell.genome }, generation: cell.generation, age: cell.age, active: cell.active, foodConsumed: cell.foodConsumed })),
        resources: world.resources.map(resource => resource.snapshot()), links: world.links.map(link => ({ ...link })), history: world.history.map(sample => ({ ...sample })),
        lastHistoryTime: world.lastHistoryTime, totalDeaths: world.totalDeaths, starvationDeaths: world.starvationDeaths,
        totalFoodConsumed: world.totalFoodConsumed, divisions: world.divisions, nextOrganismNumber: world.nextOrganismNumber,
      },
      resourceManager: this.resourceManager.saveState(),
    }
  }

  static fromSave(save: SimulationSave): Simulation {
    if (save.format !== 'artificial-life-simulation' || (save.version !== 1 && save.version !== 2)) throw new RangeError('Unsupported simulation save format or version.')
    const simulation = new Simulation(save.definition)
    const world = simulation.world
    const state = save.world
    world.organisms = state.organisms.map(cell => {
      const organism = new Organism(cell.id, cell.x, cell.y, cell.direction, cell.speed, cell.radius, cell.energy, cell.maxEnergy, cell.baseMetabolismRate, cell.movementEnergyCost, { ...cell.genome }, cell.generation)
      organism.age = cell.age
      organism.active = cell.active
      organism.foodConsumed = cell.foodConsumed
      return organism
    })
    world.resources = state.resources.map(resource => new FoodResource(resource.id, resource.x, resource.y, resource.radius, resource.energy))
    world.links = state.links.map(link => ({ ...link }))
    world.history = state.history.map(sample => ({ ...sample }))
    world.tick = state.tick
    world.simulatedTime = state.simulatedTime
    world.paused = state.paused
    world.speed = state.speed
    world.initialPopulation = state.initialPopulation ?? world.config.initialOrganismCount
    world.lastHistoryTime = state.lastHistoryTime
    world.totalDeaths = state.totalDeaths
    world.starvationDeaths = state.starvationDeaths
    world.totalFoodConsumed = state.totalFoodConsumed
    world.divisions = state.divisions
    world.nextOrganismNumber = state.nextOrganismNumber
    simulation.random.restoreState(save.randomState)
    simulation.clock.restoreAccumulator(save.clockAccumulator)
    if (save.version === 1) simulation.resourceRandom = simulation.random
    else simulation.resourceRandom.restoreState(save.resourceRandomState)
    simulation.resourceManager = new ResourceManager(world.resources, world.width, world.height, world.config, simulation.resourceRandom, world.terrain)
    simulation.resourceManager.restoreState(save.resourceManager)
    return simulation
  }

  setSpeed(speed: number): void {
    if (![1, 2, 5, 10].includes(speed)) throw new RangeError('Speed must be one of ×1, ×2, ×5, or ×10.')
    this.world.speed = speed
  }

  reset(definition: WorldDefinition = this.definition): void {
    this.definition = definition
    this.world = new World(definition)
    this.random.reset(definition.seed)
    this.resourceRandom = new SeededRandom(deriveSeed(definition.seed, 'resources-v1'))
    this.clock.reset()
    this.resourceManager = this.initializeEcosystem()
  }

  private initializeEcosystem(): ResourceManager {
    const config = this.world.config
    this.world.organisms = OrganismFactory.createAll(config.initialOrganismCount, this.world.width, this.world.height, config, this.random, this.world.terrain)
    this.world.initialPopulation = this.world.organisms.length
    this.world.nextOrganismNumber = this.world.organisms.length
    const resources: import('../environment/FoodResource').FoodResource[] = []
    const manager = new ResourceManager(resources, this.world.width, this.world.height, config, this.resourceRandom, this.world.terrain)
    manager.createInitial(Math.min(config.initialFoodCount, config.maxFoodCount))
    this.world.resources = resources
    this.world.recordHistorySample()
    return manager
  }
}
