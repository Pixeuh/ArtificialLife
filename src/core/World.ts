import { WORLD_DEFAULTS, type CellLinkSnapshot, type EvolutionSample, type FoodSnapshot, type OrganismSnapshot, type WorldConfig, type WorldDefinition, type WorldSnapshot, type WorldStatistics } from './types'
import type { FoodResource } from '../environment/FoodResource'
import type { Organism } from '../organisms/Organism'
import { getColonyMembership } from '../organisms/CellColony'
import { TerrainMap } from '../environment/terrain/TerrainMap'

export class World {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly height: number
  readonly seed: number
  readonly originType: 'primordial' | 'custom'
  readonly interventionMode: 'observation' | 'divine'
  readonly config: WorldConfig
  readonly terrain: TerrainMap
  organisms: Organism[] = []
  resources: FoodResource[] = []
  links: CellLinkSnapshot[] = []
  history: EvolutionSample[] = []
  lastHistoryTime = 0
  simulatedTime = 0
  tick = 0
  paused = true
  speed = 1
  initialPopulation: number
  totalDeaths = 0
  starvationDeaths = 0
  totalFoodConsumed = 0
  divisions = 0
  nextOrganismNumber = 0

  constructor(definition: WorldDefinition) {
    this.id = definition.id
    this.name = definition.name
    this.width = definition.width
    this.height = definition.height
    this.seed = definition.seed >>> 0
    this.originType = definition.originType ?? 'primordial'
    this.interventionMode = definition.interventionMode ?? 'observation'
    this.config = normalizeConfig(definition.config)
    this.terrain = new TerrainMap(definition.width, definition.height, this.seed, definition.terrainConfig)
    this.initialPopulation = this.config.initialOrganismCount
    this.nextOrganismNumber = this.initialPopulation
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
    const { statistics, membership } = this.collectStatistics()
    return {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      seed: this.seed,
      originType: this.originType,
      interventionMode: this.interventionMode,
      config: this.config,
      terrainConfig: this.terrain.config,
      simulatedTime: this.simulatedTime,
      tick: this.tick,
      paused: this.paused,
      speed: this.speed,
      organisms: this.organisms.map((organism): OrganismSnapshot => {
        const colony = membership.get(organism.id) ?? { id: organism.id, size: 1 }
        return { ...organism.snapshot(), colonyId: colony.id, colonySize: colony.size }
      }),
      resources: this.resources.map((resource): FoodSnapshot => resource.snapshot()),
      links: this.links.map(link => ({ ...link })),
      history: this.history.map(sample => ({ ...sample })),
      statistics,
    }
  }

  recordHistorySample(): void {
    const { statistics } = this.collectStatistics()
    this.history.push({
      time: this.simulatedTime,
      population: statistics.population,
      isolatedCells: statistics.isolatedCells,
      colonies: statistics.colonies,
      averageColonySize: statistics.averageColonySize,
      largestColonySize: statistics.largestColonySize,
      averageAdhesion: statistics.averageAdhesion,
      averageElongation: statistics.averageElongation,
      maxGeneration: statistics.maxGeneration,
      birthRate: statistics.birthRate,
      mortalityRate: statistics.mortalityRate,
    })
    if (this.history.length > 600) this.history.shift()
    this.lastHistoryTime = this.simulatedTime
  }

  private collectStatistics(): { statistics: WorldStatistics; membership: Map<string, { id: string; size: number }> } {
    const population = this.organisms.length
    const membership = getColonyMembership(this.organisms, this.links)
    const groups = new Map<string, number>()
    for (const colony of membership.values()) groups.set(colony.id, colony.size)
    const colonySizes = [...groups.values()].filter(size => size > 1)
    let energyTotal = 0
    let ageTotal = 0
    let adhesionTotal = 0
    let elongationTotal = 0
    let maxGeneration = 0
    let isolatedCells = 0
    for (const organism of this.organisms) {
      energyTotal += organism.energy
      ageTotal += organism.age
      adhesionTotal += organism.genome.adhesion
      const aspect = Math.max(0.5, Math.min(2, organism.genome.aspectRatio))
      elongationTotal += Math.max(aspect, 1 / aspect)
      maxGeneration = Math.max(maxGeneration, organism.generation)
      if ((membership.get(organism.id)?.size ?? 1) === 1) isolatedCells += 1
    }
    const elapsed = this.simulatedTime
    return {
      membership,
      statistics: {
        population,
        resources: this.resources.length,
        totalFoodConsumed: this.totalFoodConsumed,
        averageEnergy: population === 0 ? 0 : energyTotal / population,
        averageAge: population === 0 ? 0 : ageTotal / population,
        initialPopulation: this.initialPopulation,
        totalDeaths: this.totalDeaths,
        starvationDeaths: this.starvationDeaths,
        divisions: this.divisions,
        colonies: colonySizes.length,
        isolatedCells,
        averageColonySize: colonySizes.length === 0 ? 0 : colonySizes.reduce((sum, size) => sum + size, 0) / colonySizes.length,
        largestColonySize: colonySizes.length === 0 ? 0 : Math.max(...colonySizes),
        averageAdhesion: population === 0 ? 0 : adhesionTotal / population,
        averageElongation: population === 0 ? 0 : elongationTotal / population,
        maxGeneration,
        birthRate: elapsed <= 0 ? 0 : this.divisions / elapsed,
        mortalityRate: elapsed <= 0 ? 0 : this.totalDeaths / elapsed,
      },
    }
  }
}

function normalizeConfig(config: Partial<WorldConfig> = {}): WorldConfig {
  const merged = { ...WORLD_DEFAULTS, ...config }
  const maxEnergy = nonNegative(merged.maxEnergy)
  const maximumPopulation = integer(merged.maximumPopulation, 0, 10_000)
  return {
    tickDuration: positive(merged.tickDuration, WORLD_DEFAULTS.tickDuration),
    initialOrganismCount: integer(merged.initialOrganismCount, 0, Math.min(2_000, maximumPopulation)),
    initialFoodCount: integer(merged.initialFoodCount, 0, 5_000),
    maxFoodCount: integer(merged.maxFoodCount, 0, 5_000),
    foodRegenerationRate: nonNegative(merged.foodRegenerationRate),
    foodEnergy: nonNegative(merged.foodEnergy),
    foodRadius: positive(merged.foodRadius, WORLD_DEFAULTS.foodRadius),
    organismSpeed: nonNegative(merged.organismSpeed),
    organismRadius: positive(merged.organismRadius, WORLD_DEFAULTS.organismRadius),
    // Initial energy above capacity is capped; energy is never created later to compensate.
    initialEnergy: Math.min(maxEnergy, nonNegative(merged.initialEnergy)),
    maxEnergy,
    baseMetabolismRate: nonNegative(merged.baseMetabolismRate),
    movementEnergyCost: nonNegative(merged.movementEnergyCost),
    divisionEnergyThreshold: Math.min(nonNegative(merged.divisionEnergyThreshold), maxEnergy),
    mutationRate: Math.min(1, nonNegative(merged.mutationRate)),
    mutationStep: Math.min(1, nonNegative(merged.mutationStep)),
    adhesionEnergyCost: nonNegative(merged.adhesionEnergyCost),
    maximumPopulation,
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
