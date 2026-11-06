import { describe, expect, it } from 'vitest'
import { SeededRandom } from './SeededRandom'
import { Simulation } from './Simulation'
import { WORLD_DEFAULTS, type WorldConfig } from './types'
import { Organism } from '../organisms/Organism'
import { OrganismFactory } from '../organisms/OrganismFactory'
import { FoodResource } from '../environment/FoodResource'
import { ResourceManager } from '../environment/ResourceManager'
import { MovementSystem } from '../systems/MovementSystem'
import { FeedingSystem } from '../systems/FeedingSystem'
import { MetabolismSystem } from '../systems/MetabolismSystem'
import { LifecycleSystem } from '../systems/LifecycleSystem'
import { ReproductionSystem } from '../systems/ReproductionSystem'
import { AdhesionSystem } from '../systems/AdhesionSystem'
import { getColonyMembership } from '../organisms/CellColony'
import { CellPhysicsSystem } from '../systems/CellPhysicsSystem'

const config = (patch: Partial<WorldConfig> = {}): WorldConfig => ({ ...WORLD_DEFAULTS, initialOrganismCount: 5, initialFoodCount: 8, maxFoodCount: 12, ...patch })
const definition = (id = 'test-world', seed = 12345, settings = config()) => ({ id, name: id, width: 500, height: 400, seed, config: settings })

