import type { CellGenome, WorldConfig } from '../core/types'
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
        config.maxEnergy,
        config.baseMetabolismRate,
        config.movementEnergyCost,
        { adhesion: random.next(), aspectRatio: 0.75 + random.next() * 0.5 },
        0,
      )
    }
    return organisms
  }

  static createOffspring(parent: Organism, id: string, width: number, height: number, config: WorldConfig, random: SeededRandom, energy: number): Organism {
    const direction = random.next() * Math.PI * 2
    const radius = parent.radius
    const distance = parent.radius + radius + 0.1
    const genome: CellGenome = {
      adhesion: mutate(parent.genome.adhesion, config, random, 0, 1),
      aspectRatio: mutate(parent.genome.aspectRatio, config, random, 0.5, 2),
    }
    return new Organism(
      id,
      clamp(parent.x + Math.cos(direction) * distance, radius, width - radius),
      clamp(parent.y + Math.sin(direction) * distance, radius, height - radius),
      direction,
      parent.speed,
      radius,
      energy,
      parent.maxEnergy,
      parent.baseMetabolismRate,
      parent.movementEnergyCost,
      genome,
      parent.generation + 1,
    )
  }
}

function mutate(value: number, config: WorldConfig, random: SeededRandom, minimum: number, maximum: number): number {
  if (random.next() >= config.mutationRate) return value
  const change = (random.next() * 2 - 1) * config.mutationStep
  return Math.max(minimum, Math.min(maximum, value + change))
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
