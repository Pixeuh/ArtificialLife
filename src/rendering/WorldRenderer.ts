import type { WorldSnapshot, Point } from '../core/types'
import { Camera, WORLD_SCALE } from './Camera'

export interface CanvasPalette {
  background: string
  grid: string
  boundary: string
  origin: string
  label: string
  organism: string
  organismLow: string
  organismCritical: string
  organismStroke: string
  direction: string
  selection: string
  food: string
}

export class WorldRenderer {
  static readonly defaultPalette: CanvasPalette = {
    background: '#080c10', grid: '#182329', boundary: '#3b5960', origin: '#69e4c2', label: '#667b80',
    organism: '#75dced', organismLow: '#e8c66c', organismCritical: '#ed826f', organismStroke: '#c0f7ff', direction: '#c0f7ff', selection: '#a5f1df', food: '#8be878',
  }

  static readPalette(readVariable: (name: string) => string): CanvasPalette {
    const defaults = WorldRenderer.defaultPalette
    return {
      background: readVariable('--canvas-background') || defaults.background,
      grid: readVariable('--canvas-grid') || defaults.grid,
      boundary: readVariable('--canvas-boundary') || defaults.boundary,
      origin: readVariable('--canvas-origin') || defaults.origin,
      label: readVariable('--canvas-label') || defaults.label,
      organism: readVariable('--canvas-organism') || defaults.organism,
      organismLow: readVariable('--canvas-organism-low') || defaults.organismLow,
      organismCritical: readVariable('--canvas-organism-critical') || defaults.organismCritical,
      organismStroke: readVariable('--canvas-organism-stroke') || defaults.organismStroke,
      direction: readVariable('--canvas-direction') || defaults.direction,
      selection: readVariable('--canvas-selection') || defaults.selection,
      food: readVariable('--canvas-food') || defaults.food,
    }
  }

  draw(context: CanvasRenderingContext2D, width: number, height: number, world: WorldSnapshot, camera: Camera, selectedOrganismId: string | null = null, palette: CanvasPalette = WorldRenderer.defaultPalette): void {
    const { zoom } = camera
    context.fillStyle = palette.background
    context.fillRect(0, 0, width, height)
    this.drawGrid(context, width, height, camera, palette)

    const origin = camera.worldToScreen({ x: 0, y: 0 }, { x: width, y: height })
    const edge = camera.worldToScreen({ x: world.width, y: world.height }, { x: width, y: height })
    context.strokeStyle = palette.boundary
    context.lineWidth = 1
    context.strokeRect(origin.x, origin.y, edge.x - origin.x, edge.y - origin.y)

    context.strokeStyle = palette.origin
    context.lineWidth = 1.5
    context.beginPath()
    context.moveTo(origin.x - 8, origin.y)
    context.lineTo(origin.x + 8, origin.y)
    context.moveTo(origin.x, origin.y - 8)
    context.lineTo(origin.x, origin.y + 8)
    context.stroke()

    const viewport = { x: width, y: height }
    for (const resource of world.resources) {
      const point = camera.worldToScreen(resource, viewport)
      const radius = Math.max(1.5, resource.radius * WORLD_SCALE * zoom)
      context.fillStyle = palette.food
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.fill()
    }

    for (const organism of world.organisms) {
      const point = camera.worldToScreen(organism, viewport)
      const radius = Math.max(2, organism.radius * WORLD_SCALE * zoom)
      const isSelected = organism.id === selectedOrganismId
      const energyRatio = organism.energy / Math.max(organism.maxEnergy, Number.EPSILON)
      context.fillStyle = energyRatio < 0.25 ? palette.organismCritical : energyRatio < 0.5 ? palette.organismLow : palette.organism
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.fill()
      context.strokeStyle = palette.organismStroke
      context.lineWidth = 1
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.stroke()
      context.beginPath()
      context.moveTo(point.x, point.y)
      context.lineTo(point.x + Math.cos(organism.direction) * (radius + 4), point.y + Math.sin(organism.direction) * (radius + 4))
      context.strokeStyle = palette.direction
      context.stroke()
      if (isSelected) {
        context.strokeStyle = palette.selection
        context.lineWidth = 1
        context.beginPath()
        context.arc(point.x, point.y, radius + 3, 0, Math.PI * 2)
        context.stroke()
        context.fillStyle = palette.selection
        context.font = '10px ui-monospace, monospace'
        context.fillText(organism.id, point.x + radius + 7, point.y - radius - 4)
      }
    }
    context.fillStyle = palette.label
    context.font = '10px ui-monospace, monospace'
    context.fillText('0, 0', origin.x + 9, origin.y - 9)

    context.fillStyle = palette.label
    context.font = '10px ui-monospace, monospace'
    context.fillText(`${zoom.toFixed(2)}×`, 16, height - 18)
  }

  private drawGrid(context: CanvasRenderingContext2D, width: number, height: number, camera: Camera, palette: CanvasPalette): void {
    const spacing = 100 * WORLD_SCALE * camera.zoom
    if (spacing < 14) return
    const center = camera.worldToScreen({ x: 0, y: 0 }, { x: width, y: height })
    const startX = ((center.x % spacing) + spacing) % spacing
    const startY = ((center.y % spacing) + spacing) % spacing
    context.strokeStyle = palette.grid
    context.lineWidth = 1
    context.beginPath()
    for (let x = startX; x < width; x += spacing) { context.moveTo(x, 0); context.lineTo(x, height) }
    for (let y = startY; y < height; y += spacing) { context.moveTo(0, y); context.lineTo(width, y) }
    context.stroke()
  }
}

export type { Point }
