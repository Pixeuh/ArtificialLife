import type { CellGenome, WorldDefinition } from '../core/types'

const founders: readonly CellGenome[] = [
  { adhesion: 0.9, aspectRatio: 1, branching: 0.5, bondPersistence: 1, foraging: 0.95, motility: 0.2, resilience: 0.2 },
  { adhesion: 0.9, aspectRatio: 1, branching: 0.5, bondPersistence: 1, foraging: 0.2, motility: 0.95, resilience: 0.2 },
  { adhesion: 0.9, aspectRatio: 1, branching: 0.5, bondPersistence: 1, foraging: 0.2, motility: 0.2, resilience: 0.95 },
  { adhesion: 0.9, aspectRatio: 1, branching: 0.5, bondPersistence: 1, foraging: 0.5, motility: 0.5, resilience: 0.5 },
]

/** Matched pair: same seed, founders, ecology and rules; only new functions differ. */
export function createDifferentiationExperiment(seed = 20_260_901): { treatment: WorldDefinition; control: WorldDefinition } {
  const shared = {
    width: 1_200,
    height: 800,
    seed: seed >>> 0,
    originType: 'custom' as const,
    interventionMode: 'observation' as const,
    terrainConfig: { waterCoverage: 0.08 },
    initialGenomes: founders,
    config: {
      initialOrganismCount: 24,
      initialFoodCount: 240,
      maxFoodCount: 320,
      foodEnergy: 30,
      foodRegenerationRate: 1.5,
      organismSpeed: 20,
      initialEnergy: 60,
      baseMetabolismRate: 0.08,
      movementEnergyCost: 0.0005,
      divisionEnergyThreshold: 95,
      mutationRate: 0.03,
      mutationStep: 0.1,
      adhesionEnergyCost: 0.01,
      maximumPopulation: 240,
      turnRate: 0.65,
    },
  }
  return {
    treatment: { ...shared, id: 'differentiation-lab', name: 'Diff · Traitement', scenario: 'differentiation-treatment', config: { ...shared.config, functionalDifferentiation: true, energyTransferEnabled: true } },
    control: { ...shared, id: 'differentiation-control', name: 'Diff · Témoin', scenario: 'differentiation-control', config: { ...shared.config, functionalDifferentiation: false, energyTransferEnabled: false } },
  }
}
