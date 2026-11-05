import type { WorldConfig } from '../core/types'
import type { FoodResource } from '../environment/FoodResource'
import type { Organism } from '../organisms/Organism'

/** Organisms are processed by stable array order; the first touching organism claims each food item. */
export class FeedingSystem {
  static update(organisms: Organism[], resources: FoodResource[], config: WorldConfig): void {
    let writeIndex = 0
    for (let resourceIndex = 0; resourceIndex < resources.length; resourceIndex += 1) {
      const resource = resources[resourceIndex]
      let consumed = false
      for (const organism of organisms) {
        if (!organism.active) continue
        const dx = organism.x - resource.x
        const dy = organism.y - resource.y
        const reach = organism.radius + resource.radius
        if (dx * dx + dy * dy <= reach * reach) {
          organism.energy = Math.min(config.maxEnergy, organism.energy + resource.energy)
          organism.foodConsumed += 1
          consumed = true
          break
        }
      }
      if (!consumed) resources[writeIndex++] = resource
    }
    resources.length = writeIndex
  }
}
