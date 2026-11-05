import type { WorldSnapshot, Point } from '../core/types'
import { Camera, WORLD_SCALE } from './Camera'

export class WorldRenderer {
  draw(context: CanvasRenderingContext2D, width: number, height: number, world: WorldSnapshot, camera: Camera, selectedOrganismId: string | null = null): void {
    const { zoom } = camera
    context.fillStyle = '#080c10'
    context.fillRect(0, 0, width, height)
    this.drawGrid(context, width, height, camera)

    const origin = camera.worldToScreen({ x: 0, y: 0 }, { x: width, y: height })
    const edge = camera.worldToScreen({ x: world.width, y: world.height }, { x: width, y: height })
    context.strokeStyle = '#3b5960'
    context.lineWidth = 1
    context.strokeRect(origin.x, origin.y, edge.x - origin.x, edge.y - origin.y)

    context.strokeStyle = '#69e4c2'
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
      context.fillStyle = '#8be878'
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.fill()
    }

    for (const organism of world.organisms) {
      const point = camera.worldToScreen(organism, viewport)
      const radius = Math.max(2, organism.radius * WORLD_SCALE * zoom)
      const isSelected = organism.id === selectedOrganismId
      context.fillStyle = '#75dced'
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.fill()
      context.strokeStyle = '#c0f7ff'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(point.x, point.y)
      context.lineTo(point.x + Math.cos(organism.direction) * (radius + 4), point.y + Math.sin(organism.direction) * (radius + 4))
      context.stroke()
      if (isSelected) {
        context.strokeStyle = '#a5f1df'
        context.lineWidth = 1
        context.beginPath()
        context.arc(point.x, point.y, radius + 3, 0, Math.PI * 2)
        context.stroke()
        context.fillStyle = '#a5f1df'
        context.font = '10px ui-monospace, monospace'
        context.fillText(organism.id, point.x + radius + 7, point.y - radius - 4)
      }
    }
    context.fillStyle = '#80a59d'
    context.font = '10px ui-monospace, monospace'
    context.fillText('0, 0', origin.x + 9, origin.y - 9)

    context.fillStyle = '#667b80'
    context.font = '10px ui-monospace, monospace'
    context.fillText(`${zoom.toFixed(2)}×`, 16, height - 18)
  }

  private drawGrid(context: CanvasRenderingContext2D, width: number, height: number, camera: Camera): void {
    const spacing = 100 * WORLD_SCALE * camera.zoom
    if (spacing < 14) return
    const center = camera.worldToScreen({ x: 0, y: 0 }, { x: width, y: height })
    const startX = ((center.x % spacing) + spacing) % spacing
    const startY = ((center.y % spacing) + spacing) % spacing
    context.strokeStyle = '#182329'
    context.lineWidth = 1
    context.beginPath()
    for (let x = startX; x < width; x += spacing) { context.moveTo(x, 0); context.lineTo(x, height) }
    for (let y = startY; y < height; y += spacing) { context.moveTo(0, y); context.lineTo(width, y) }
    context.stroke()
  }
}

export type { Point }
