import { describe, expect, it } from 'vitest'
import { SeededRandom } from './SeededRandom'
import { Simulation } from './Simulation'
import { World } from './World'
import { Camera, MAX_ZOOM, MIN_ZOOM } from '../rendering/Camera'

const definition = (id: string, seed = 1234) => ({ id, name: id, width: 1000, height: 800, seed })

describe('SeededRandom', () => {
  it('reproduces the same sequence for the same seed', () => {
    const left = new SeededRandom(42)
    const right = new SeededRandom(42)
    expect(Array.from({ length: 8 }, () => left.next())).toEqual(Array.from({ length: 8 }, () => right.next()))
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
