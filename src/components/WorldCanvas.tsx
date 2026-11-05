import { useEffect, useRef } from 'react'
import type { WorldSnapshot } from '../core/types'
import { Camera, WORLD_SCALE } from '../rendering/Camera'
import { WorldRenderer } from '../rendering/WorldRenderer'

interface Props { world: WorldSnapshot; selectedOrganismId: string | null; onSelectOrganism: (id: string | null) => void; onResetCamera: () => void }

export function WorldCanvas({ world, selectedOrganismId, onSelectOrganism, onResetCamera }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef(new Camera())
  const rendererRef = useRef(new WorldRenderer())
  const worldRef = useRef(world)
  const selectedRef = useRef(selectedOrganismId)

  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => { selectedRef.current = selectedOrganismId }, [selectedOrganismId])

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
      rendererRef.current.draw(context, bounds.width, bounds.height, worldRef.current, cameraRef.current, selectedRef.current)
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
      if (!dragRef.current) return
      const dx = event.clientX - dragRef.current.x
      const dy = event.clientY - dragRef.current.y
      if (Math.abs(dx) + Math.abs(dy) > 2) dragRef.current.moved = true
      cameraRef.current.pan(dx, dy)
      dragRef.current.x = event.clientX
      dragRef.current.y = event.clientY
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
        const distance = dx * dx + dy * dy
        const hitRadius = Math.max(organism.radius, 12 / (WORLD_SCALE * cameraRef.current.zoom))
        if (distance <= hitRadius * hitRadius && distance < nearestDistance) { nearestId = organism.id; nearestDistance = distance }
      }
      onSelectOrganism(nearestId)
    }}
    onPointerCancel={() => { dragRef.current = null }}
    onWheel={(event) => {
      event.preventDefault()
      const bounds = event.currentTarget.getBoundingClientRect()
      cameraRef.current.zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, { x: bounds.width, y: bounds.height })
    }}
    onDoubleClick={onResetCamera}
  />
}
