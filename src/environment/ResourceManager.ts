import type { WorldConfig } from '../core/types'
import type { SeededRandom } from '../core/SeededRandom'
import { FoodResource } from './FoodResource'
import type { TerrainMap } from './terrain/TerrainMap'

export class ResourceManager {
  private nextId = 0
  private regenerationRemainder = 0

  constructor(readonly resources: FoodResource[], private readonly width: number, private readonly height: number, private readonly config: WorldConfig, private readonly random: SeededRandom, private readonly terrain?: TerrainMap) {
    this.nextId = resources.length
  }

  regenerate(deltaTime: number): void {
    if (this.resources.length >= this.config.maxFoodCount || this.config.foodRegenerationRate <= 0) return
    this.regenerationRemainder += this.config.foodRegenerationRate * deltaTime
    while (this.regenerationRemainder >= 1 && this.resources.length < this.config.maxFoodCount) {
      this.regenerationRemainder -= 1
      const resource = this.create()
      if (!resource) { this.regenerationRemainder = 0; break }
      this.resources.push(resource)
    }
  }

  createInitial(count: number): void {
    for (let index = 0; index < count; index += 1) {
      const resource = this.create()
      if (!resource) break
      this.resources.push(resource)
    }
  }

  saveState(): { nextId: number; regenerationRemainder: number } {
    return { nextId: this.nextId, regenerationRemainder: this.regenerationRemainder }
  }

  restoreState(state: { nextId: number; regenerationRemainder: number }): void {
    this.nextId = state.nextId
    this.regenerationRemainder = state.regenerationRemainder
  }

  private create(): FoodResource | undefined {
    const index = this.nextId++
    const radius = this.config.foodRadius
    if (this.terrain) {
      const habitat: { index: number; weight: number }[] = []
      let totalWeight = 0
      for (let cellIndex = 0; cellIndex < this.terrain.cells.length; cellIndex += 1) {
        const cell = this.terrain.cells[cellIndex]
        if (!cell.traversable || cell.foodPotential <= 0) continue
        const weight = cell.foodPotential * this.terrain.config.cellSize ** 2
        totalWeight += weight
        habitat.push({ index: cellIndex, weight: totalWeight })
      }
      if (totalWeight <= 0) return undefined
      let selection = this.random.next() * totalWeight
      let selected = habitat[habitat.length - 1].index
      for (const entry of habitat) {
        if (selection < entry.weight) { selected = entry.index; break }
      }
      const column = selected % this.terrain.columns
      const row = Math.floor(selected / this.terrain.columns)
      const left = column * this.terrain.config.cellSize
      const top = row * this.terrain.config.cellSize
      const cellWidth = Math.min(this.terrain.config.cellSize, this.width - left)
      const cellHeight = Math.min(this.terrain.config.cellSize, this.height - top)
      const insetX = Math.min(radius, cellWidth / 2)
      const insetY = Math.min(radius, cellHeight / 2)
      const x = left + insetX + this.random.next() * Math.max(0, cellWidth - insetX * 2)
      const y = top + insetY + this.random.next() * Math.max(0, cellHeight - insetY * 2)
      return new FoodResource(`food-${index.toString().padStart(5, '0')}`, x, y, radius, this.config.foodEnergy)
    }
    return new FoodResource(
      `food-${index.toString().padStart(5, '0')}`,
      radius + this.random.next() * Math.max(0, this.width - radius * 2),
      radius + this.random.next() * Math.max(0, this.height - radius * 2),
      radius,
      this.config.foodEnergy,
    )
  }
}
