import type { World } from '../core/World'

/** Removes nonviable organisms in stable order and retains only cumulative counters. */
export class LifecycleSystem {
  static removeDead(world: World): number {
    let writeIndex = 0
    let deaths = 0
    for (const organism of world.organisms) {
      if (!organism.active || !Number.isFinite(organism.energy) || organism.energy <= 0) {
        if (organism.active) {
          organism.active = false
          deaths += 1
        }
        continue
      }
      world.organisms[writeIndex++] = organism
    }
    world.organisms.length = writeIndex
    world.totalDeaths += deaths
    world.starvationDeaths += deaths
    return deaths
  }
}
