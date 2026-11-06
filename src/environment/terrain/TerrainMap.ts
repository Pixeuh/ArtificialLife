import type { TerrainCell, TerrainGenerationConfig, TerrainSnapshot } from './terrainTypes'
import { generateTerrain } from './TerrainGenerator'
import type { Organism } from '../../organisms/Organism'

export class TerrainMap {
  readonly columns: number
  readonly rows: number
  readonly cells: readonly TerrainCell[]
  readonly config: TerrainGenerationConfig

  constructor(readonly width: number, readonly height: number, readonly seed: number, config?: Partial<TerrainGenerationConfig>) {
    const generated = generateTerrain(width, height, seed, config)
    this.columns = generated.columns
    this.rows = generated.rows
    this.cells = generated.cells
    this.config = generated.config
  }

  cellAt(x: number, y: number): TerrainCell | undefined {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return undefined
    const column = Math.min(this.columns - 1, Math.floor(x / this.config.cellSize))
    const row = Math.min(this.rows - 1, Math.floor(y / this.config.cellSize))
    return this.cells[row * this.columns + column]
  }

  ecologicalPropertiesAt(x: number, y: number): TerrainCell | undefined { return this.cellAt(x, y) }

  isTraversableAt(x: number, y: number): boolean { return this.cellAt(x, y)?.traversable ?? false }

  canSpawnResourceAt(x: number, y: number): boolean {
    const cell = this.cellAt(x, y)
    return Boolean(cell?.traversable && cell.foodPotential > 0)
  }

  canOccupy(x: number, y: number, radius = 0, aspectRatio = 1, direction = 0): boolean {
    const cell = this.cellAt(x, y)
    if (!cell?.traversable) return false
    if (radius <= 0) return true
    const xExtent = radius * Math.sqrt(Math.max(0.5, Math.min(2, aspectRatio)))
    const yExtent = radius / Math.sqrt(Math.max(0.5, Math.min(2, aspectRatio)))
    const cosine = Math.cos(direction)
    const sine = Math.sin(direction)
    for (let sample = 0; sample < 8; sample += 1) {
      const angle = sample * Math.PI / 4
      const localX = Math.cos(angle) * xExtent
      const localY = Math.sin(angle) * yExtent
      const pointX = x + localX * cosine - localY * sine
      const pointY = y + localX * sine + localY * cosine
      if (!this.cellAt(pointX, pointY)?.traversable) return false
    }
    return true
  }

  movementCostAt(x: number, y: number): number {
    const cell = this.cellAt(x, y)
    return cell?.traversable ? cell.movementCost : Number.POSITIVE_INFINITY
  }

  /** Project a cell pushed onto an obstacle to the closest valid terrain cell center. */
  constrainOrganism(organism: Organism): boolean {
    if (this.canOccupy(organism.x, organism.y, organism.radius, organism.genome.aspectRatio, organism.direction)) return false
    const nearby = this.findPositionNear(organism.x, organism.y, organism.radius, organism.genome.aspectRatio, organism.direction, 3)
    if (!nearby) return false
    organism.x = nearby.x
    organism.y = nearby.y
    return true
  }

  /** Bounded local repair/search. It cannot relocate a cell across the map. */
  findPositionNear(x: number, y: number, radius: number, aspectRatio: number, direction: number, maxRings = 3): { x: number; y: number } | undefined {
    const size = this.config.cellSize
    const column = Math.floor(x / size), row = Math.floor(y / size)
    for (let ring = 0; ring <= maxRings; ring += 1) {
      let best: { x: number; y: number; distance: number } | undefined
      for (let dy = -ring; dy <= ring; dy += 1) for (let dx = -ring; dx <= ring; dx += 1) {
        if (ring > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
        const candidateX = Math.min(this.width - Number.EPSILON, Math.max(0, (column + dx + 0.5) * size))
        const candidateY = Math.min(this.height - Number.EPSILON, Math.max(0, (row + dy + 0.5) * size))
        if (!this.canOccupy(candidateX, candidateY, radius, aspectRatio, direction)) continue
        const distance = (candidateX - x) ** 2 + (candidateY - y) ** 2
        if (!best || distance < best.distance) best = { x: candidateX, y: candidateY, distance }
      }
      if (best) return { x: best.x, y: best.y }
    }
    return undefined
  }

  snapshot(): TerrainSnapshot {
    return { width: this.width, height: this.height, seed: this.seed, config: this.config, columns: this.columns, rows: this.rows, cells: this.cells }
  }
}

