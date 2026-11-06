import type { WorldDefinition } from '../core/types'

/** Reproducible, independent laboratory start using only the normal world rules. */
export function createColonyGrowthExperiment(seed = 20_260_815): WorldDefinition {
  return {
    id: 'colony-lab',
    name: 'Laboratoire',
    width: 1_200,
    height: 800,
    seed: seed >>> 0,
    originType: 'custom',
    interventionMode: 'observation',
    scenario: 'colony-growth',
    terrainConfig: { waterCoverage: 0.08 },
    config: {
      initialOrganismCount: 20,
      initialFoodCount: 400,
      maxFoodCount: 550,
      foodEnergy: 30,
      foodRegenerationRate: 2,
      organismSpeed: 22,
      initialEnergy: 60,
      baseMetabolismRate: 0.08,
      movementEnergyCost: 0.0005,
      divisionEnergyThreshold: 95,
      mutationRate: 0.03,
      mutationStep: 0.12,
      adhesionEnergyCost: 0.01,
      maximumPopulation: 250,
      turnRate: 0.65,
    },
    // Three founder profiles make inherited variation directly observable.
    initialGenomes: [
      { adhesion: 0.95, aspectRatio: 1.4, divisionAngle: 0, branching: 0.05, bondPersistence: 0.8 },
      { adhesion: 0.95, aspectRatio: 0.8, divisionAngle: 0.15, branching: 0.95, bondPersistence: 1.3 },
      { adhesion: 0.7, aspectRatio: 1, divisionAngle: -0.3, branching: 0.5, bondPersistence: 1.8 },
    ],
  }
}
