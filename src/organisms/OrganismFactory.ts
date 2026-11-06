import type { CellGenome, WorldConfig } from '../core/types'
import { SeededRandom } from '../core/SeededRandom'
import { Organism } from './Organism'
import { cellBoundaryExtents, supportRadius } from './CellGeometry'
import type { TerrainMap } from '../environment/terrain/TerrainMap'

export class OrganismFactory {
  static createAll(count: number, width: number, height: number, config: WorldConfig, random: SeededRandom, terrain?: TerrainMap, founderGenomes?: readonly CellGenome[]): Organism[] {
    const organisms: Organism[] = []
    for (let index = 0; index < count; index += 1) {
      const randomGenome: CellGenome = {
        adhesion: random.next(), aspectRatio: 0.75 + random.next() * 0.5,
        divisionAngle: (random.next() * 2 - 1) * Math.PI, branching: random.next(),
        bondPersistence: 0.5 + random.next(), foraging: random.next(), motility: random.next(), resilience: random.next(),
      }
      const genome = founderGenomes?.length ? { ...randomGenome, ...founderGenomes[index % founderGenomes.length] } : randomGenome
      const direction = random.next() * Math.PI * 2
      let organism: Organism | undefined
      // Finite random attempts keep initialization deterministic and avoid an unbounded search on crowded maps.
      for (let attempt = 0; attempt < 160; attempt += 1) {
        const x = config.organismRadius + random.next() * Math.max(0, width - config.organismRadius * 2)
        const y = config.organismRadius + random.next() * Math.max(0, height - config.organismRadius * 2)
        const candidate = new Organism(`organism-${index.toString().padStart(4, '0')}`, x, y, direction, config.organismSpeed, config.organismRadius, config.initialEnergy, config.maxEnergy, config.baseMetabolismRate, config.movementEnergyCost, genome, 0)
        if (validCell(candidate, width, height, terrain) && doesNotOverlap(candidate, organisms)) { organism = candidate; break }
      }
      if (!organism) break
      organisms.push(organism)
    }
    return organisms
  }

  static createOffspring(parent: Organism, id: string, width: number, height: number, config: WorldConfig, random: SeededRandom, energy: number, terrain?: TerrainMap, occupants: readonly Organism[] = [parent], birthTick = 0): Organism | undefined {
    // Stage all random draws. A rejected placement does not consume a mutation or reproduction event.
    const staged = new SeededRandom(random.getState())
    const branching = parent.genome.branching
    const branch = staged.next() < branching
    const side = staged.next() < 0.5 ? -1 : 1
    const direction = parent.direction + parent.genome.divisionAngle + (branch ? side * branching * Math.PI * 0.5 : 0)
    const genome: CellGenome = {
      adhesion: mutate(parent.genome.adhesion, config, staged, 0, 1),
      aspectRatio: mutate(parent.genome.aspectRatio, config, staged, 0.5, 2),
      divisionAngle: mutateAngle(parent.genome.divisionAngle, config, staged),
      branching: mutate(parent.genome.branching, config, staged, 0, 1),
      bondPersistence: mutate(parent.genome.bondPersistence, config, staged, 0.5, 2),
      foraging: mutate(parent.genome.foraging, config, staged, 0, 1),
      motility: mutate(parent.genome.motility, config, staged, 0, 1),
      resilience: mutate(parent.genome.resilience, config, staged, 0, 1),
    }
    const daughter = new Organism(id, parent.x, parent.y, direction, parent.speed, parent.radius, energy, parent.maxEnergy, parent.baseMetabolismRate, parent.movementEnergyCost, genome, parent.generation + 1, parent.id, parent.lineageId, birthTick)
    const angles = [0, 1, -1, 2, -2, 3, -3, 4, 5, -5, 6, -6, 7, -7, 8, 9, -9, 10, -10, 11, -11, 12, -12]
    for (const slot of angles) {
      const angle = direction + slot * Math.PI / 12
      const ux = Math.cos(angle), uy = Math.sin(angle)
      const distance = supportRadius(parent, ux, uy) + supportRadius(daughter, -ux, -uy) + 0.1
      daughter.x = parent.x + ux * distance
      daughter.y = parent.y + uy * distance
      if (validCell(daughter, width, height, terrain) && doesNotOverlap(daughter, occupants)) {
        random.restoreState(staged.getState())
        return daughter
      }
    }
    return undefined
  }
}

function validCell(cell: Organism, width: number, height: number, terrain?: TerrainMap): boolean {
  const bounds = cellBoundaryExtents(cell)
  return cell.x >= bounds.x && cell.x <= width - bounds.x && cell.y >= bounds.y && cell.y <= height - bounds.y
    && (!terrain || terrain.canOccupy(cell.x, cell.y, cell.radius, cell.genome.aspectRatio, cell.direction))
}

function doesNotOverlap(candidate: Organism, others: readonly Organism[]): boolean {
  for (const other of others) {
    const dx = candidate.x - other.x, dy = candidate.y - other.y
    const length = Math.max(Number.EPSILON, Math.hypot(dx, dy))
    const distance = supportRadius(candidate, dx / length, dy / length) + supportRadius(other, -dx / length, -dy / length)
    if (length < distance - 1e-6) return false
  }
  return true
}

function mutate(value: number, config: WorldConfig, random: SeededRandom, minimum: number, maximum: number): number {
  if (random.next() >= config.mutationRate) return value
  return Math.max(minimum, Math.min(maximum, value + (random.next() * 2 - 1) * config.mutationStep))
}

function mutateAngle(value: number, config: WorldConfig, random: SeededRandom): number {
  if (random.next() >= config.mutationRate) return value
  const angle = value + (random.next() * 2 - 1) * config.mutationStep * Math.PI
  return ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
}
