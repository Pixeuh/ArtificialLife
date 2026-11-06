import type { World } from '../core/World'

export interface EnergyTransferMetrics { transferred: number; dissipated: number }

/** Transfers a bounded amount over each extant bond once per tick; 10% is dissipated. */
export class EnergyTransferSystem {
  static update(world: World, deltaTime: number): EnergyTransferMetrics {
    const metrics: EnergyTransferMetrics = { transferred: 0, dissipated: 0 }
    if (!world.config.energyTransferEnabled || world.links.length === 0 || deltaTime <= 0) return metrics
    const cells = new Map(world.organisms.map(cell => [cell.id, cell]))
    const maximumTransferPerLink = 0.4 * deltaTime
    for (const link of world.links) {
      const a = cells.get(link.cellAId)
      const b = cells.get(link.cellBId)
      if (!a?.active || !b?.active) continue
      const donor = a.energy >= b.energy ? a : b
      const receiver = donor === a ? b : a
      const gradientTransfer = Math.max(0, donor.energy - receiver.energy) * 0.08
      const receiverCapacity = Math.max(0, receiver.maxEnergy - receiver.energy)
      const amount = Math.min(maximumTransferPerLink, gradientTransfer, donor.energy, receiverCapacity / 0.9)
      if (!(amount > 0) || !Number.isFinite(amount)) continue
      const delivered = amount * 0.9
      donor.energy = Math.max(0, donor.energy - amount)
      receiver.energy = Math.min(receiver.maxEnergy, receiver.energy + delivered)
      metrics.transferred += amount
      metrics.dissipated += amount - delivered
    }
    return metrics
  }
}
