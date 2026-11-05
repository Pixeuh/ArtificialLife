import type { WorldConfig } from '../core/types'
import type { SeededRandom } from '../core/SeededRandom'
import { Organism } from './Organism'

export class OrganismFactory {
  static createAll(count: number, width: number, height: number, config: WorldConfig, random: SeededRandom): Organism[] {
    const organisms = new Array<Organism>(count)
    for (let index = 0; index < count; index += 1) {
      const radius = config.organismRadius
      organisms[index] = new Organism(
        `organism-${index.toString().padStart(4, '0')}`,
        radius + random.next() * Math.max(0, width - radius * 2),
        radius + random.next() * Math.max(0, height - radius * 2),
        random.next() * Math.PI * 2,
        config.organismSpeed,
        radius,
        config.initialEnergy,
      )
    }
    return organisms
  }
}
