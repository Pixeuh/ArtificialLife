/// <reference lib="webworker" />
import { Simulation } from '../core/Simulation'
import type { WorkerCommand, WorkerEvent } from './protocol'

let simulation: Simulation | undefined
let running = false
let lastTime = 0
let lastPublish = 0
let frameHandle = 0

const publish = (): void => {
  if (simulation) self.postMessage({ type: 'state', world: simulation.world.snapshot() } satisfies WorkerEvent)
}

const loop = (): void => {
  if (!running || !simulation) return
  const now = performance.now()
  simulation.advance(Math.min((now - lastTime) / 1000, 0.25))
  lastTime = now
  if (now - lastPublish >= 200) {
    publish()
    lastPublish = now
  }
  frameHandle = self.setTimeout(loop, 16)
}

self.onmessage = (event: MessageEvent<WorkerCommand>): void => {
  try {
    const command = event.data
    switch (command.type) {
      case 'initialize':
        simulation = new Simulation(command.world)
        running = false
        publish()
        break
      case 'start':
        if (simulation && !running) {
          simulation.world.paused = false
          running = true
          lastTime = performance.now()
          frameHandle = self.setTimeout(loop, 16)
        }
        break
      case 'pause':
        running = false
        if (frameHandle) self.clearTimeout(frameHandle)
        if (simulation) simulation.world.paused = true
        publish()
        break
      case 'set-speed':
        simulation?.setSpeed(command.speed)
        publish()
        break
      case 'reset':
        running = false
        if (frameHandle) self.clearTimeout(frameHandle)
        simulation?.reset(command.world)
        publish()
        break
      case 'get-state':
        publish()
        break
      case 'destroy':
        running = false
        if (frameHandle) self.clearTimeout(frameHandle)
        simulation = undefined
        self.close()
        break
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Simulation worker error.' } satisfies WorkerEvent)
  }
}
