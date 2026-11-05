import { describe, expect, it } from 'vitest'
import { Simulation } from '../core/Simulation'
import { Organism } from '../organisms/Organism'
import { Camera } from './Camera'
import { WorldRenderer } from './WorldRenderer'

function recordingContext() {
  const ellipses: number[][] = []
  let moveCount = 0
  const noop = (): void => {}
  const context = {
    fillRect: noop, strokeRect: noop, beginPath: noop, lineTo: noop, stroke: noop, fill: noop, arc: noop,
    save: noop, translate: noop, rotate: noop, restore: noop, fillText: noop,
    moveTo: () => { moveCount += 1 },
    ellipse: (...values: number[]) => { ellipses.push(values) },
  } as unknown as CanvasRenderingContext2D
  return { context, ellipses, moveCount: () => moveCount }
}

describe('procedural cell rendering', () => {
  it('draws a cell body using its heritable aspect ratio', () => {
    const simulation = new Simulation({ id: 'shape', name: 'Shape', width: 200, height: 200, seed: 1, config: { initialOrganismCount: 0 } })
    simulation.world.organisms.push(new Organism('cell', 100, 100, 0, 0, 5, 40, 100, 0, 0, { adhesion: 0.4, aspectRatio: 2 }))
    const recording = recordingContext()
    new WorldRenderer().draw(recording.context, 400, 300, simulation.world.snapshot(), new Camera())
    expect(recording.ellipses[0][2] / recording.ellipses[0][3]).toBeCloseTo(2)
  })

  it('draws a physical bond between cells from the world link state', () => {
    const simulation = new Simulation({ id: 'bond', name: 'Bond', width: 200, height: 200, seed: 1, config: { initialOrganismCount: 0 } })
    const a = new Organism('a', 80, 100, 0, 0, 5, 40)
    const b = new Organism('b', 90, 100, 0, 0, 5, 40)
    simulation.world.organisms.push(a, b)
    simulation.world.links.push({ id: 'a::b', cellAId: 'a', cellBId: 'b', restLength: 10, breakDistance: 15, strength: 0.5 })
    const renderer = new WorldRenderer()
    const withLink = recordingContext()
    renderer.draw(withLink.context, 400, 300, simulation.world.snapshot(), new Camera())
    simulation.world.links = []
    const withoutLink = recordingContext()
    renderer.draw(withoutLink.context, 400, 300, simulation.world.snapshot(), new Camera())
    expect(withLink.moveCount() - withoutLink.moveCount()).toBe(1)
  })
})
