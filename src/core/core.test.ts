import { describe, expect, it } from 'vitest'
import { SeededRandom } from './SeededRandom'
import { Simulation } from './Simulation'
import { World } from './World'
import { Camera, MAX_ZOOM, MIN_ZOOM } from '../rendering/Camera'
import { generateNewSeed } from '../components/seedActions'
import type { SimulationSaveV1, SimulationSaveV2, SimulationSaveV3 } from './SimulationSave'

const definition = (id: string, seed = 1234) => ({ id, name: id, width: 1000, height: 800, seed })

describe('SeededRandom', () => {
  it('reproduces the same sequence for the same seed', () => {
    const left = new SeededRandom(42)
    const right = new SeededRandom(42)
    expect(Array.from({ length: 8 }, () => left.next())).toEqual(Array.from({ length: 8 }, () => right.next()))
  })

  it('starts independent PRNG instances at the same saved state', () => {
    const random = new SeededRandom(11)
    random.next()
    const restored = new SeededRandom(999)
    restored.restoreState(random.getState())
    expect(restored.next()).toBe(random.next())
  })
})

describe('seed actions', () => {
  it('uses generated seed words and guarantees the new-world action changes the seed', () => {
    expect(generateNewSeed(10, values => { values[0] = 10 })).toBe(11)
    expect(generateNewSeed(10, values => { values[0] = 77 })).toBe(77)
  })
})

describe('World and Simulation', () => {
  it('keeps worlds independent', () => {
    const first = new World(definition('a'))
    const second = new World(definition('b'))
    first.step()
    first.paused = false
    expect(second.tick).toBe(0)
    expect(second.paused).toBe(true)
  })

  it('keeps origin and intervention mode separate from world identity', () => {
    const observed = new World({ ...definition('alpha'), originType: 'primordial', interventionMode: 'observation' })
    const divine = new World({ ...definition('beta'), originType: 'custom', interventionMode: 'divine' })
    expect(observed.snapshot()).toMatchObject({ originType: 'primordial', interventionMode: 'observation' })
    expect(divine.snapshot()).toMatchObject({ originType: 'custom', interventionMode: 'divine' })
  })

  it('advances by one fixed step', () => {
    const simulation = new Simulation(definition('a'))
    simulation.step()
    expect(simulation.world.tick).toBe(1)
    expect(simulation.world.simulatedTime).toBeCloseTo(1 / 30)
  })

  it('advances according to speed and fixed time steps', () => {
    const simulation = new Simulation(definition('a'))
    simulation.world.paused = false
    simulation.setSpeed(2)
    expect(simulation.advance(0.5)).toBe(30)
    expect(simulation.world.simulatedTime).toBeCloseTo(1)
  })

  it('does not advance while paused', () => {
    const simulation = new Simulation(definition('a'))
    expect(simulation.advance(1)).toBe(0)
    expect(simulation.world.tick).toBe(0)
  })

  it('resets time, ticks, speed, and pause state', () => {
    const simulation = new Simulation(definition('a'))
    simulation.world.paused = false
    simulation.setSpeed(5)
    simulation.advance(1)
    simulation.reset()
    expect(simulation.world.tick).toBe(0)
    expect(simulation.world.simulatedTime).toBe(0)
    expect(simulation.world.speed).toBe(1)
    expect(simulation.world.paused).toBe(true)
  })

  it('resumes from a versioned full save with the same future state', () => {
    const original = new Simulation({ ...definition('resume', 42), config: { initialOrganismCount: 14, initialFoodCount: 30 } })
    original.world.paused = false
    original.setSpeed(2)
    original.advance(0.017)
    for (let tick = 0; tick < 120; tick += 1) original.step()
    const restored = Simulation.fromSave(JSON.parse(JSON.stringify(original.save())))
    expect(restored.world.snapshot()).toEqual(original.world.snapshot())
    original.advance(0.11)
    restored.advance(0.11)
    for (let tick = 0; tick < 60; tick += 1) { original.step(); restored.step() }
    expect(restored.world.snapshot()).toEqual(original.world.snapshot())
    expect(restored.save()).toEqual(original.save())
  })

  it('continues to read V1 saves after adding the independent terrain resource stream', () => {
    const current = new Simulation({ ...definition('legacy-resume', 33), config: { initialOrganismCount: 8, initialFoodCount: 12 } })
    current.step()
    const legacySave = { ...current.save(), version: 1 } as SimulationSaveV1
    const restored = Simulation.fromSave(legacySave)
    expect(restored.world.snapshot()).toEqual(current.world.snapshot())
  })

  it('writes V4 genes and lineage, and loads V2 cells with safe neutral defaults', () => {
    const simulation = new Simulation({ ...definition('v4-save', 82), config: { initialOrganismCount: 4, initialFoodCount: 0 } })
    const save = simulation.save()
    expect(save.version).toBe(4)
    expect(save.world.organisms[0].genome).toHaveProperty('branching')
    expect(save.world.organisms[0]).toMatchObject({ parentId: null, lineageId: save.world.organisms[0].id, birthTick: 0 })
    const legacy = {
      ...save,
      version: 2,
      world: {
        ...save.world,
        organisms: save.world.organisms.map(({ parentId: _parent, lineageId: _lineage, birthTick: _birth, ...cell }) => ({ ...cell, genome: { adhesion: cell.genome.adhesion, aspectRatio: cell.genome.aspectRatio } })),
        history: save.world.history.map(sample => {
          const { averageBranchingTendency: _branching, averageBondPersistence: _persistence, averageColonyElongation: _elongation, averageLinksPerCell: _links, averageLinksPerColony: _colonyLinks, averageForagingExpression: _foraging, averageMotilityExpression: _motility, averageResilienceExpression: _resilience, totalEnergyTransferred: _transferred, differentiatedColonyRatio: _differentiated, ...oldSample } = sample
          return oldSample
        }),
      },
    } as unknown as SimulationSaveV2
    const restored = Simulation.fromSave(legacy)
    expect(restored.world.organisms[0].genome).toMatchObject({ divisionAngle: 0, branching: 0.5, bondPersistence: 1, foraging: 0.5, motility: 0.5, resilience: 0.5 })
    expect(restored.world.organisms[0]).toMatchObject({ parentId: null, lineageId: restored.world.organisms[0].id, birthTick: 0 })
    expect(restored.world.history[0]).toMatchObject({ averageBranchingTendency: 0, averageBondPersistence: 0, averageColonyElongation: 0, averageLinksPerCell: 0, averageLinksPerColony: 0, averageForagingExpression: 0, averageMotilityExpression: 0, averageResilienceExpression: 0, totalEnergyTransferred: 0, differentiatedColonyRatio: 0 })
    const v3 = {
      ...save,
      version: 3,
      world: {
        ...save.world,
        organisms: save.world.organisms.map(({ parentId: _parent, lineageId: _lineage, birthTick: _birth, ...cell }) => ({ ...cell, genome: { adhesion: cell.genome.adhesion, aspectRatio: cell.genome.aspectRatio, divisionAngle: cell.genome.divisionAngle, branching: cell.genome.branching, bondPersistence: cell.genome.bondPersistence } })),
      },
    } as unknown as SimulationSaveV3
    const restoredV3 = Simulation.fromSave(v3)
    expect(restoredV3.world.organisms[0].genome).toMatchObject({ foraging: 0.5, motility: 0.5, resilience: 0.5 })
    expect(restoredV3.world.organisms[0]).toMatchObject({ parentId: null, lineageId: restoredV3.world.organisms[0].id, birthTick: 0 })
  })
})

