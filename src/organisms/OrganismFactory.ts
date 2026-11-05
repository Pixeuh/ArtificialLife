import type { CellGenome, WorldConfig } from '../core/types'
import type { SeededRandom } from '../core/SeededRandom'
import { Organism } from './Organism'
import type { TerrainMap } from '../environment/terrain/TerrainMap'

export class OrganismFactory {
  static createAll(count: number, width: number, height: number, config: WorldConfig, random: SeededRandom, terrain?: TerrainMap): Organism[] {
    const organisms: Organism[] = []
    for (let index = 0; index < count; index += 1) {
      const radius = config.organismRadius
      const position = terrain ? randomHabitablePosition(terrain, radius, random) : undefined
      if (terrain && !position) break
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
        { adhesion: random.next(), aspectRatio: 0.75 + random.next() * 0.5 },
        0,
      ))
    }
    return organisms
  }

  static createOffspring(parent: Organism, id: string, width: number, height: number, config: WorldConfig, random: SeededRandom, energy: number, terrain?: TerrainMap): Organism {
    const direction = random.next() * Math.PI * 2
    const radius = parent.radius
    const distance = parent.radius + radius + 0.1
    const genome: CellGenome = {
      adhesion: mutate(parent.genome.adhesion, config, random, 0, 1),
      aspectRatio: mutate(parent.genome.aspectRatio, config, random, 0.5, 2),
    }
    const candidate = {
      x: clamp(parent.x + Math.cos(direction) * distance, radius, width - radius),
      y: clamp(parent.y + Math.sin(direction) * distance, radius, height - radius),
    }
    if (terrain && !terrain.canOccupy(candidate.x, candidate.y, radius, genome.aspectRatio, direction)) {
      const valid = findHabitablePosition(terrain, parent.x, parent.y, radius, genome.aspectRatio, direction)
      if (valid) { candidate.x = valid.x; candidate.y = valid.y }
      else { candidate.x = parent.x; candidate.y = parent.y }
    }
    return new Organism(
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
    )
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
