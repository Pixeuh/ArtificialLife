import type { WorldDefinition, WorldSnapshot } from '../core/types'

export type WorkerCommand =
  | { type: 'initialize'; world: WorldDefinition }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'set-speed'; speed: number }
  | { type: 'reset'; world?: WorldDefinition }
  | { type: 'get-state' }
  | { type: 'destroy' }

export type WorkerEvent = { type: 'state'; world: WorldSnapshot } | { type: 'error'; message: string }
