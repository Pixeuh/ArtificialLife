/** Small deterministic PRNG (Mulberry32). Each world owns its own instance. */
export class SeededRandom {
  private readonly initialSeed: number
  private state: number

  constructor(seed: number) {
    this.initialSeed = seed >>> 0
    this.state = this.initialSeed
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0
    let value = this.state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  getState(): number {
    return this.state >>> 0
  }

  restoreState(state: number): void {
    if (!Number.isInteger(state) || state < 0 || state > 0xffff_ffff) throw new RangeError('PRNG state must be an unsigned 32-bit integer.')
    this.state = state >>> 0
  }

  reset(seed = this.initialSeed): void {
    this.state = seed >>> 0
  }
}
