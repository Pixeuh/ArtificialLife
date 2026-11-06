import type { CellExpression, CellGenome, NormalizedCellGenome, OrganismSnapshot } from '../core/types'

export class Organism {
  age = 0
  active = true
  foodConsumed = 0
  readonly genome: NormalizedCellGenome
  expression: CellExpression = { foraging: 0.5, motility: 0.5, resilience: 0.5, localResourceSignal: 0, colonyEdgeSignal: 0.5 }

  constructor(
    readonly id: string,
    public x: number,
    public y: number,
    public direction: number,
    readonly speed: number,
    readonly radius: number,
    public energy: number,
    readonly maxEnergy = 100,
    readonly baseMetabolismRate = 0.08,
    readonly movementEnergyCost = 0.0005,
    genome: CellGenome = { adhesion: 0, aspectRatio: 1 },
    readonly generation = 0,
    readonly parentId: string | null = null,
    readonly lineageId: string = id,
    readonly birthTick = 0,
  ) {
    this.genome = normalizeGenome(genome)
  }

  snapshot(): OrganismSnapshot {
    return { id: this.id, x: this.x, y: this.y, direction: this.direction, speed: this.speed, radius: this.radius, age: this.age, energy: this.energy, maxEnergy: this.maxEnergy, baseMetabolismRate: this.baseMetabolismRate, movementEnergyCost: this.movementEnergyCost, active: this.active, foodConsumed: this.foodConsumed, genome: this.genome, generation: this.generation, colonyId: this.id, colonySize: 1, expression: this.expression, parentId: this.parentId, lineageId: this.lineageId, birthTick: this.birthTick }
  }
}

export function normalizeGenome(genome: CellGenome): NormalizedCellGenome {
  const angle = Number.isFinite(genome.divisionAngle) ? genome.divisionAngle! : 0
  const wrappedAngle = ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  return {
    adhesion: clamp(genome.adhesion, 0, 1, 0),
    aspectRatio: clamp(genome.aspectRatio, 0.5, 2, 1),
    divisionAngle: wrappedAngle,
    branching: clamp(genome.branching ?? 0.5, 0, 1, 0.5),
    bondPersistence: clamp(genome.bondPersistence ?? 1, 0.5, 2, 1),
    foraging: clamp(genome.foraging, 0, 1, 0.5),
    motility: clamp(genome.motility, 0, 1, 0.5),
    resilience: clamp(genome.resilience, 0, 1, 0.5),
  }
}

function clamp(value: number | undefined, minimum: number, maximum: number, fallback: number): number {
  const finite = Number.isFinite(value) ? value! : fallback
  return Math.max(minimum, Math.min(maximum, finite))
}
