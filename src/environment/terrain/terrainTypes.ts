export type Biome = 'plains' | 'forest' | 'desert' | 'mountain' | 'water'
export type TerrainType = 'soil' | 'rock' | 'water'

export interface TerrainCell {
  readonly elevation: number
  readonly moisture: number
  readonly temperature: number
  readonly terrainType: TerrainType
  readonly biome: Biome
  readonly traversable: boolean
  readonly movementCost: number
  readonly foodPotential: number
}

export interface TerrainGenerationConfig {
  /** Width of one simulation grid cell in world units. */
  readonly cellSize: number
  /** Elevation amplitude in [0, 1]. */
  readonly relief: number
  /** Global moisture bias in [0, 1]. */
  readonly moisture: number
  /** Approximate share of the map covered by water, in [0, 0.6]. */
  readonly waterCoverage: number
}

export interface TerrainSnapshot {
  readonly width: number
  readonly height: number
  readonly seed: number
  readonly config: TerrainGenerationConfig
  readonly columns: number
  readonly rows: number
  readonly cells: readonly TerrainCell[]
}

export const TERRAIN_DEFAULTS: TerrainGenerationConfig = {
  cellSize: 80,
  relief: 0.62,
  moisture: 0.56,
  waterCoverage: 0.18,
}

export const BIOME_RULES: Readonly<Record<Biome, { traversable: boolean; movementCost: number; foodPotential: number }>> = {
  plains: { traversable: true, movementCost: 1, foodPotential: 0.78 },
  forest: { traversable: true, movementCost: 1.35, foodPotential: 1 },
  desert: { traversable: true, movementCost: 1.55, foodPotential: 0.2 },
  mountain: { traversable: true, movementCost: 2.4, foodPotential: 0.32 },
  water: { traversable: false, movementCost: Number.POSITIVE_INFINITY, foodPotential: 0 },
}

