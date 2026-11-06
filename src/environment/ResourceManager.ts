import type { WorldConfig } from '../core/types'
import type { SeededRandom } from '../core/SeededRandom'
import { FoodResource } from './FoodResource'
import type { TerrainMap } from './terrain/TerrainMap'

export class ResourceManager {
  private nextId = 0
  private regenerationRemainder = 0
  private readonly habitat: { index: number; cumulativeWeight: number }[] = []
  private readonly habitatWeight: number

  constructor(readonly resources: FoodResource[], private readonly width: number, private readonly height: number, private readonly config: WorldConfig, private readonly random: SeededRandom, private readonly terrain?: TerrainMap) {
    this.nextId = resources.length
    let total = 0
    if (terrain) for (let index = 0; index < terrain.cells.length; index += 1) {
      const cell = terrain.cells[index]
      if (!cell.traversable || cell.foodPotential <= 0) continue
      total += cell.foodPotential * terrain.config.cellSize ** 2
      this.habitat.push({ index, cumulativeWeight: total })
    }
    this.habitatWeight = total
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
    const radius = this.config.foodRadius
    if (this.terrain) {
      if (this.habitatWeight <= 0) return undefined
      const selection = this.random.next() * this.habitatWeight
      let low = 0, high = this.habitat.length - 1
      while (low < high) { const mid = (low + high) >>> 1; if (selection < this.habitat[mid].cumulativeWeight) high = mid; else low = mid + 1 }
      const selected = this.habitat[low].index
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
      const resource = new FoodResource(`food-${this.nextId.toString().padStart(5, '0')}`, x, y, radius, this.config.foodEnergy)
      this.nextId += 1
      return resource
    }
    const resource = new FoodResource(
      `food-${this.nextId.toString().padStart(5, '0')}`,
      radius + this.random.next() * Math.max(0, this.width - radius * 2),
      radius + this.random.next() * Math.max(0, this.height - radius * 2),
      radius,
      this.config.foodEnergy,
    )
    this.nextId += 1
    return resource
  }
}
