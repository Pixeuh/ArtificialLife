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
  readonly turnRate: number
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
  readonly active: boolean
  readonly foodConsumed: number
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
  turnRate: 0.65,
}
