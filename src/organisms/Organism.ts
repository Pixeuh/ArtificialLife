import type { OrganismSnapshot } from '../core/types'

export class Organism implements OrganismSnapshot {
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
  ) {}

  snapshot(): OrganismSnapshot {
    return { id: this.id, x: this.x, y: this.y, direction: this.direction, speed: this.speed, radius: this.radius, age: this.age, energy: this.energy, active: this.active, foodConsumed: this.foodConsumed }
  }
}
