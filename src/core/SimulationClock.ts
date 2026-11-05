import type { World } from './World'

/** Fixed-step accumulator, decoupled from rendering and wall-clock APIs. */
export class SimulationClock {
  private accumulator = 0

  advance(world: World, elapsedSeconds: number, onStep: () => void = () => world.step()): number {
    if (world.paused || elapsedSeconds <= 0) return 0
    this.accumulator += elapsedSeconds * world.speed
    const stepDuration = world.config.tickDuration
    const steps = Math.floor(this.accumulator / stepDuration)
    if (steps > 0) {
      for (let index = 0; index < steps; index += 1) onStep()
      this.accumulator -= steps * stepDuration
    }
    return steps
  }

  reset(): void {
    this.accumulator = 0
  }
}
