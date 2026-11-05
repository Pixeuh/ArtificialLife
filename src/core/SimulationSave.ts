import type { CellLinkSnapshot, CellGenome, EvolutionSample, FoodSnapshot, WorldDefinition } from './types'

/** Complete resumable state, kept distinct from the UI-oriented WorldSnapshot. */
export interface SimulationSaveV1 {
  readonly format: 'artificial-life-simulation'
  readonly version: 1
  readonly definition: WorldDefinition
  readonly randomState: number
  readonly clockAccumulator: number
  readonly resourceManager: { readonly nextId: number; readonly regenerationRemainder: number }
  readonly world: {
    readonly tick: number
    readonly simulatedTime: number
    readonly paused: boolean
    readonly speed: number
    readonly organisms: readonly SavedOrganism[]
    readonly resources: readonly FoodSnapshot[]
    readonly links: readonly CellLinkSnapshot[]
    readonly history: readonly EvolutionSample[]
    readonly lastHistoryTime: number
    readonly totalDeaths: number
    readonly starvationDeaths: number
    readonly totalFoodConsumed: number
    readonly divisions: number
    readonly nextOrganismNumber: number
  }
}

export interface SavedOrganism {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly direction: number
  readonly speed: number
  readonly radius: number
  readonly energy: number
  readonly maxEnergy: number
  readonly baseMetabolismRate: number
  readonly movementEnergyCost: number
  readonly genome: CellGenome
  readonly generation: number
  readonly age: number
  readonly active: boolean
  readonly foodConsumed: number
}
