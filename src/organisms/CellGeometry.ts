import type { Organism } from './Organism'

export interface CellAxes { readonly radiusX: number; readonly radiusY: number }

/** Ellipse geometry preserves the existing radius as its area-equivalent radius. */
export function getCellAxes(cell: Organism, scale = 1): CellAxes {
  const aspect = Math.max(0.5, Math.min(2, cell.genome.aspectRatio))
  return { radiusX: cell.radius * Math.sqrt(aspect) * scale, radiusY: cell.radius / Math.sqrt(aspect) * scale }
}

/** Support distance of an oriented ellipse along a normalized world-space direction. */
export function supportRadius(cell: Organism, directionX: number, directionY: number): number {
  const { radiusX, radiusY } = getCellAxes(cell)
  const cosine = Math.cos(cell.direction)
  const sine = Math.sin(cell.direction)
  const localX = directionX * cosine + directionY * sine
  const localY = -directionX * sine + directionY * cosine
  return Math.sqrt((radiusX * localX) ** 2 + (radiusY * localY) ** 2)
}

export function cellBoundaryExtents(cell: Organism): { x: number; y: number } {
  return { x: supportRadius(cell, 1, 0), y: supportRadius(cell, 0, 1) }
}
