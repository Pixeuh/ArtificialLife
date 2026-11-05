import type { CellGenome, OrganismSnapshot } from '../core/types'

export class Organism {
  age = 0
  active = true
  foodConsumed = 0

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
    readonly genome: CellGenome = { adhesion: 0, aspectRatio: 1 },
    readonly generation = 0,
  ) {}

  snapshot(): OrganismSnapshot {
    return { id: this.id, x: this.x, y: this.y, direction: this.direction, speed: this.speed, radius: this.radius, age: this.age, energy: this.energy, maxEnergy: this.maxEnergy, baseMetabolismRate: this.baseMetabolismRate, movementEnergyCost: this.movementEnergyCost, active: this.active, foodConsumed: this.foodConsumed, genome: this.genome, generation: this.generation, colonyId: this.id, colonySize: 1 }
  }
}
