import { WORLD_DEFAULTS, type FoodSnapshot, type OrganismSnapshot, type WorldConfig, type WorldDefinition, type WorldSnapshot, type WorldStatistics } from './types'
import type { FoodResource } from '../environment/FoodResource'
import type { Organism } from '../organisms/Organism'

export class World {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly height: number
  readonly seed: number
  readonly config: WorldConfig
  organisms: Organism[] = []
  resources: FoodResource[] = []
  simulatedTime = 0
  tick = 0
  paused = true
  speed = 1

  constructor(definition: WorldDefinition) {
    this.id = definition.id
    this.name = definition.name
    this.width = definition.width
    this.height = definition.height
    this.seed = definition.seed >>> 0
    this.config = normalizeConfig(definition.config)
  }

  step(): void {
    this.tick += 1
    this.simulatedTime = this.tick * this.config.tickDuration
  }

  reset(): void {
    this.tick = 0
    this.simulatedTime = 0
    this.paused = true
    this.speed = 1
  }

  snapshot(): WorldSnapshot {
    const population = this.organisms.length
    let energyTotal = 0
    let ageTotal = 0
    let totalFoodConsumed = 0
    for (const organism of this.organisms) {
      energyTotal += organism.energy
      ageTotal += organism.age
      totalFoodConsumed += organism.foodConsumed
    }
    const statistics: WorldStatistics = {
      population,
      resources: this.resources.length,
      totalFoodConsumed,
      averageEnergy: population === 0 ? 0 : energyTotal / population,
      averageAge: population === 0 ? 0 : ageTotal / population,
    }
    return {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      seed: this.seed,
      config: this.config,
      simulatedTime: this.simulatedTime,
      tick: this.tick,
      paused: this.paused,
      speed: this.speed,
      organisms: this.organisms.map((organism): OrganismSnapshot => organism.snapshot()),
      resources: this.resources.map((resource): FoodSnapshot => resource.snapshot()),
      statistics,
    }
  }
}

function normalizeConfig(config: Partial<WorldConfig> = {}): WorldConfig {
  const merged = { ...WORLD_DEFAULTS, ...config }
  return {
    tickDuration: positive(merged.tickDuration, WORLD_DEFAULTS.tickDuration),
    initialOrganismCount: integer(merged.initialOrganismCount, 0, 2_000),
    initialFoodCount: integer(merged.initialFoodCount, 0, 5_000),
    maxFoodCount: integer(merged.maxFoodCount, 0, 5_000),
    foodRegenerationRate: nonNegative(merged.foodRegenerationRate),
    foodEnergy: nonNegative(merged.foodEnergy),
    foodRadius: positive(merged.foodRadius, WORLD_DEFAULTS.foodRadius),
    organismSpeed: nonNegative(merged.organismSpeed),
    organismRadius: positive(merged.organismRadius, WORLD_DEFAULTS.organismRadius),
    initialEnergy: nonNegative(merged.initialEnergy),
    maxEnergy: nonNegative(merged.maxEnergy),
    turnRate: nonNegative(merged.turnRate),
  }
}

function integer(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.floor(Number.isFinite(value) ? value : minimum)))
}

function nonNegative(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0)
}

function positive(value: number, fallback: number): number {
  return Math.max(Number.EPSILON, Number.isFinite(value) ? value : fallback)
}
