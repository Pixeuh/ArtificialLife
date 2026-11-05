import { describe, expect, it } from 'vitest'
import { SeededRandom } from '../../core/SeededRandom'
import { Simulation } from '../../core/Simulation'
import { WORLD_DEFAULTS } from '../../core/types'
import { Organism } from '../../organisms/Organism'
import { OrganismFactory } from '../../organisms/OrganismFactory'
import { FoodResource } from '../FoodResource'
import { ResourceManager } from '../ResourceManager'
import { MovementSystem } from '../../systems/MovementSystem'
import { MetabolismSystem } from '../../systems/MetabolismSystem'
import { AdhesionSystem } from '../../systems/AdhesionSystem'
import { CellPhysicsSystem } from '../../systems/CellPhysicsSystem'
import { BIOME_RULES, type Biome, type TerrainCell } from './terrainTypes'
import { TerrainMap } from './TerrainMap'

const definition = (seed = 814, config = {}) => ({
  id: `terrain-${seed}`, name: 'Terrain test', width: 1_200, height: 800, seed,
  config: { initialOrganismCount: 24, initialFoodCount: 80, maxFoodCount: 100, ...config },
  terrainConfig: { cellSize: 40, relief: 0.7, moisture: 0.54, waterCoverage: 0.3 },
})

