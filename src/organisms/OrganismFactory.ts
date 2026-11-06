import type { CellGenome, WorldConfig } from '../core/types'
import type { SeededRandom } from '../core/SeededRandom'
import { Organism } from './Organism'
import { cellBoundaryExtents, supportRadius } from './CellGeometry'
import type { TerrainMap } from '../environment/terrain/TerrainMap'

export class OrganismFactory {
  static createAll(count: number, width: number, height: number, config: WorldConfig, random: SeededRandom, terrain?: TerrainMap, founderGenomes?: readonly CellGenome[]): Organism[] {
    const organisms: Organism[] = []
    for (let index = 0; index < count; index += 1) {
      const radius = config.organismRadius
      const position = terrain ? randomHabitablePosition(terrain, radius, random) : undefined
      if (terrain && !position) break
      const randomGenome: CellGenome = {
        adhesion: random.next(),
        aspectRatio: 0.75 + random.next() * 0.5,
        divisionAngle: (random.next() * 2 - 1) * Math.PI,
        branching: random.next(),
        bondPersistence: 0.5 + random.next(),
        foraging: random.next(),
        motility: random.next(),
        resilience: random.next(),
      }
      const genome = founderGenomes?.length ? { ...randomGenome, ...founderGenomes[index % founderGenomes.length] } : randomGenome
      organisms.push(new Organism(
        `organism-${index.toString().padStart(4, '0')}`,
        position ? position.x : radius + random.next() * Math.max(0, width - radius * 2),
        position ? position.y : radius + random.next() * Math.max(0, height - radius * 2),
        random.next() * Math.PI * 2,
        config.organismSpeed,
        radius,
        config.initialEnergy,
        config.maxEnergy,
        config.baseMetabolismRate,
        config.movementEnergyCost,
        genome,
        0,
      ))
    }
    return organisms
  }

  static createOffspring(parent: Organism, id: string, width: number, height: number, config: WorldConfig, random: SeededRandom, energy: number, terrain?: TerrainMap, birthTick = 0): Organism {
    const radius = parent.radius
    const branching = parent.genome.branching
    const branch = random.next() < branching
    const side = random.next() < 0.5 ? -1 : 1
    const direction = parent.direction + parent.genome.divisionAngle + (branch ? side * branching * Math.PI * 0.5 : 0)
    const genome: CellGenome = {
      adhesion: mutate(parent.genome.adhesion, config, random, 0, 1),
      aspectRatio: mutate(parent.genome.aspectRatio, config, random, 0.5, 2),
      divisionAngle: mutateAngle(parent.genome.divisionAngle, config, random),
      branching: mutate(parent.genome.branching, config, random, 0, 1),
      bondPersistence: mutate(parent.genome.bondPersistence, config, random, 0.5, 2),
      foraging: mutate(parent.genome.foraging, config, random, 0, 1),
      motility: mutate(parent.genome.motility, config, random, 0, 1),
      resilience: mutate(parent.genome.resilience, config, random, 0, 1),
    }
    const distance = parent.radius + radius + 0.1
    const candidate = {
      x: clamp(parent.x + Math.cos(direction) * distance, radius, width - radius),
      y: clamp(parent.y + Math.sin(direction) * distance, radius, height - radius),
    }
    const daughter = new Organism(
      id,
      candidate.x,
      candidate.y,
      direction,
      parent.speed,
      radius,
      energy,
      parent.maxEnergy,
      parent.baseMetabolismRate,
      parent.movementEnergyCost,
      genome,
      parent.generation + 1,
      parent.id,
      parent.lineageId,
      birthTick,
    )
    const dx = daughter.x - parent.x
    const dy = daughter.y - parent.y
    const length = Math.max(Number.EPSILON, Math.hypot(dx, dy))
    const requiredDistance = supportRadius(parent, dx / length, dy / length) + supportRadius(daughter, -dx / length, -dy / length) + 0.1
    const extents = cellBoundaryExtents(daughter)
    daughter.x = clamp(parent.x + Math.cos(direction) * requiredDistance, Math.min(extents.x, width / 2), Math.max(width - extents.x, width / 2))
    daughter.y = clamp(parent.y + Math.sin(direction) * requiredDistance, Math.min(extents.y, height / 2), Math.max(height - extents.y, height / 2))
    if (terrain && !terrain.canOccupy(daughter.x, daughter.y, radius, genome.aspectRatio, direction)) {
      const valid = findHabitablePosition(terrain, parent.x, parent.y, radius, genome.aspectRatio, direction)
      if (valid) { daughter.x = valid.x; daughter.y = valid.y }
      else { daughter.x = parent.x; daughter.y = parent.y }
    }
    return daughter
  }
}

function randomHabitablePosition(terrain: TerrainMap, radius: number, random: SeededRandom): { x: number; y: number } | undefined {
  const eligible: number[] = []
  for (let index = 0; index < terrain.cells.length; index += 1) {
    if (terrain.cells[index].traversable) eligible.push(index)
  }
  if (eligible.length === 0) return undefined
  const start = Math.floor(random.next() * eligible.length)
  for (let attempt = 0; attempt < eligible.length; attempt += 1) {
    const cellIndex = eligible[(start + attempt) % eligible.length]
    const column = cellIndex % terrain.columns
    const row = Math.floor(cellIndex / terrain.columns)
    const left = column * terrain.config.cellSize
    const top = row * terrain.config.cellSize
    const cellWidth = Math.min(terrain.config.cellSize, terrain.width - left)
    const cellHeight = Math.min(terrain.config.cellSize, terrain.height - top)
    const inset = radius * 1.5
    const x = left + Math.min(inset, cellWidth / 2) + random.next() * Math.max(0, cellWidth - Math.min(inset, cellWidth / 2) * 2)
    const y = top + Math.min(inset, cellHeight / 2) + random.next() * Math.max(0, cellHeight - Math.min(inset, cellHeight / 2) * 2)
    if (terrain.canOccupy(x, y, radius)) return { x, y }
  }
  return undefined
}

function findHabitablePosition(terrain: TerrainMap, x: number, y: number, radius: number, aspect: number, direction: number): { x: number; y: number } | undefined {
  let nearest: { x: number; y: number; distance: number } | undefined
  for (let index = 0; index < terrain.cells.length; index += 1) {
    if (!terrain.cells[index].traversable) continue
    const column = index % terrain.columns
    const row = Math.floor(index / terrain.columns)
    const candidateX = Math.min(terrain.width, (column + 0.5) * terrain.config.cellSize)
    const candidateY = Math.min(terrain.height, (row + 0.5) * terrain.config.cellSize)
    if (!terrain.canOccupy(candidateX, candidateY, radius, aspect, direction)) continue
    const distance = (candidateX - x) ** 2 + (candidateY - y) ** 2
    if (distance <= terrain.config.cellSize ** 2 * 4 && (!nearest || distance < nearest.distance)) nearest = { x: candidateX, y: candidateY, distance }
  }
  return nearest
}

function mutate(value: number, config: WorldConfig, random: SeededRandom, minimum: number, maximum: number): number {
  if (random.next() >= config.mutationRate) return value
  const change = (random.next() * 2 - 1) * config.mutationStep
  return Math.max(minimum, Math.min(maximum, value + change))
}

function mutateAngle(value: number, config: WorldConfig, random: SeededRandom): number {
  if (random.next() >= config.mutationRate) return value
  const change = (random.next() * 2 - 1) * config.mutationStep * Math.PI
  const angle = value + change
  return ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
