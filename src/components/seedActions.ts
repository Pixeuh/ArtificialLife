/** Generate UI seeds with Web Crypto; simulation code continues to use SeededRandom. */
export function generateNewSeed(currentSeed: number, fill: (values: Uint32Array<ArrayBuffer>) => void = values => { globalThis.crypto.getRandomValues(values) }): number {
  const values = new Uint32Array(new ArrayBuffer(4))
  fill(values)
  const candidate = values[0] >>> 0
  return candidate === (currentSeed >>> 0) ? (candidate + 1) >>> 0 : candidate
}
