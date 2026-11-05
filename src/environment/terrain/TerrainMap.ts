import type { TerrainCell, TerrainGenerationConfig, TerrainSnapshot } from './terrainTypes'
import { generateTerrain } from './TerrainGenerator'
import type { Organism } from '../../organisms/Organism'
import { cellBoundaryExtents } from '../../organisms/CellGeometry'

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
    const extents = cellBoundaryExtents(organism)
    if (this.canOccupy(organism.x, organism.y, Math.max(extents.x, extents.y), 1, organism.direction)) return false
    let bestDistance = Number.POSITIVE_INFINITY
    let bestX = organism.x
    let bestY = organism.y
    for (let index = 0; index < this.cells.length; index += 1) {
      if (!this.cells[index].traversable) continue
      const column = index % this.columns
      const row = Math.floor(index / this.columns)
      const x = Math.min(this.width, (column + 0.5) * this.config.cellSize)
      const y = Math.min(this.height, (row + 0.5) * this.config.cellSize)
      if (!this.canOccupy(x, y, Math.max(extents.x, extents.y), 1, organism.direction)) continue
      const distance = (x - organism.x) ** 2 + (y - organism.y) ** 2
      if (distance < bestDistance) { bestDistance = distance; bestX = x; bestY = y }
    }
    if (!Number.isFinite(bestDistance)) return false
    organism.x = bestX
    organism.y = bestY
    return true
  }

  snapshot(): TerrainSnapshot {
    return { width: this.width, height: this.height, seed: this.seed, config: this.config, columns: this.columns, rows: this.rows, cells: this.cells }
  }
}