describe('ecosystem determinism and systems', () => {
  it('creates the same organisms for the same seed and configuration', () => {
    const settings = config({ initialOrganismCount: 12 })
    const first = OrganismFactory.createAll(12, 500, 400, settings, new SeededRandom(19)).map(item => item.snapshot())
    const second = OrganismFactory.createAll(12, 500, 400, settings, new SeededRandom(19)).map(item => item.snapshot())
    expect(first).toEqual(second)
  })

  it('creates the same initial food for the same seed and configuration', () => {
    const make = () => {
      const foods: FoodResource[] = []
      const manager = new ResourceManager(foods, 500, 400, config(), new SeededRandom(20))
      manager.createInitial(8)
      return foods.map(food => food.snapshot())
    }
    expect(make()).toEqual(make())
  })

  it('moves organisms smoothly according to their direction', () => {
    const settings = config({ turnRate: 0 })
    const organism = new Organism('o-1', 100, 100, 0, 10, 5, 50)
    MovementSystem.update([organism], 500, 400, settings, new SeededRandom(1), 0.5)
    expect(organism.x).toBeCloseTo(105)
    expect(organism.y).toBe(100)
    expect(organism.age).toBeCloseTo(0.5)
  })

  it('reflects direction at world boundaries and keeps organisms inside', () => {
    const settings = config({ turnRate: 0 })
    const organism = new Organism('o-edge', 94, 100, 0, 30, 5, 50)
    MovementSystem.update([organism], 100, 200, settings, new SeededRandom(2), 0.1)
    expect(organism.x).toBe(95)
    expect(Math.cos(organism.direction)).toBeLessThan(0)
    expect(organism.y).toBeGreaterThanOrEqual(organism.radius)
    expect(organism.y).toBeLessThanOrEqual(200 - organism.radius)
  })

  it('detects contact and awards a food resource to only the first organism', () => {
    const settings = config({ maxEnergy: 100 })
    const first = new Organism('first', 50, 50, 0, 0, 5, 80)
    const second = new Organism('second', 50, 50, 0, 0, 5, 10)
    const resources = [new FoodResource('food-0', 60, 50, 5, 30)]
    FeedingSystem.update([first, second], resources, settings)
    expect(resources).toHaveLength(0)
    expect(first.energy).toBe(100)
    expect(first.foodConsumed).toBe(1)
    expect(second.energy).toBe(10)
    expect(second.foodConsumed).toBe(0)
  })

  it('uses stable spatial candidates for feeding without changing single-use resource semantics', () => {
    const settings = config({ initialOrganismCount: 0 })
    const cells = Array.from({ length: 500 }, (_, index) => new Organism(`far-${index}`, 100 + index * 100, 100, 0, 0, 5, 10))
    cells.unshift(new Organism('first', 100, 100, 0, 0, 5, 10), new Organism('second', 100, 100, 0, 0, 5, 10))
    const resources = [new FoodResource('only-once', 105, 100, 5, 30)]
    const metrics = { candidateChecks: 0, blockerChecks: 0 }
    expect(FeedingSystem.update(cells, resources, settings, metrics)).toBe(1)
    expect(resources).toHaveLength(0)
    expect(cells[0].foodConsumed).toBe(1)
    expect(cells[1].foodConsumed).toBe(0)
    expect(metrics.candidateChecks).toBeLessThan(20)
    expect(metrics.candidateChecks).toBeLessThan(cells.length)
  })

  it('regenerates resources deterministically and respects the configured cap', () => {
    const make = () => {
      const settings = config({ maxFoodCount: 3, foodRegenerationRate: 2 })
      const resources: FoodResource[] = []
      const manager = new ResourceManager(resources, 500, 400, settings, new SeededRandom(77))
      manager.createInitial(1)
      manager.regenerate(1)
      manager.regenerate(1)
      return resources.map(resource => resource.snapshot())
    }
    expect(make()).toEqual(make())
    expect(make()).toHaveLength(3)
  })

  it('recreates the configured population and resources on reset', () => {
    const simulation = new Simulation(definition())
    simulation.step()
    simulation.reset()
    expect(simulation.world.organisms).toHaveLength(5)
    expect(simulation.world.resources).toHaveLength(8)
    expect(simulation.world.tick).toBe(0)
    expect(simulation.world.organisms.every(organism => organism.age === 0)).toBe(true)
  })

  it('keeps two ecosystem simulations independent', () => {
    const first = new Simulation(definition('a', 1))
    const second = new Simulation(definition('b', 2))
    first.step()
    first.world.resources.pop()
    expect(second.world.tick).toBe(0)
    expect(second.world.resources).toHaveLength(8)
    expect(second.world.organisms.every(organism => organism.age === 0)).toBe(true)
  })

  it('reproduces complete ecosystem state after an equal number of ticks', () => {
    const first = new Simulation(definition('same', 908))
    const second = new Simulation(definition('same', 908))
    for (let tick = 0; tick < 240; tick += 1) { first.step(); second.step() }
    expect(first.world.snapshot()).toEqual(second.world.snapshot())
  })

  it('charges base metabolism while stationary and movement energy in addition', () => {
    const idle = new Organism('idle', 100, 100, 0, 0, 5, 10, 100, 0.5, 0.01)
    const moving = new Organism('moving', 100, 100, 0, 10, 5, 10, 100, 0.5, 0.01)
    MetabolismSystem.update([idle, moving], 2)
    expect(idle.energy).toBeCloseTo(9)
    expect(moving.energy).toBeCloseTo(8.8)
  })

  it('scales metabolic expenses with simulated duration and keeps energy finite/nonnegative', () => {
    const organism = new Organism('o', 20, 20, 0, 0, 2, 0.1, 100, 1, 0)
    MetabolismSystem.update([organism], 1)
    expect(organism.energy).toBe(0)
    MetabolismSystem.update([organism], Number.POSITIVE_INFINITY)
    expect(Number.isFinite(organism.energy)).toBe(true)
    expect(organism.energy).toBeGreaterThanOrEqual(0)
  })

  it('preserves historical consumption and counts starvation death once', () => {
    const simulation = new Simulation(definition('history', 12, config({ initialOrganismCount: 1, initialFoodCount: 0, baseMetabolismRate: 30, movementEnergyCost: 0, organismSpeed: 0 })))
    const organism = simulation.world.organisms[0]
    organism.energy = 0.5
    simulation.world.resources.push(new FoodResource('nearby', organism.x, organism.y, 5, 0.2))
    simulation.step()
    expect(simulation.world.organisms).toHaveLength(0)
    expect(simulation.world.snapshot().statistics).toMatchObject({ population: 0, totalDeaths: 1, starvationDeaths: 1, totalFoodConsumed: 1 })
    LifecycleSystem.removeDead(simulation.world)
    expect(simulation.world.totalDeaths).toBe(1)
  })

  it('removes an organism at zero energy before it can move or consume food', () => {
    const simulation = new Simulation(definition('zero', 9, config({ initialOrganismCount: 1, initialFoodCount: 0 })))
    const organism = simulation.world.organisms[0]
    organism.energy = 0
    const before = { x: organism.x, y: organism.y }
    simulation.world.resources.push(new FoodResource('nearby', organism.x, organism.y, 5, 30))
    simulation.step()
    expect(simulation.world.organisms).toHaveLength(0)
    expect(simulation.world.resources).toHaveLength(1)
    expect(simulation.world.totalFoodConsumed).toBe(0)
    expect({ x: organism.x, y: organism.y }).toEqual(before)
  })

  it('caps initial energy, sanitizes invalid metabolic settings, and resets historical counters', () => {
    const simulation = new Simulation(definition('normalize', 4, config({ initialOrganismCount: 1, initialEnergy: 120, maxEnergy: 25, baseMetabolismRate: Number.NaN, movementEnergyCost: -2 })))
    expect(simulation.world.config.initialEnergy).toBe(25)
    expect(simulation.world.config.baseMetabolismRate).toBe(0)
    expect(simulation.world.config.movementEnergyCost).toBe(0)
    expect(simulation.world.organisms[0].energy).toBe(25)
    simulation.world.totalDeaths = 4
    simulation.world.totalFoodConsumed = 11
    simulation.reset()
    expect(simulation.world.snapshot().statistics).toMatchObject({ totalDeaths: 0, starvationDeaths: 0, totalFoodConsumed: 0, population: 1 })
  })

  it('applies the same per-tick energy rule regardless of simulation speed', () => {
    const setup = () => new Simulation(definition('speed', 5, config({ initialOrganismCount: 1, initialFoodCount: 0, turnRate: 0 })))
    const ordinary = setup()
    const accelerated = setup()
    ordinary.step()
    accelerated.setSpeed(10)
    accelerated.step()
    expect(accelerated.world.organisms[0].energy).toBe(ordinary.world.organisms[0].energy)
    expect(accelerated.world.tick).toBe(ordinary.world.tick)
  })

  it('reports an empty extinct population with zero averages', () => {
    const simulation = new Simulation(definition('extinct', 7, config({ initialOrganismCount: 0, initialFoodCount: 0 })))
    expect(simulation.world.snapshot().statistics).toMatchObject({ population: 0, averageEnergy: 0, averageAge: 0, initialPopulation: 0 })
  })

  it('inherits adhesion and morphology genes through cell division', () => {
    const settings = config({ initialOrganismCount: 0, initialFoodCount: 0, mutationRate: 0, divisionEnergyThreshold: 90 })
    const simulation = new Simulation(definition('inheritance', 3, settings))
    const parent = new Organism('parent', 100, 100, 0, 0, 5, 100, 100, 0, 0, { adhesion: 0.8, aspectRatio: 1.4 }, 2)
    simulation.world.organisms.push(parent)
    simulation.world.nextOrganismNumber = 1
    expect(ReproductionSystem.update(simulation.world, new SeededRandom(10))).toBe(1)
    const daughter = simulation.world.organisms[1]
    expect(daughter.generation).toBe(3)
    expect(daughter.genome).toEqual(parent.genome)
    expect(parent.energy + daughter.energy).toBe(100)
  })

  it('mutates heritable genes at the configured rate and bounds', () => {
    const settings = config({ initialOrganismCount: 0, mutationRate: 1, mutationStep: 0.2, divisionEnergyThreshold: 90 })
    const simulation = new Simulation(definition('mutation', 4, settings))
    const parent = new Organism('parent', 100, 100, 0, 0, 5, 100, 100, 0, 0, { adhesion: 0.5, aspectRatio: 1 }, 0)
    simulation.world.organisms.push(parent)
    ReproductionSystem.update(simulation.world, new SeededRandom(18))
    const child = simulation.world.organisms[1]
    expect(child.genome).not.toEqual(parent.genome)
    expect(child.genome.adhesion).toBeGreaterThanOrEqual(0)
    expect(child.genome.adhesion).toBeLessThanOrEqual(1)
    expect(child.genome.aspectRatio).toBeGreaterThanOrEqual(0.5)
    expect(child.genome.aspectRatio).toBeLessThanOrEqual(2)
    expect(child.genome.branching).toBeGreaterThanOrEqual(0)
    expect(child.genome.branching).toBeLessThanOrEqual(1)
    expect(child.genome.bondPersistence).toBeGreaterThanOrEqual(0.5)
    expect(child.genome.bondPersistence).toBeLessThanOrEqual(2)
    expect(child.genome.divisionAngle).toBeGreaterThanOrEqual(-Math.PI)
    expect(child.genome.divisionAngle).toBeLessThanOrEqual(Math.PI)
  })

  it('inherits division-axis, branching and bond persistence traits without mutation', () => {
    const simulation = new Simulation(definition('morphology-inheritance', 17, config({ initialOrganismCount: 0, initialFoodCount: 0, mutationRate: 0 })))
    const parent = new Organism('parent', 100, 100, 0, 0, 5, 100, 100, 0, 0, { adhesion: 1, aspectRatio: 1, divisionAngle: 0.4, branching: 0.7, bondPersistence: 1.6 })
    simulation.world.organisms.push(parent)
    ReproductionSystem.update(simulation.world, new SeededRandom(5))
    expect(simulation.world.organisms[1].genome).toEqual(parent.genome)
  })

  it('places daughters along the inherited division axis and forms seeded branches', () => {
    const makeDaughter = (branching: number, seed: number) => {
      const settings = config({ initialOrganismCount: 0, initialFoodCount: 0, mutationRate: 0 })
      const simulation = new Simulation(definition('division-axis', seed, settings))
      const parent = new Organism('parent', 200, 200, 0, 0, 5, 100, 100, 0, 0, { adhesion: 0, aspectRatio: 1, divisionAngle: Math.PI / 2, branching, bondPersistence: 1 })
      simulation.world.organisms.push(parent)
      ReproductionSystem.update(simulation.world, new SeededRandom(seed))
      return simulation.world.organisms[1]
    }
    const axial = makeDaughter(0, 12)
    expect(axial.x).toBeCloseTo(200)
    expect(axial.y).toBeGreaterThan(200)
    expect(axial.direction).toBeCloseTo(Math.PI / 2)
    const branchA = makeDaughter(1, 44)
    const branchB = makeDaughter(1, 44)
    expect(branchA.snapshot()).toEqual(branchB.snapshot())
    expect(Math.abs(branchA.x - 200)).toBeGreaterThan(1)
  })

  it('gives persistent bonds a larger stress allowance and higher upkeep', () => {
    const createBond = (persistence: number, id: string) => {
      const simulation = new Simulation(definition(id, 3, config({ initialOrganismCount: 0, initialFoodCount: 0, mutationRate: 0, adhesionEnergyCost: 0.5 })))
      const parent = new Organism('parent', 200, 200, 0, 0, 5, 100, 100, 0, 0, { adhesion: 1, aspectRatio: 1, divisionAngle: 0, branching: 0, bondPersistence: persistence })
      simulation.world.organisms.push(parent)
      ReproductionSystem.update(simulation.world, new SeededRandom(9))
      return simulation
    }
    const fragile = createBond(0.5, 'fragile')
    const persistent = createBond(2, 'persistent')
    expect(persistent.world.links[0].breakDistance).toBeGreaterThan(fragile.world.links[0].breakDistance)
    for (const simulation of [fragile, persistent]) for (const cell of simulation.world.organisms) cell.energy = 10
    const fragileCells = fragile.world.organisms
    const fragileLink = fragile.world.links[0]
    fragileCells[1].x = fragileCells[0].x + fragileLink.restLength * 1.8
    expect(AdhesionSystem.constrain(fragile.world)).toBe(1)
    const persistentCells = persistent.world.organisms
    const persistentLink = persistent.world.links[0]
    persistentCells[1].x = persistentCells[0].x + persistentLink.restLength * 1.8
    expect(AdhesionSystem.constrain(persistent.world)).toBe(0)
    MetabolismSystem.update(persistent.world.organisms, 1, persistent.world.links, 0.5)
    expect(persistent.world.organisms.every(cell => cell.energy < 9.1)).toBe(true)
  })

  it('grows a linked colony from repeated cell divisions with valid energies and positions', () => {
    const simulation = new Simulation(definition('colony-growth', 22, config({ initialOrganismCount: 0, initialFoodCount: 0, mutationRate: 0, adhesionEnergyCost: 0 })))
    simulation.world.organisms.push(new Organism('root', 250, 200, 0, 0, 5, 100, 100, 0, 0, { adhesion: 1, aspectRatio: 1, divisionAngle: 0.3, branching: 0.8, bondPersistence: 1 }))
    for (let generation = 0; generation < 3; generation += 1) {
      for (const cell of simulation.world.organisms) cell.energy = 100
      ReproductionSystem.update(simulation.world, new SeededRandom(100 + generation))
      AdhesionSystem.constrain(simulation.world)
      CellPhysicsSystem.resolve(simulation.world.organisms, simulation.world.width, simulation.world.height)
    }
    const snapshot = simulation.world.snapshot()
    expect(snapshot.organisms.length).toBe(8)
    expect(snapshot.statistics.colonies).toBe(1)
    expect(snapshot.statistics.largestColonySize).toBe(8)
    expect(simulation.world.organisms.every(cell => Number.isFinite(cell.x) && Number.isFinite(cell.y) && Number.isFinite(cell.energy) && cell.energy >= 0)).toBe(true)
  })

  it('reports geometric colony elongation and average link density from live topology', () => {
    const simulation = new Simulation(definition('geometry-stats', 25, config({ initialOrganismCount: 0, initialFoodCount: 0 })))
    const a = new Organism('a', 50, 50, 0, 0, 5, 20)
    const b = new Organism('b', 70, 50, 0, 0, 5, 20)
    simulation.world.organisms.push(a, b)
    simulation.world.links.push({ id: 'a::b', cellAId: 'a', cellBId: 'b', restLength: 20, breakDistance: 30, strength: 0.5 })
    expect(simulation.world.snapshot().statistics).toMatchObject({ colonies: 1, averageLinksPerCell: 1 })
    expect(simulation.world.snapshot().statistics.averageColonyElongation).toBeGreaterThan(1)
    simulation.world.links = []
    expect(simulation.world.snapshot().statistics.averageColonyElongation).toBe(0)
  })

  it('removes dead cells from colony topology without invalidating surviving cells', () => {
    const simulation = new Simulation(definition('cell-death-link', 27, config({ initialOrganismCount: 0, initialFoodCount: 0 })))
    const dying = new Organism('dying', 100, 100, 0, 0, 5, 0)
    const survivor = new Organism('survivor', 110, 100, 0, 0, 5, 20)
    simulation.world.organisms.push(dying, survivor)
    simulation.world.links.push({ id: 'dying::survivor', cellAId: dying.id, cellBId: survivor.id, restLength: 10, breakDistance: 20, strength: 0.8 })
    LifecycleSystem.removeDead(simulation.world)
    AdhesionSystem.removeDangling(simulation.world)
    expect(simulation.world.organisms.map(cell => cell.id)).toEqual(['survivor'])
    expect(simulation.world.links).toHaveLength(0)
    expect(simulation.world.snapshot().statistics).toMatchObject({ colonies: 0, isolatedCells: 1, totalDeaths: 1 })
  })

  it('creates colonies only through division and derives membership from bonds', () => {
    const simulation = new Simulation(definition('colony', 8, config({ initialOrganismCount: 0, mutationRate: 0, divisionEnergyThreshold: 90 })))
    const parent = new Organism('parent', 100, 100, 0, 0, 5, 100, 100, 0, 0, { adhesion: 1, aspectRatio: 1 }, 0)
    simulation.world.organisms.push(parent)
    ReproductionSystem.update(simulation.world, new SeededRandom(2))
    expect(simulation.world.links).toHaveLength(1)
    const child = simulation.world.organisms[1]
    expect(getColonyMembership(simulation.world.organisms, simulation.world.links).get(child.id)?.size).toBe(2)
    expect(simulation.world.snapshot().statistics.colonies).toBe(1)
  })

  it('constrains linked cells near their bond length and breaks stretched links', () => {
    const simulation = new Simulation(definition('constraint', 3, config({ initialOrganismCount: 0 })))
    const first = new Organism('a', 100, 100, 0, 0, 5, 50)
    const second = new Organism('b', 125, 100, 0, 0, 5, 50)
    simulation.world.organisms.push(first, second)
    simulation.world.links.push({ id: 'a::b', cellAId: 'a', cellBId: 'b', restLength: 10, breakDistance: 30, strength: 0.5 })
    AdhesionSystem.constrain(simulation.world)
    expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeCloseTo(10.1)
    second.x = 150
    expect(AdhesionSystem.constrain(simulation.world)).toBe(1)
    expect(simulation.world.links).toHaveLength(0)
  })

  it('charges attached cells for bond maintenance without granting a colony energy bonus', () => {
    const settings = config({ initialOrganismCount: 0, adhesionEnergyCost: 0.5 })
    const alone = new Organism('alone', 20, 20, 0, 0, 5, 10, 100, 0, 0)
    const first = new Organism('a', 50, 50, 0, 0, 5, 10, 100, 0, 0)
    const second = new Organism('b', 60, 50, 0, 0, 5, 10, 100, 0, 0)
    MetabolismSystem.update([alone], 1)
    MetabolismSystem.update([first, second], 1, [{ id: 'a::b', cellAId: 'a', cellBId: 'b', restLength: 10, breakDistance: 20, strength: 1 }], settings.adhesionEnergyCost)
    expect(alone.energy).toBe(10)
    expect(first.energy).toBe(9.5)
    expect(second.energy).toBe(9.5)
  })

  it('retains singleton unicellular cells and deterministic colony development', () => {
    const settings = config({ initialOrganismCount: 1, initialFoodCount: 0, initialEnergy: 100, baseMetabolismRate: 0, movementEnergyCost: 0, organismSpeed: 0, turnRate: 0, divisionEnergyThreshold: 99, mutationRate: 0 })
    const first = new Simulation(definition('lineage', 92, settings))
    const second = new Simulation(definition('lineage', 92, settings))
    first.step()
    second.step()
    expect(first.world.snapshot()).toEqual(second.world.snapshot())
    expect(first.world.organisms).toHaveLength(2)
    expect(first.world.organisms[0].generation).toBe(0)
    expect(first.world.organisms[1].generation).toBe(1)
    expect(new Simulation(definition('unicellular', 12, config({ initialOrganismCount: 1 }))).world.snapshot().statistics.colonies).toBe(0)
  })

  it('runs a population of a thousand cells through repeated ticks', () => {
    const simulation = new Simulation(definition('scale', 190, config({ initialOrganismCount: 1_000, initialFoodCount: 0, baseMetabolismRate: 0, mutationRate: 0 })))
    for (let tick = 0; tick < 30; tick += 1) simulation.step()
    expect(simulation.world.tick).toBe(30)
    expect(simulation.world.organisms).toHaveLength(1_000)
  })

  it('resolves overlap using oriented cell geometry and bounded correction passes', () => {
    const first = new Organism('ellipse-a', 100, 100, 0, 0, 5, 50, 100, 0, 0, { adhesion: 0, aspectRatio: 2 })
    const second = new Organism('ellipse-b', 101, 100, 0, 0, 5, 50, 100, 0, 0, { adhesion: 0, aspectRatio: 0.5 })
    const result = CellPhysicsSystem.resolve([first, second], 300, 300)
    expect(result.resolvedPairs).toBeGreaterThan(0)
    expect(Number.isFinite(first.x + second.x)).toBe(true)
    expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeGreaterThan(8)
  })

  it('uses the spatial hash to avoid all-pairs work for sparse populations', () => {
    const cells = Array.from({ length: 1_000 }, (_, index) => new Organism(
      'sparse-' + index,
      20 + index % 50 * 150,
      20 + Math.floor(index / 50) * 150,
      0, 0, 5, 50,
    ))
    const result = CellPhysicsSystem.resolve(cells, 8_000, 8_000)
    expect(result.candidatePairs).toBeLessThan(1_000)
    expect(result.resolvedPairs).toBe(0)
  })

  it('blocks nutrient access for a covered cell while leaving the exposed cell able to feed', () => {
    const settings = config({ initialOrganismCount: 0 })
    const covered = new Organism('covered', 100, 100, 0, 0, 5, 10)
    const exposed = new Organism('exposed', 108, 100, 0, 0, 5, 10)
    const resource = new FoodResource('food', 110, 100, 5, 30)
    const resources = [resource]
    FeedingSystem.update([covered, exposed], resources, settings)
    expect(covered.energy).toBe(10)
    expect(exposed.energy).toBe(40)
    expect(resources).toHaveLength(0)
  })

  it('indexes nearby occluders beside a long target-to-resource ray', () => {
    const settings = config({ initialOrganismCount: 0 })
    const target = new Organism('target', 115, 100, 0, 0, 10, 10)
    const blocker = new Organism('blocker', 114, 109, 0, 0, 10, 10)
    const resources = [new FoodResource('ray-edge', 100, 100, 5, 30)]
    FeedingSystem.update([target, blocker], resources, settings)
    expect(target.foodConsumed).toBe(0)
    expect(blocker.foodConsumed).toBe(0)
    expect(resources).toHaveLength(1)
  })

  it('tracks population composition, morphology and bounded history', () => {
    const simulation = new Simulation(definition('stats', 1, config({ initialOrganismCount: 0 })))
    const isolated = new Organism('isolated', 10, 10, 0, 0, 5, 30, 100, 0, 0, { adhesion: 0.4, aspectRatio: 2 }, 3)
    const colonyA = new Organism('colony-a', 30, 30, 0, 0, 5, 30, 100, 0, 0, { adhesion: 0.8, aspectRatio: 1 }, 1)
    const colonyB = new Organism('colony-b', 40, 30, 0, 0, 5, 30, 100, 0, 0, { adhesion: 0.6, aspectRatio: 1 }, 2)
    simulation.world.organisms.push(isolated, colonyA, colonyB)
    simulation.world.links.push({ id: 'bond', cellAId: colonyA.id, cellBId: colonyB.id, restLength: 10, breakDistance: 15, strength: 0.7 })
    const stats = simulation.world.snapshot().statistics
    expect(stats).toMatchObject({ population: 3, isolatedCells: 1, colonies: 1, averageColonySize: 2, largestColonySize: 2, maxGeneration: 3 })
    expect(stats.averageAdhesion).toBeCloseTo(0.6)
    expect(stats.averageElongation).toBeCloseTo(4 / 3)
    expect(stats.averageBranchingTendency).toBeGreaterThanOrEqual(0)
    expect(stats.averageBranchingTendency).toBeLessThanOrEqual(1)
    expect(stats.averageBondPersistence).toBeGreaterThanOrEqual(0.5)
    expect(stats.averageBondPersistence).toBeLessThanOrEqual(2)
    expect(stats.averageColonyElongation).toBeGreaterThan(0)
    simulation.world.divisions = 10
    simulation.world.totalDeaths = 5
    simulation.world.simulatedTime = 10
    expect(simulation.world.snapshot().statistics).toMatchObject({ birthRate: 1, mortalityRate: 0.5 })
    for (let sample = 1; sample <= 605; sample += 1) {
      simulation.world.simulatedTime = sample
      simulation.world.recordHistorySample()
    }
    expect(simulation.world.history).toHaveLength(600)
    expect(simulation.world.history[0].time).toBe(6)
    expect(simulation.world.history.at(-1)).toMatchObject({ averageBranchingTendency: stats.averageBranchingTendency, averageBondPersistence: stats.averageBondPersistence, averageElongation: stats.averageElongation })
  })

  it('keeps linked colonies finite and bonded during repeated contact resolution', () => {
    const simulation = new Simulation(definition('stable-bond', 5, config({ initialOrganismCount: 0 })))
    const a = new Organism('a', 100, 100, 0, 0, 5, 50)
    const b = new Organism('b', 110.1, 100, 0, 0, 5, 50)
    const obstacle = new Organism('obstacle', 111, 100, Math.PI / 2, 0, 5, 50)
    simulation.world.organisms.push(a, b, obstacle)
    simulation.world.links.push({ id: 'a::b', cellAId: 'a', cellBId: 'b', restLength: 10.1, breakDistance: 20, strength: 0.5 })
    for (let step = 0; step < 20; step += 1) {
      CellPhysicsSystem.resolve(simulation.world.organisms, simulation.world.width, simulation.world.height)
      AdhesionSystem.constrain(simulation.world)
      CellPhysicsSystem.resolve(simulation.world.organisms, simulation.world.width, simulation.world.height)
    }
    expect(simulation.world.links).toHaveLength(1)
    expect(simulation.world.organisms.every(cell => Number.isFinite(cell.x) && Number.isFinite(cell.y))).toBe(true)
  })

  it('lets elongated morphology improve contact access only along its long axis', () => {
    const settings = config({ initialOrganismCount: 0 })
    const elongated = new Organism('elongated', 100, 100, 0, 0, 5, 10, 100, 0, 0, { adhesion: 0, aspectRatio: 2 })
    const round = new Organism('round', 100, 100, 0, 0, 5, 10, 100, 0, 0, { adhesion: 0, aspectRatio: 1 })
    const elongatedFood = [new FoodResource('food-e', 108.5, 100, 2, 10)]
    const roundFood = [new FoodResource('food-r', 108.5, 100, 2, 10)]
    FeedingSystem.update([elongated], elongatedFood, settings)
    FeedingSystem.update([round], roundFood, settings)
    expect(elongated.energy).toBe(20)
    expect(round.energy).toBe(10)
    expect(roundFood).toHaveLength(1)
  })

  it('makes colony translation emerge from constrained per-cell motion rather than a group speed bonus', () => {
    const settings = config({ initialOrganismCount: 0, organismSpeed: 10, turnRate: 0 })
    const simulation = new Simulation(definition('colony-motion', 1, settings))
    const left = new Organism('left', 90, 100, 0, 10, 5, 50)
    const right = new Organism('right', 100.1, 100, Math.PI, 10, 5, 50)
    simulation.world.organisms.push(left, right)
    simulation.world.links.push({ id: 'left::right', cellAId: 'left', cellBId: 'right', restLength: 10.1, breakDistance: 20, strength: 0.5 })
    const before = (left.x + right.x) / 2
    MovementSystem.update([left, right], simulation.world.width, simulation.world.height, settings, new SeededRandom(1), 0.1)
    CellPhysicsSystem.resolve([left, right], simulation.world.width, simulation.world.height)
    AdhesionSystem.constrain(simulation.world)
    CellPhysicsSystem.resolve([left, right], simulation.world.width, simulation.world.height)
    const colonyDisplacement = Math.abs((left.x + right.x) / 2 - before)
    const solitary = new Organism('solo', 200, 100, 0, 10, 5, 50)
    MovementSystem.update([solitary], simulation.world.width, simulation.world.height, settings, new SeededRandom(1), 0.1)
    expect(colonyDisplacement).toBeLessThan(Math.abs(solitary.x - 200))
  })

  it('continues a reproducing population deterministically for thousands of fixed ticks', () => {
    const settings = config({
      initialOrganismCount: 10,
      initialFoodCount: 0,
      initialEnergy: 100,
      baseMetabolismRate: 0,
      movementEnergyCost: 0,
      adhesionEnergyCost: 0,
      organismSpeed: 5,
      divisionEnergyThreshold: 90,
      maximumPopulation: 20,
      mutationRate: 0,
    })
    const simulation = new Simulation(definition('long-run', 33, settings))
    for (let tick = 0; tick < 6_000; tick += 1) simulation.step()
    expect(simulation.world.tick).toBe(6_000)
    expect(simulation.world.organisms).toHaveLength(20)
    expect(simulation.world.organisms.every(cell => Number.isFinite(cell.x) && Number.isFinite(cell.energy))).toBe(true)
    expect(simulation.world.history.length).toBeLessThanOrEqual(600)
    expect(simulation.world.divisions).toBe(10)
  })
})