describe('Camera', () => {
  it('converts screen and world coordinates in both directions', () => {
    const camera = new Camera()
    camera.pan(31, -12)
    const viewport = { x: 800, y: 600 }
    const worldPoint = { x: 125, y: -48 }
    const screenPoint = camera.worldToScreen(worldPoint, viewport)
    const converted = camera.screenToWorld(screenPoint, viewport)
    expect(converted.x).toBeCloseTo(worldPoint.x)
    expect(converted.y).toBeCloseTo(worldPoint.y)
  })

  it('keeps zoom within configured limits', () => {
    const camera = new Camera()
    const viewport = { x: 800, y: 600 }
    camera.zoomAt(1e6, { x: 100, y: 100 }, viewport)
    expect(camera.zoom).toBe(MAX_ZOOM)
    camera.zoomAt(1e-12, { x: 100, y: 100 }, viewport)
    expect(camera.zoom).toBe(MIN_ZOOM)
  })

  it('follows a moving point without changing zoom and centers it in the viewport', () => {
    const camera = new Camera()
    const viewport = { x: 800, y: 600 }
    camera.zoom = 2.5
    camera.pan(20, -30)
    camera.follow({ x: 125, y: 48 })
    const centered = camera.worldToScreen({ x: 125, y: 48 }, viewport)
    expect(centered).toEqual({ x: 400, y: 300 })
    expect(camera.zoom).toBe(2.5)
  })
})
