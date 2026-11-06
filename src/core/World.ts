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
  readonly scenario?: WorldDefinition['scenario']
  readonly initialGenomes?: WorldDefinition['initialGenomes']
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
  totalEnergyTransferred = 0
  energyTransferLoss = 0
  nextOrganismNumber = 0

  constructor(definition: WorldDefinition) {
    this.id = definition.id
    this.name = definition.name
    this.width = definition.width
    this.height = definition.height
    this.seed = definition.seed >>> 0
    this.originType = definition.originType ?? 'primordial'
    this.interventionMode = definition.interventionMode ?? 'observation'
    this.scenario = definition.scenario
    this.initialGenomes = definition.initialGenomes
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
      scenario: this.scenario,
      initialGenomes: this.initialGenomes,
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
      averageBranchingTendency: statistics.averageBranchingTendency,
      averageBondPersistence: statistics.averageBondPersistence,
      averageColonyElongation: statistics.averageColonyElongation,
      averageLinksPerCell: statistics.averageLinksPerCell,
      averageLinksPerColony: statistics.averageLinksPerColony,
      maxGeneration: statistics.maxGeneration,
      birthRate: statistics.birthRate,
      mortalityRate: statistics.mortalityRate,
      averageForagingExpression: statistics.averageForagingExpression,
      averageMotilityExpression: statistics.averageMotilityExpression,
      averageResilienceExpression: statistics.averageResilienceExpression,
      totalEnergyTransferred: statistics.totalEnergyTransferred,
      differentiatedColonyRatio: statistics.differentiatedColonyRatio,
    })
    if (this.history.length > 600) this.history.shift()
    this.lastHistoryTime = this.simulatedTime
  }

  private collectStatistics(): { statistics: WorldStatistics; membership: Map<string, { id: string; size: number }> } {
    const population = this.organisms.length
    const membership = getColonyMembership(this.organisms, this.links)
    const groups = new Map<string, { size: number; minX: number; minY: number; maxX: number; maxY: number; diameter: number }>()
    for (const organism of this.organisms) {
      const colony = membership.get(organism.id) ?? { id: organism.id, size: 1 }
      let bounds = groups.get(colony.id)
      if (!bounds) {
        bounds = { size: colony.size, minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY, diameter: 0 }
        groups.set(colony.id, bounds)
      }
      bounds.minX = Math.min(bounds.minX, organism.x)
      bounds.minY = Math.min(bounds.minY, organism.y)
      bounds.maxX = Math.max(bounds.maxX, organism.x)
      bounds.maxY = Math.max(bounds.maxY, organism.y)
      bounds.diameter += organism.radius * 2
    }
    const colonySizes: number[] = []
    let colonyElongationTotal = 0
    let colonyCount = 0
    for (const bounds of groups.values()) {
      if (bounds.size <= 1) continue
      colonySizes.push(bounds.size)
      const padding = bounds.diameter / bounds.size
      const width = bounds.maxX - bounds.minX + padding
      const height = bounds.maxY - bounds.minY + padding
      colonyElongationTotal += Math.max(width, height) / Math.max(Number.EPSILON, Math.min(width, height))
      colonyCount += 1
    }
    let energyTotal = 0
    let ageTotal = 0
    let adhesionTotal = 0
    let elongationTotal = 0
    let branchingTotal = 0
    let persistenceTotal = 0
    let foragingTotal = 0
    let motilityTotal = 0
    let resilienceTotal = 0
    let highForagingEnergy = 0
    let highForagingCount = 0
    let lowForagingEnergy = 0
    let lowForagingCount = 0
    const expressionRanges = new Map<string, { minForaging: number; maxForaging: number; minMotility: number; maxMotility: number; minResilience: number; maxResilience: number }>()
    let maxGeneration = 0
    let isolatedCells = 0
    for (const organism of this.organisms) {
      energyTotal += organism.energy
      ageTotal += organism.age
      adhesionTotal += organism.genome.adhesion
      const aspect = Math.max(0.5, Math.min(2, organism.genome.aspectRatio))
      elongationTotal += Math.max(aspect, 1 / aspect)
      branchingTotal += organism.genome.branching
      persistenceTotal += organism.genome.bondPersistence
      foragingTotal += organism.expression.foraging
      motilityTotal += organism.expression.motility
      resilienceTotal += organism.expression.resilience
      if (organism.expression.foraging >= 0.7) { highForagingEnergy += organism.energy; highForagingCount += 1 }
      if (organism.expression.foraging <= 0.4) { lowForagingEnergy += organism.energy; lowForagingCount += 1 }
      const colonyId = membership.get(organism.id)?.id ?? organism.id
      const range = expressionRanges.get(colonyId) ?? { minForaging: 1, maxForaging: 0, minMotility: 1, maxMotility: 0, minResilience: 1, maxResilience: 0 }
      range.minForaging = Math.min(range.minForaging, organism.expression.foraging)
      range.maxForaging = Math.max(range.maxForaging, organism.expression.foraging)
      range.minMotility = Math.min(range.minMotility, organism.expression.motility)
      range.maxMotility = Math.max(range.maxMotility, organism.expression.motility)
      range.minResilience = Math.min(range.minResilience, organism.expression.resilience)
      range.maxResilience = Math.max(range.maxResilience, organism.expression.resilience)
      expressionRanges.set(colonyId, range)
      maxGeneration = Math.max(maxGeneration, organism.generation)
      if ((membership.get(organism.id)?.size ?? 1) === 1) isolatedCells += 1
    }
    const elapsed = this.simulatedTime
    let differentiatedColonies = 0
    for (const colonyId of groups.keys()) {
      const range = expressionRanges.get(colonyId)
      if ((groups.get(colonyId)?.size ?? 0) > 1 && range && (range.maxForaging - range.minForaging > 0.1 || range.maxMotility - range.minMotility > 0.1 || range.maxResilience - range.minResilience > 0.1)) differentiatedColonies += 1
    }
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
        averageBranchingTendency: population === 0 ? 0 : branchingTotal / population,
        averageBondPersistence: population === 0 ? 0 : persistenceTotal / population,
        averageColonyElongation: colonyCount === 0 ? 0 : colonyElongationTotal / colonyCount,
        averageLinksPerCell: population === 0 ? 0 : this.links.length * 2 / population,
        averageLinksPerColony: colonyCount === 0 ? 0 : this.links.length / colonyCount,
        maxGeneration,
        birthRate: elapsed <= 0 ? 0 : this.divisions / elapsed,
        mortalityRate: elapsed <= 0 ? 0 : this.totalDeaths / elapsed,
        averageForagingExpression: population === 0 ? 0 : foragingTotal / population,
        averageMotilityExpression: population === 0 ? 0 : motilityTotal / population,
        averageResilienceExpression: population === 0 ? 0 : resilienceTotal / population,
        averageEnergyHighForaging: highForagingCount === 0 ? 0 : highForagingEnergy / highForagingCount,
        averageEnergyLowForaging: lowForagingCount === 0 ? 0 : lowForagingEnergy / lowForagingCount,
        totalEnergyTransferred: this.totalEnergyTransferred,
        energyTransferLoss: this.energyTransferLoss,
        differentiatedColonyRatio: colonyCount === 0 ? 0 : differentiatedColonies / colonyCount,
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
    functionalDifferentiation: merged.functionalDifferentiation !== false,
    energyTransferEnabled: merged.energyTransferEnabled !== false,
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
