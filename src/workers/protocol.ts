import type { WorldDefinition, WorldSnapshot } from '../core/types'
import type { TerrainSnapshot } from '../environment/terrain/terrainTypes'

export type WorkerCommand =
  | { type: 'initialize'; world: WorldDefinition }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'set-speed'; speed: number }
  | { type: 'reset'; world?: WorldDefinition }
  | { type: 'get-state' }
  | { type: 'destroy' }

export type WorkerEvent = { type: 'state'; world: WorldSnapshot } | { type: 'terrain'; worldId: string; terrain: TerrainSnapshot } | { type: 'error'; message: string }
