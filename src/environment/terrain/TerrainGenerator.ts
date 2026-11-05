import { BIOME_RULES, TERRAIN_DEFAULTS, type Biome, type TerrainCell, type TerrainGenerationConfig, type TerrainSnapshot } from './terrainTypes'

export function normalizeTerrainConfig(config: Partial<TerrainGenerationConfig> = {}): TerrainGenerationConfig {
  return {
    cellSize: clamp(Number.isFinite(config.cellSize) ? config.cellSize! : TERRAIN_DEFAULTS.cellSize, 24, 240),
    relief: clamp(Number.isFinite(config.relief) ? config.relief! : TERRAIN_DEFAULTS.relief, 0, 1),
    moisture: clamp(Number.isFinite(config.moisture) ? config.moisture! : TERRAIN_DEFAULTS.moisture, 0, 1),
    waterCoverage: clamp(Number.isFinite(config.waterCoverage) ? config.waterCoverage! : TERRAIN_DEFAULTS.waterCoverage, 0, 0.6),
  }
}

export function generateTerrain(width: number, height: number, seed: number, partialConfig?: Partial<TerrainGenerationConfig>): TerrainSnapshot {
  if (!(width > 0) || !(height > 0)) throw new RangeError('World dimensions must be positive to generate terrain.')
  const config = normalizeTerrainConfig(partialConfig)
  const columns = Math.max(1, Math.ceil(width / config.cellSize))
  const rows = Math.max(1, Math.ceil(height / config.cellSize))
  const rawElevation = new Array<number>(columns * rows)
  const moistureValues = new Array<number>(columns * rows)
  const temperatureValues = new Array<number>(columns * rows)

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column
      const x = column + 0.5
      const y = row + 0.5
      rawElevation[index] = fractalNoise(x, y, seed ^ 0x1f123bb5, 0.055)
      moistureValues[index] = clamp(fractalNoise(x, y, seed ^ 0x5f356495, 0.075) + (config.moisture - 0.5) * 0.9, 0, 1)
      const latitude = rows <= 1 ? 0.5 : 1 - row / (rows - 1)
      temperatureValues[index] = clamp(latitude * 0.72 + fractalNoise(x, y, seed ^ 0x7f4a7c15, 0.06) * 0.28, 0, 1)
    }
  }

  const waterCount = Math.min(rawElevation.length - 1, Math.floor(rawElevation.length * config.waterCoverage))
  const waterIndices = new Set(Array.from({ length: rawElevation.length }, (_, index) => index)
    .sort((a, b) => rawElevation[a] - rawElevation[b] || a - b)
    .slice(0, waterCount))
  const cells: TerrainCell[] = rawElevation.map((value, index) => {
    const elevation = clamp(0.5 + (value - 0.5) * config.relief * 2.15, 0, 1)
    const moisture = moistureValues[index]
    const temperature = temperatureValues[index]
    const isWater = waterIndices.has(index)
    const biome: Biome = isWater ? 'water'
      : elevation > 0.79 ? 'mountain'
        : moisture < 0.29 && temperature > 0.43 ? 'desert'
          : moisture > 0.58 ? 'forest' : 'plains'
    const rule = BIOME_RULES[biome]
    const terrainType = biome === 'water' ? 'water' : biome === 'mountain' ? 'rock' : 'soil'
    return { elevation, moisture, temperature, terrainType, biome, traversable: rule.traversable, movementCost: rule.movementCost, foodPotential: rule.foodPotential }
  })
  return { width, height, seed: seed >>> 0, config, columns, rows, cells }
}

function fractalNoise(x: number, y: number, seed: number, baseFrequency: number): number {
  let total = 0
  let amplitude = 1
  let amplitudeTotal = 0
  let frequency = baseFrequency
  for (let octave = 0; octave < 4; octave += 1) {
    total += valueNoise(x * frequency, y * frequency, seed + octave * 0x9e3779b9) * amplitude
    amplitudeTotal += amplitude
    amplitude *= 0.52
    frequency *= 2.05
  }
  return total / amplitudeTotal
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = smooth(x - x0)
  const ty = smooth(y - y0)
  const top = mix(hashNoise(x0, y0, seed), hashNoise(x0 + 1, y0, seed), tx)
  const bottom = mix(hashNoise(x0, y0 + 1, seed), hashNoise(x0 + 1, y0 + 1, seed), tx)
  return mix(top, bottom, ty)
}

function hashNoise(x: number, y: number, seed: number): number {
  let hash = Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495) ^ seed
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d)
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b)
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffff_ffff
}

function smooth(value: number): number { return value * value * (3 - 2 * value) }
function mix(a: number, b: number, amount: number): number { return a + (b - a) * amount }
function clamp(value: number, minimum: number, maximum: number): number { return Math.max(minimum, Math.min(maximum, value)) }

