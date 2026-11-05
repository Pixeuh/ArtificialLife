import { describe, expect, it } from 'vitest'
import { SeededRandom } from './SeededRandom'
import { Simulation } from './Simulation'
import { World } from './World'
import { Camera, MAX_ZOOM, MIN_ZOOM } from '../rendering/Camera'
import { generateNewSeed } from '../components/seedActions'

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
})
