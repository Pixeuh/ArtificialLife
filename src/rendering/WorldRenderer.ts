import type { WorldSnapshot, Point } from '../core/types'
import { Camera, WORLD_SCALE } from './Camera'
import { TerrainRenderer } from './TerrainRenderer'
import type { TerrainSnapshot } from '../environment/terrain/terrainTypes'

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
  foraging: string
  motility: string
  resilience: string
  terrain: TerrainColors
}

export type TerrainColors = Record<'plains' | 'forest' | 'desert' | 'mountain' | 'water', string>

export class WorldRenderer {
  private readonly terrainRenderer = new TerrainRenderer()
  private terrain?: TerrainSnapshot
  private organismSource?: WorldSnapshot['organisms']
  private resourceSource?: WorldSnapshot['resources']
  private orderedOrganisms: WorldSnapshot['organisms'] = []
  private orderedResources: WorldSnapshot['resources'] = []
  private organismsById = new Map<string, WorldSnapshot['organisms'][number]>()
  static readonly defaultPalette: CanvasPalette = {
    background: '#080c10', grid: '#182329', boundary: '#3b5960', origin: '#69e4c2', label: '#667b80',
    organism: '#75dced', organismLow: '#e8c66c', organismCritical: '#ed826f', organismStroke: '#c0f7ff', direction: '#c0f7ff', selection: '#a5f1df', food: '#8be878', foraging: '#b9e66a', motility: '#6fbfff', resilience: '#dc9af0',
    terrain: { plains: '#536c48', forest: '#294d37', desert: '#8c7950', mountain: '#68716e', water: '#26566c' },
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
      foraging: readVariable('--canvas-foraging') || defaults.foraging,
      motility: readVariable('--canvas-motility') || defaults.motility,
      resilience: readVariable('--canvas-resilience') || defaults.resilience,
      terrain: {
        plains: readVariable('--terrain-plains') || defaults.terrain.plains,
        forest: readVariable('--terrain-forest') || defaults.terrain.forest,
        desert: readVariable('--terrain-desert') || defaults.terrain.desert,
        mountain: readVariable('--terrain-mountain') || defaults.terrain.mountain,
        water: readVariable('--terrain-water') || defaults.terrain.water,
      },
    }
  }

  setTerrain(terrain: TerrainSnapshot | undefined, palette: CanvasPalette): void {
    this.terrain = terrain
    this.terrainRenderer.setTerrain(terrain, palette.terrain)
  }

  draw(context: CanvasRenderingContext2D, width: number, height: number, world: WorldSnapshot, camera: Camera, selectedOrganismId: string | null = null, palette: CanvasPalette = WorldRenderer.defaultPalette, presentationTime = 0): void {
    if (this.organismSource !== world.organisms) {
      this.organismSource = world.organisms
      this.orderedOrganisms = world.organisms.slice().sort((a, b) => a.y - b.y)
      this.organismsById = new Map(world.organisms.map(organism => [organism.id, organism]))
    }
    if (this.resourceSource !== world.resources) {
      this.resourceSource = world.resources
      this.orderedResources = world.resources.slice().sort((a, b) => a.y - b.y)
    }
    const { zoom } = camera
    context.fillStyle = palette.background
    context.fillRect(0, 0, width, height)
    const terrainOrigin = camera.worldToScreen({ x: 0, y: 0 }, { x: width, y: height })
    this.terrainRenderer.draw(context, terrainOrigin.x, terrainOrigin.y, WORLD_SCALE * zoom, this.terrain, presentationTime, width, height)

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
    const selectedCell = world.organisms.find(organism => organism.id === selectedOrganismId)
    const selectedColonyId = selectedCell?.colonyId
    for (const link of world.links) {
      const a = this.organismsById.get(link.cellAId)
      const b = this.organismsById.get(link.cellBId)
      if (!a || !b) continue
      const start = camera.worldToScreen(a, viewport)
      const end = camera.worldToScreen(b, viewport)
      if (Math.max(start.x, end.x) < -16 || Math.min(start.x, end.x) > width + 16 || Math.max(start.y, end.y) < -16 || Math.min(start.y, end.y) > height + 16) continue
      const highlighted = selectedColonyId !== undefined && a.colonyId === selectedColonyId
      context.strokeStyle = highlighted ? palette.selection : palette.boundary
      context.lineWidth = highlighted ? 2.4 : 0.8 + link.strength * 0.8
      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, end.y)
      context.stroke()
    }

    for (const resource of this.orderedResources) {
      const point = camera.worldToScreen(resource, viewport)
      const radius = Math.max(2, resource.radius * WORLD_SCALE * zoom)
      if (point.x + radius < -8 || point.x - radius > width + 8 || point.y + radius < -8 || point.y - radius > height + 8) continue
      context.save()
      context.globalAlpha = 0.2
      context.fillStyle = '#101713'
      context.beginPath(); context.arc(point.x + radius * 0.25, point.y + radius * 0.35, radius * 1.1, 0, Math.PI * 2); context.fill()
      context.restore()
      context.fillStyle = palette.food
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = '#ffffff'
      context.globalAlpha = 0.32
      context.beginPath(); context.arc(point.x - radius * 0.28, point.y - radius * 0.3, Math.max(0.7, radius * 0.28), 0, Math.PI * 2); context.fill()
      context.globalAlpha = 1
    }

    const farView = zoom < 0.42
    const closeView = zoom > 1.65
    for (const organism of this.orderedOrganisms) {
      const point = camera.worldToScreen(organism, viewport)
      const radius = Math.max(farView ? 2.1 : 2.8, organism.radius * WORLD_SCALE * zoom)
      const axisRatio = Math.max(Math.sqrt(organism.genome.aspectRatio), 1 / Math.sqrt(organism.genome.aspectRatio))
      const margin = Math.max(16, radius * axisRatio + 12)
      if (point.x + margin < 0 || point.x - margin > width || point.y + margin < 0 || point.y - margin > height) continue
      const isSelected = organism.id === selectedOrganismId
      const isInSelectedColony = selectedColonyId !== undefined && organism.colonyId === selectedColonyId
      const energyRatio = organism.energy / Math.max(organism.maxEnergy, Number.EPSILON)
      context.fillStyle = energyRatio < 0.25 ? palette.organismCritical : energyRatio < 0.5 ? palette.organismLow : palette.organism
      const aspect = organism.genome.aspectRatio
      const radiusX = radius * Math.sqrt(aspect)
      const radiusY = radius / Math.sqrt(aspect)
      context.save()
      context.globalAlpha = 0.25
      context.fillStyle = '#101713'
      context.beginPath(); context.arc(point.x + Math.max(radiusX, radiusY) * 0.18, point.y + Math.max(radiusX, radiusY) * 0.34, Math.max(radiusX, radiusY) * 0.95, 0, Math.PI * 2); context.fill()
      context.globalAlpha = 1
      context.translate(point.x, point.y)
      context.rotate(organism.direction)
      context.beginPath()
      context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2)
      context.fill()
      context.strokeStyle = palette.organismStroke
      context.lineWidth = 1
      context.beginPath()
      context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2)
      context.stroke()
      if (closeView) {
        context.globalAlpha = 0.42
        context.fillStyle = '#ffffff'
        context.beginPath(); context.ellipse(-radiusX * 0.22, -radiusY * 0.22, radiusX * 0.28, radiusY * 0.2, 0, 0, Math.PI * 2); context.fill()
        context.globalAlpha = 0.55
        context.strokeStyle = palette.organismStroke
        context.beginPath(); context.moveTo(radiusX * 0.25, 0); context.lineTo(radiusX * 0.78, 0); context.stroke()
      } else if (!farView) {
        context.globalAlpha = 0.42
        context.beginPath(); context.ellipse(0, 0, radiusX * 0.78, radiusY * 0.78, 0, 0, Math.PI * 2); context.stroke()
      }
      context.restore()
      context.beginPath()
      context.moveTo(point.x, point.y)
      context.lineTo(point.x + Math.cos(organism.direction) * (Math.max(radiusX, radiusY) + 4), point.y + Math.sin(organism.direction) * (Math.max(radiusX, radiusY) + 4))
      context.strokeStyle = palette.direction
      context.stroke()
      if (isInSelectedColony) {
        context.strokeStyle = palette.selection
        context.lineWidth = 1
        context.beginPath()
        context.arc(point.x, point.y, Math.max(radiusX, radiusY) + (isSelected ? 4 : 2), 0, Math.PI * 2)
        context.stroke()
      }
      if (closeView && world.config.functionalDifferentiation) {
        const markers = [
          { value: organism.expression.foraging, color: palette.foraging, radius: Math.max(radiusX, radiusY) + 2 },
          { value: organism.expression.motility, color: palette.motility, radius: Math.max(radiusX, radiusY) + 4 },
          { value: organism.expression.resilience, color: palette.resilience, radius: Math.max(radiusX, radiusY) + 6 },
        ]
        for (const marker of markers) {
          context.globalAlpha = 0.28 + marker.value * 0.72
          context.strokeStyle = marker.color
          context.lineWidth = 1.7
          context.beginPath()
          context.arc(point.x, point.y, marker.radius, -Math.PI / 2, -Math.PI / 2 + marker.value * Math.PI * 1.7)
          context.stroke()
        }
        context.globalAlpha = 1
      }
      if (isSelected) {
        context.strokeStyle = palette.selection
        context.lineWidth = 1.5
        context.beginPath(); context.arc(point.x, point.y, Math.max(radiusX, radiusY) + 5, 0, Math.PI * 2); context.stroke()
        context.fillStyle = palette.selection
        context.font = '10px ui-monospace, monospace'
        context.fillText(organism.id, point.x + Math.max(radiusX, radiusY) + 7, point.y - Math.max(radiusX, radiusY) - 4)
      }
    }
    context.fillStyle = palette.label
    context.font = '10px ui-monospace, monospace'
    context.fillText('0, 0', origin.x + 9, origin.y - 9)

    context.fillStyle = palette.label
    context.font = '10px ui-monospace, monospace'
    context.fillText(`${zoom.toFixed(2)}×`, 16, height - 18)
  }

}

export type { Point }
