import type { TerrainGenerationConfig } from '../environment/terrain/terrainTypes'

export interface TerrainDraft extends TerrainGenerationConfig {
  seed: number
  customSeed: boolean
}

interface Props {
  value: TerrainDraft
  onChange: (field: keyof TerrainDraft, value: number | boolean) => void
  onRandomSeed: () => void
}

export function TerrainSettings({ value, onChange, onRandomSeed }: Props) {
  return <fieldset className="terrain-settings">
    <legend className="section-kicker">CARTE ET BIOMES</legend>
    <label className="seed-setting">Seed<input type="number" min="0" max="4294967295" step="1" value={value.seed} disabled={!value.customSeed} onChange={event => onChange('seed', Number(event.target.value))} /><button type="button" onClick={onRandomSeed} title="Générer une seed" aria-label="Générer une seed">↻</button></label>
    <label className="terrain-seed-toggle"><span>Utiliser cette seed</span><input type="checkbox" checked={value.customSeed} onChange={event => onChange('customSeed', event.target.checked)} /></label>
    <label>Relief<input type="number" min="0" max="1" step="0.05" value={value.relief} onChange={event => onChange('relief', Number(event.target.value))} /></label>
    <label>Humidité globale<input type="number" min="0" max="1" step="0.05" value={value.moisture} onChange={event => onChange('moisture', Number(event.target.value))} /></label>
    <label>Proportion d'eau<input type="number" min="0" max="0.6" step="0.02" value={value.waterCoverage} onChange={event => onChange('waterCoverage', Number(event.target.value))} /></label>
  </fieldset>
}

