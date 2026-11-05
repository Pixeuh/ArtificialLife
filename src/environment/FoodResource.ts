import type { FoodSnapshot } from '../core/types'

export class FoodResource implements FoodSnapshot {
  constructor(readonly id: string, readonly x: number, readonly y: number, readonly radius: number, readonly energy: number) {}

  snapshot(): FoodSnapshot {
    return { id: this.id, x: this.x, y: this.y, radius: this.radius, energy: this.energy }
  }
}
