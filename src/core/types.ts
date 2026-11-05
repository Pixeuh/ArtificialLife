export interface WorldConfig {
  readonly tickDuration: number
  readonly initialOrganismCount: number
  readonly initialFoodCount: number
  readonly maxFoodCount: number
  readonly foodRegenerationRate: number
  readonly foodEnergy: number
  readonly foodRadius: number
  readonly organismSpeed: number
  readonly organismRadius: number
  readonly initialEnergy: number
  readonly maxEnergy: number
  readonly baseMetabolismRate: number
  readonly movementEnergyCost: number
  readonly divisionEnergyThreshold: number
  readonly mutationRate: number
  readonly mutationStep: number
  readonly adhesionEnergyCost: number
  readonly maximumPopulation: number
  readonly turnRate: number
}

export interface CellGenome {
  /** Heritable adhesion probability and bond strength, in [0, 1]. */
  readonly adhesion: number
  /** Heritable body aspect ratio, in [0.5, 2]. */
  readonly aspectRatio: number
}

export interface CellLinkSnapshot {
  readonly id: string
  readonly cellAId: string
  readonly cellBId: string
  readonly restLength: number
  readonly breakDistance: number
  readonly strength: number
}

export interface OrganismSnapshot {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly direction: number
  readonly speed: number
  readonly radius: number
  readonly age: number
  readonly energy: number
  readonly maxEnergy: number
  readonly baseMetabolismRate: number
  readonly movementEnergyCost: number
  readonly active: boolean
  readonly foodConsumed: number
  readonly generation: number
  readonly genome: CellGenome
  readonly colonyId: string
  readonly colonySize: number
}

export interface FoodSnapshot {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly energy: number
}

export interface WorldStatistics {
  readonly population: number
  readonly resources: number
  readonly totalFoodConsumed: number
  readonly averageEnergy: number
  readonly averageAge: number
  readonly initialPopulation: number
  readonly totalDeaths: number
  readonly starvationDeaths: number
  readonly divisions: number
  readonly colonies: number
  readonly isolatedCells: number
  readonly averageColonySize: number
  readonly largestColonySize: number
  readonly averageAdhesion: number
  readonly averageElongation: number
  readonly maxGeneration: number
  readonly birthRate: number
  readonly mortalityRate: number
}

export interface EvolutionSample {
  readonly time: number
  readonly population: number
  readonly isolatedCells: number
  readonly colonies: number
  readonly averageColonySize: number
  readonly largestColonySize: number
  readonly averageAdhesion: number
  readonly averageElongation: number
  readonly maxGeneration: number
  readonly birthRate: number
  readonly mortalityRate: number
}

export interface WorldDefinition {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly height: number
  readonly seed: number
  readonly config?: Partial<WorldConfig>
}

export interface WorldSnapshot extends WorldDefinition {
  readonly simulatedTime: number
  readonly tick: number
  readonly paused: boolean
  readonly speed: number
  readonly config: WorldConfig
  readonly organisms: readonly OrganismSnapshot[]
  readonly resources: readonly FoodSnapshot[]
  readonly links: readonly CellLinkSnapshot[]
  readonly history: readonly EvolutionSample[]
  readonly statistics: WorldStatistics
}

export interface Point {
  x: number
  y: number
}

export const DEFAULT_TICK_DURATION = 1 / 30
export const WORLD_DEFAULTS: WorldConfig = {
  tickDuration: DEFAULT_TICK_DURATION,
  initialOrganismCount: 50,
  initialFoodCount: 250,
  maxFoodCount: 350,
  foodRegenerationRate: 2,
  foodEnergy: 30,
  foodRadius: 5,
  organismSpeed: 22,
  organismRadius: 7,
  initialEnergy: 60,
  maxEnergy: 100,
  baseMetabolismRate: 0.08,
  movementEnergyCost: 0.0005,
  divisionEnergyThreshold: 95,
  mutationRate: 0.03,
  mutationStep: 0.12,
  adhesionEnergyCost: 0.01,
  maximumPopulation: 2_000,
  turnRate: 0.65,
}
