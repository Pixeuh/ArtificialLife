import type { Biome } from '../environment/terrain/terrainTypes'

const labels: readonly [Biome, string][] = [
  ['plains', 'Plaines'], ['forest', 'Forêt'], ['desert', 'Désert'], ['mountain', 'Montagne'], ['water', 'Eau'],
]

export function TerrainLegend() {
  return <div className="terrain-legend" aria-label="Légende des biomes">
    {labels.map(([biome, label]) => <span key={biome}><i className={`biome-swatch ${biome}`} />{label}</span>)}
  </div>
}

export function biomeLabel(biome: Biome): string {
  return labels.find(([key]) => key === biome)?.[1] ?? biome
}

