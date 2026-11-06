import type { CellExpression } from '../core/types'
import type { World } from '../core/World'
import { getColonyMembership } from '../organisms/CellColony'
import type { Organism } from '../organisms/Organism'

const CONTEXT_CELL_SIZE = 120

/** Derives continuous cell expression from inherited capacities and local conditions. */
export class CellExpressionSystem {
  static update(world: World): void {
    const membership = getColonyMembership(world.organisms, world.links)
    const groups = new Map<string, Organism[]>()
    const degree = new Map<string, number>()
    for (const cell of world.organisms) {
      const id = membership.get(cell.id)?.id ?? cell.id
      const group = groups.get(id) ?? []
      group.push(cell)
      groups.set(id, group)
    }
    for (const link of world.links) {
      degree.set(link.cellAId, (degree.get(link.cellAId) ?? 0) + 1)
      degree.set(link.cellBId, (degree.get(link.cellBId) ?? 0) + 1)
    }
    const geometry = new Map<string, { x: number; y: number; maxDistance: number }>()
    for (const [id, group] of groups) {
      let x = 0
      let y = 0
      for (const member of group) { x += member.x; y += member.y }
      x /= group.length
      y /= group.length
      let maxDistance = 0
      for (const member of group) maxDistance = Math.max(maxDistance, Math.hypot(member.x - x, member.y - y))
      geometry.set(id, { x, y, maxDistance })
    }

    const localResources = new Map<string, number>()
    for (const resource of world.resources) {
      const key = bucketKey(Math.floor(resource.x / CONTEXT_CELL_SIZE), Math.floor(resource.y / CONTEXT_CELL_SIZE))
      localResources.set(key, (localResources.get(key) ?? 0) + resource.energy)
    }

    for (const cell of world.organisms) {
      const group = groups.get(membership.get(cell.id)?.id ?? cell.id) ?? [cell]
      const center = geometry.get(membership.get(cell.id)?.id ?? cell.id) ?? { x: cell.x, y: cell.y, maxDistance: 0 }
      const radial = center.maxDistance < Number.EPSILON ? 0.5 : Math.hypot(cell.x - center.x, cell.y - center.y) / center.maxDistance
      const localDegree = degree.get(cell.id) ?? 0
      const colonyEdgeSignal = group.length === 1 ? 0.5 : clamp(0.72 * radial + 0.28 / (1 + localDegree), 0, 1)
      const localResourceSignal = localFood(world, localResources, cell.x, cell.y)
      const scarcity = 1 - localResourceSignal
      const enabled = world.config.functionalDifferentiation
      const expression: CellExpression = enabled ? {
        foraging: clamp(0.2 + cell.genome.foraging * 0.62 + scarcity * 0.12 + colonyEdgeSignal * 0.15, 0, 1),
        motility: clamp(0.18 + cell.genome.motility * 0.68 + colonyEdgeSignal * 0.3, 0, 1),
        resilience: clamp(0.18 + cell.genome.resilience * 0.68 + (1 - colonyEdgeSignal) * 0.3, 0, 1),
        localResourceSignal,
        colonyEdgeSignal,
      } : { foraging: 0.5, motility: 0.5, resilience: 0.5, localResourceSignal, colonyEdgeSignal }
      cell.expression = expression
    }
  }
}

function localFood(world: World, resources: ReadonlyMap<string, number>, x: number, y: number): number {
  const column = Math.floor(x / CONTEXT_CELL_SIZE)
  const row = Math.floor(y / CONTEXT_CELL_SIZE)
  let energy = 0
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) energy += resources.get(bucketKey(column + dx, row + dy)) ?? 0
  return clamp(energy / Math.max(1, world.config.foodEnergy * 8), 0, 1)
}

function bucketKey(column: number, row: number): string { return `${column}:${row}` }
function clamp(value: number, minimum: number, maximum: number): number { return Math.max(minimum, Math.min(maximum, value)) }
