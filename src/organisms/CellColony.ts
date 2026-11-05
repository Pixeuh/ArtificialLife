import type { CellLinkSnapshot } from '../core/types'
import type { Organism } from './Organism'

export interface ColonyMembership { readonly id: string; readonly size: number }

/** Derives colonies from current physical links; each isolated cell is a size-one group. */
export function getColonyMembership(organisms: readonly Organism[], links: readonly CellLinkSnapshot[]): Map<string, ColonyMembership> {
  const existing = new Set(organisms.map(cell => cell.id))
  const adjacent = new Map<string, string[]>()
  for (const cell of organisms) adjacent.set(cell.id, [])
  for (const link of links) {
    if (!existing.has(link.cellAId) || !existing.has(link.cellBId)) continue
    adjacent.get(link.cellAId)?.push(link.cellBId)
    adjacent.get(link.cellBId)?.push(link.cellAId)
  }

  const membership = new Map<string, ColonyMembership>()
  for (const cell of organisms) {
    if (membership.has(cell.id)) continue
    const component: string[] = []
    const queue = [cell.id]
    membership.set(cell.id, { id: cell.id, size: 0 })
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]
      component.push(current)
      for (const neighbor of adjacent.get(current) ?? []) {
        if (membership.has(neighbor)) continue
        membership.set(neighbor, { id: cell.id, size: 0 })
        queue.push(neighbor)
      }
    }
    const colony = { id: component.reduce((lowest, id) => id < lowest ? id : lowest), size: component.length }
    for (const id of component) membership.set(id, colony)
  }
  return membership
}
