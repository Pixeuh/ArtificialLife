import type { WorldConfig } from '../core/types'
import type { SeededRandom } from '../core/SeededRandom'
import { FoodResource } from './FoodResource'

export class ResourceManager {
  private nextId = 0
  private regenerationRemainder = 0

  constructor(readonly resources: FoodResource[], private readonly width: number, private readonly height: number, private readonly config: WorldConfig, private readonly random: SeededRandom) {
    this.nextId = resources.length
  }

  regenerate(deltaTime: number): void {
    if (this.resources.length >= this.config.maxFoodCount || this.config.foodRegenerationRate <= 0) return
    this.regenerationRemainder += this.config.foodRegenerationRate * deltaTime
    while (this.regenerationRemainder >= 1 && this.resources.length < this.config.maxFoodCount) {
      this.regenerationRemainder -= 1
      this.resources.push(this.create())
    }
  }

  createInitial(count: number): void {
    for (let index = 0; index < count; index += 1) this.resources.push(this.create())
  }

  saveState(): { nextId: number; regenerationRemainder: number } {
    return { nextId: this.nextId, regenerationRemainder: this.regenerationRemainder }
  }

  restoreState(state: { nextId: number; regenerationRemainder: number }): void {
    this.nextId = state.nextId
    this.regenerationRemainder = state.regenerationRemainder
  }

  private create(): FoodResource {
    const index = this.nextId++
    const radius = this.config.foodRadius
    return new FoodResource(
      `food-${index.toString().padStart(5, '0')}`,
      radius + this.random.next() * Math.max(0, this.width - radius * 2),
      radius + this.random.next() * Math.max(0, this.height - radius * 2),
      radius,
      this.config.foodEnergy,
    )
  }
}