describe('procedural terrain', () => {
  it('is deterministic for the same seed and configuration, and changes with a new seed', () => {
    const first = new TerrainMap(1_200, 800, 71, { cellSize: 40 })
    const replay = new TerrainMap(1_200, 800, 71, { cellSize: 40 })
    const different = new TerrainMap(1_200, 800, 72, { cellSize: 40 })
    expect(first.snapshot()).toEqual(replay.snapshot())
    expect(first.cells).not.toEqual(different.cells)
  })

  it('keeps environmental values in range and preserves habitable land at the maximum water setting', () => {
    const terrain = new TerrainMap(400, 240, 191, { cellSize: 20, relief: 2, moisture: -1, waterCoverage: 1 })
    expect(terrain.config).toMatchObject({ relief: 1, moisture: 0, waterCoverage: 0.6 })
    expect(terrain.cells.every(cell => [cell.elevation, cell.moisture, cell.temperature].every(value => value >= 0 && value <= 1))).toBe(true)
    expect(terrain.cells.every(cell => ['soil', 'rock', 'water'].includes(cell.terrainType))).toBe(true)
    expect(terrain.cells.some(cell => cell.traversable)).toBe(true)
    expect(terrain.cells.some(cell => !cell.traversable)).toBe(true)
  })

  it('creates spatially varied biome regions for the demonstration worlds', () => {
    const terrain = new TerrainMap(4_000, 2_500, 38_104_721)
    const biomes = new Set(terrain.cells.map(cell => cell.biome))
    expect(biomes.has('water')).toBe(true)
    expect(biomes.size).toBeGreaterThanOrEqual(3)
  })

  it('keeps each world terrain instance independent and replays the exact initial world', () => {
    const first = new Simulation(definition(208))
    const second = new Simulation({ ...definition(209), id: 'second-world' })
    expect(first.world.terrain.cells).not.toBe(second.world.terrain.cells)
    const initialTerrain = first.world.terrain.snapshot()
    const initialCells = first.world.organisms.map(cell => cell.snapshot())
    const initialFood = first.world.resources.map(food => food.snapshot())
    first.step()
    first.reset()
    expect(first.world.terrain.snapshot()).toEqual(initialTerrain)
    expect(first.world.organisms.map(cell => cell.snapshot())).toEqual(initialCells)
    expect(first.world.resources.map(food => food.snapshot())).toEqual(initialFood)
  })

  it('initializes organisms and food only on accessible, productive land', () => {
    const simulation = new Simulation(definition())
    const terrain = simulation.world.terrain
    expect(simulation.world.organisms).toHaveLength(24)
    expect(simulation.world.organisms.every(cell => terrain.canOccupy(cell.x, cell.y, cell.radius, cell.genome.aspectRatio, cell.direction))).toBe(true)
    expect(simulation.world.resources).toHaveLength(80)
    expect(simulation.world.resources.every(food => {
      const cell = terrain.cellAt(food.x, food.y)
      return cell?.traversable && cell.foodPotential > 0 && terrain.canSpawnResourceAt(food.x, food.y)
    })).toBe(true)
  })

  it('does not place organisms when the world has no region wide enough for their bodies', () => {
    const simulation = new Simulation({
      id: 'no-habitat', name: 'No habitat', width: 160, height: 160, seed: 5,
      config: { initialOrganismCount: 8, organismRadius: 100 },
      terrainConfig: { cellSize: 40, waterCoverage: 0.6 },
    })
    expect(simulation.world.organisms).toHaveLength(0)
    expect(simulation.world.snapshot().statistics.initialPopulation).toBe(0)
  })

  it('regenerates resources in productive traversable biomes and remains deterministic', () => {
    const run = () => {
      const simulation = new Simulation(definition(72, { initialOrganismCount: 0, initialFoodCount: 0, maxFoodCount: 12, foodRegenerationRate: 30 }))
      for (let tick = 0; tick < 12; tick += 1) simulation.step()
      return simulation.world.resources.map(food => ({ food, cell: simulation.world.terrain.cellAt(food.x, food.y) }))
    }
    const first = run()
    expect(run()).toEqual(first)
    expect(first.length).toBeGreaterThan(0)
    expect(first.every(({ cell }) => cell?.traversable && cell.foodPotential > 0)).toBe(true)
  })

  it('blocks movement into water and scales speed by the current biome cost', () => {
    const terrain = new TerrainMap(300, 300, 1, { cellSize: 100, waterCoverage: 0 })
    setBiome(terrain, 1 * terrain.columns + 2, 'water')
    const blocked = new Organism('blocked', 150, 150, 0, 100, 2, 50)
    MovementSystem.update([blocked], 300, 300, { ...WORLD_DEFAULTS, turnRate: 0 }, new SeededRandom(9), 1, terrain)
    expect(terrain.cellAt(blocked.x, blocked.y)?.traversable).toBe(true)
    expect(blocked.x).toBe(150)

    setBiome(terrain, 1 * terrain.columns + 2, 'plains')
    setBiome(terrain, 1 * terrain.columns + 1, 'forest')
    const onPlain = new Organism('plain', 250, 150, 0, 10, 2, 50)
    const inForest = new Organism('forest', 150, 150, 0, 10, 2, 50)
    MovementSystem.update([onPlain], 300, 300, { ...WORLD_DEFAULTS, turnRate: 0 }, new SeededRandom(10), 0.5, terrain)
    MovementSystem.update([inForest], 300, 300, { ...WORLD_DEFAULTS, turnRate: 0 }, new SeededRandom(10), 0.5, terrain)
    expect(inForest.x - 150).toBeCloseTo(5 / BIOME_RULES.forest.movementCost)
    expect(onPlain.x - 250).toBeCloseTo(5 / BIOME_RULES.plains.movementCost)
    const forestEnergy = inForest.energy
    MetabolismSystem.update([inForest], 0.5, [], 0, terrain)
    expect(forestEnergy - inForest.energy).toBeCloseTo(inForest.baseMetabolismRate * 0.5 + (10 / BIOME_RULES.forest.movementCost) * 0.5 * inForest.movementEnergyCost)
  })

  it('places offspring near their parent when water blocks the direct division position', () => {
    const simulation = new Simulation(definition(91, { initialOrganismCount: 0, initialFoodCount: 0, mutationRate: 0, divisionEnergyThreshold: 90 }))
    const terrain = simulation.world.terrain
    const land = terrain.cells.findIndex(cell => cell.traversable)
    const column = land % terrain.columns
    const row = Math.floor(land / terrain.columns)
    const x = Math.min(simulation.world.width, (column + 0.5) * terrain.config.cellSize)
    const y = Math.min(simulation.world.height, (row + 0.5) * terrain.config.cellSize)
    const parent = new Organism('parent', x, y, 0, 0, 7, 100, 100, 0, 0)
    simulation.world.organisms.push(parent)
    const child = OrganismFactory.createOffspring(parent, 'child', simulation.world.width, simulation.world.height, simulation.world.config, new SeededRandom(3), 50, terrain)
    expect(terrain.canOccupy(child.x, child.y, child.radius, child.genome.aspectRatio, child.direction)).toBe(true)
    expect(Math.hypot(child.x - parent.x, child.y - parent.y)).toBeLessThanOrEqual(terrain.config.cellSize * 2)
  })

  it('keeps linked cells on traversable terrain when a colony meets a water wall', () => {
    const simulation = new Simulation({ id: 'colony-wall', name: 'Colony wall', width: 400, height: 200, seed: 11, config: { initialOrganismCount: 0, initialFoodCount: 0 }, terrainConfig: { cellSize: 40, waterCoverage: 0 } })
    const terrain = simulation.world.terrain
    for (let index = 0; index < terrain.cells.length; index += 1) setBiome(terrain, index, 'plains')
    for (let row = 0; row < terrain.rows; row += 1) setBiome(terrain, row * terrain.columns + 5, 'water')
    const first = new Organism('colony-a', 170, 100, 0, 50, 5, 50)
    const second = new Organism('colony-b', 180.1, 100, 0, 50, 5, 50)
    simulation.world.organisms.push(first, second)
    simulation.world.links.push({ id: 'colony-a::colony-b', cellAId: first.id, cellBId: second.id, restLength: 10.1, breakDistance: 20, strength: 0.8 })

    MovementSystem.update(simulation.world.organisms, simulation.world.width, simulation.world.height, simulation.world.config, new SeededRandom(4), 1, terrain)
    CellPhysicsSystem.resolve(simulation.world.organisms, simulation.world.width, simulation.world.height, 2, terrain)
    AdhesionSystem.constrain(simulation.world, terrain)

    expect(simulation.world.organisms.every(cell => terrain.canOccupy(cell.x, cell.y, cell.radius, cell.genome.aspectRatio, cell.direction))).toBe(true)
    if (simulation.world.links.length) expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeLessThanOrEqual(simulation.world.links[0].breakDistance)
  })

  it('keeps a running population on traversable terrain through movement and physical resolution', () => {
    const simulation = new Simulation(definition(125))
    for (let tick = 0; tick < 180; tick += 1) simulation.step()
    expect(simulation.world.organisms.every(cell => simulation.world.terrain.canOccupy(cell.x, cell.y, cell.radius, cell.genome.aspectRatio, cell.direction))).toBe(true)
  })

  it('does not loop when a hand-built map has no eligible cells', () => {
    const terrain = new TerrainMap(160, 160, 5, { cellSize: 40 })
    for (let index = 0; index < terrain.cells.length; index += 1) setBiome(terrain, index, 'water')
    const resources: FoodResource[] = []
    const manager = new ResourceManager(resources, 160, 160, { ...WORLD_DEFAULTS }, new SeededRandom(7), terrain)
    manager.createInitial(10)
    manager.regenerate(10)
    expect(resources).toHaveLength(0)
  })
})

function setBiome(terrain: TerrainMap, index: number, biome: Biome): void {
  const rule = BIOME_RULES[biome]
  ;(terrain.cells as TerrainCell[])[index] = {
    elevation: 0.5, moisture: 0.5, temperature: 0.5, terrainType: biome === 'water' ? 'water' : biome === 'mountain' ? 'rock' : 'soil', biome,
    traversable: rule.traversable, movementCost: rule.movementCost, foodPotential: rule.foodPotential,
  }
}
