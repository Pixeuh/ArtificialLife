import { useEffect, useRef } from 'react'
import type { WorldSnapshot } from '../core/types'
import { Camera, WORLD_SCALE } from '../rendering/Camera'
import { WorldRenderer, type CanvasPalette } from '../rendering/WorldRenderer'
import type { Theme } from '../theme/theme'
import type { TerrainCell, TerrainSnapshot } from '../environment/terrain/terrainTypes'

interface Props { world: WorldSnapshot; theme: Theme; terrain?: TerrainSnapshot; selectedOrganismId: string | null; onSelectOrganism: (id: string | null) => void; onResetCamera: () => void; onHoverTerrain?: (cell: TerrainCell | null) => void }

export function WorldCanvas({ world, theme, terrain, selectedOrganismId, onSelectOrganism, onResetCamera, onHoverTerrain }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef(new Camera())
  const rendererRef = useRef(new WorldRenderer())
  const worldRef = useRef(world)
  const selectedRef = useRef(selectedOrganismId)
  const paletteRef = useRef<CanvasPalette>(WorldRenderer.defaultPalette)
  const terrainRef = useRef(terrain)
  const hoverRef = useRef(onHoverTerrain)

  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => { selectedRef.current = selectedOrganismId }, [selectedOrganismId])
  useEffect(() => { terrainRef.current = terrain; rendererRef.current.setTerrain(terrain, paletteRef.current) }, [terrain])
  useEffect(() => { hoverRef.current = onHoverTerrain }, [onHoverTerrain])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const styles = getComputedStyle(canvas)
    paletteRef.current = WorldRenderer.readPalette(name => styles.getPropertyValue(name).trim())
    rendererRef.current.setTerrain(terrainRef.current, paletteRef.current)
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    cameraRef.current.centerOnWorld(worldRef.current.width, worldRef.current.height)
    let frame = 0
    const resize = (): void => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(bounds.width * ratio)
      canvas.height = Math.round(bounds.height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    resize()
    const draw = (): void => {
      const bounds = canvas.getBoundingClientRect()
      rendererRef.current.draw(context, bounds.width, bounds.height, worldRef.current, cameraRef.current, selectedRef.current, paletteRef.current)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [])

  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  return <canvas
    ref={canvasRef}
    className="world-canvas"
    aria-label={`Vue du monde ${world.name}. Glisser pour déplacer, molette pour zoomer.`}
    onPointerDown={(event) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = { x: event.clientX, y: event.clientY, moved: false }
    }}
    onPointerMove={(event) => {
      if (dragRef.current) {
        const dx = event.clientX - dragRef.current.x
        const dy = event.clientY - dragRef.current.y
        if (Math.abs(dx) + Math.abs(dy) > 2) dragRef.current.moved = true
        cameraRef.current.pan(dx, dy)
        dragRef.current.x = event.clientX
        dragRef.current.y = event.clientY
        return
      }
      const bounds = event.currentTarget.getBoundingClientRect()
      const point = cameraRef.current.screenToWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, { x: bounds.width, y: bounds.height })
      const column = Math.floor(point.x / (terrainRef.current?.config.cellSize ?? 1))
      const row = Math.floor(point.y / (terrainRef.current?.config.cellSize ?? 1))
      const map = terrainRef.current
      hoverRef.current?.(map && point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height && column >= 0 && row >= 0 && column < map.columns && row < map.rows ? map.cells[row * map.columns + column] : null)
    }}
    onPointerUp={(event) => {
      const drag = dragRef.current
      dragRef.current = null
      if (!drag || drag.moved) return
      const bounds = event.currentTarget.getBoundingClientRect()
      const worldPoint = cameraRef.current.screenToWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, { x: bounds.width, y: bounds.height })
      let nearestId: string | null = null
      let nearestDistance = Number.POSITIVE_INFINITY
      for (const organism of worldRef.current.organisms) {
        const dx = organism.x - worldPoint.x
        const dy = organism.y - worldPoint.y
        const cosine = Math.cos(organism.direction)
        const sine = Math.sin(organism.direction)
        const localX = dx * cosine + dy * sine
        const localY = -dx * sine + dy * cosine
        const padding = 12 / (WORLD_SCALE * cameraRef.current.zoom)
        const radiusX = organism.radius * Math.sqrt(organism.genome.aspectRatio) + padding
        const radiusY = organism.radius / Math.sqrt(organism.genome.aspectRatio) + padding
        const ellipseDistance = (localX / radiusX) ** 2 + (localY / radiusY) ** 2
        const distance = dx * dx + dy * dy
        if (ellipseDistance <= 1 && distance < nearestDistance) { nearestId = organism.id; nearestDistance = distance }
      }
      onSelectOrganism(nearestId)
    }}
    onPointerCancel={() => { dragRef.current = null }}
    onPointerLeave={() => hoverRef.current?.(null)}
    onWheel={(event) => {
      event.preventDefault()
      const bounds = event.currentTarget.getBoundingClientRect()
      cameraRef.current.zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, { x: bounds.width, y: bounds.height })
    }}
    onDoubleClick={onResetCamera}
  />
}
