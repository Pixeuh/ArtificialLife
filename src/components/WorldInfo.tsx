import type { EvolutionSample, WorldSnapshot } from '../core/types'
import type { TerrainCell } from '../environment/terrain/terrainTypes'
import { biomeLabel } from './TerrainLegend'

export function WorldInfo({ world, selectedOrganismId, deathNotice = false, loading = false, hoveredTerrain }: { world: WorldSnapshot; selectedOrganismId: string | null; deathNotice?: boolean; loading?: boolean; hoveredTerrain?: TerrainCell | null }) {
  const selected = world.organisms.find(organism => organism.id === selectedOrganismId)
  const extinct = !loading && world.statistics.population === 0 && world.tick > 0
  const energyRatio = selected ? Math.max(0, Math.min(1, selected.energy / Math.max(selected.maxEnergy, Number.EPSILON))) : 0
  return <aside className="inspector">
    <div className="section-kicker"><span className="kicker-line" />OBSERVATION</div>
    <div className="world-heading"><div className="world-symbol">◈</div><div><div className="world-mode">{world.interventionMode === 'observation' ? 'OBSERVATION' : 'MODE DIVIN'} · {world.originType === 'primordial' ? 'PRIMORDIAL' : 'PERSONNALISÉ'}</div><h1>{world.name}</h1></div></div>
    <p className="world-description">Un écosystème primitif où organismes et ressources évoluent selon des règles déterministes.</p>
    <div className="terrain-readout" aria-live="polite">
      <span className="section-kicker">TERRAIN INSPECTÉ</span>
      {hoveredTerrain ? <><strong>{biomeLabel(hoveredTerrain.biome)}</strong><span>Altitude {Math.round(hoveredTerrain.elevation * 100)} · Humidité {Math.round(hoveredTerrain.moisture * 100)} · Température {Math.round(hoveredTerrain.temperature * 100)}</span><span>{hoveredTerrain.traversable ? `Coût de déplacement ×${hoveredTerrain.movementCost.toFixed(2)} · potentiel de nourriture ${Math.round(hoveredTerrain.foodPotential * 100)} %` : 'Zone aquatique · déplacement impossible'}</span></> : <span>Passez le curseur sur la carte.</span>}
    </div>
    <div className="info-divider" />
    <div className="section-kicker">PARAMÈTRES DU MONDE</div>
    <dl className="info-list">
      <div><dt>Graine aléatoire</dt><dd className="mono">{world.seed.toString().padStart(8, '0')}</dd></div>
      <div><dt>Dimensions</dt><dd className="mono">{world.width.toLocaleString('fr-FR')} × {world.height.toLocaleString('fr-FR')} <small>u</small></dd></div>
      <div><dt>Pas de simulation</dt><dd className="mono">{world.config.tickDuration.toFixed(3)} <small>s</small></dd></div>
      <div><dt>Métabolisme de base</dt><dd className="mono">{world.config.baseMetabolismRate} <small>énergie/s</small></dd></div>
      <div><dt>Coût déplacement</dt><dd className="mono">{world.config.movementEnergyCost} <small>énergie/u</small></dd></div>
      <div><dt>Énergie par ressource</dt><dd className="mono">{world.config.foodEnergy}</dd></div>
      <div><dt>Régénération</dt><dd className="mono">{world.config.foodRegenerationRate} <small>ressources/s</small></dd></div>
      <div><dt>Seuil de division</dt><dd className="mono">{world.config.divisionEnergyThreshold} <small>énergie</small></dd></div>
      <div><dt>Population maximale</dt><dd className="mono">{world.config.maximumPopulation}</dd></div>
      <div><dt>Taux de mutation</dt><dd className="mono">{(world.config.mutationRate * 100).toFixed(1)} <small>%/division</small></dd></div>
      <div><dt>Amplitude mutation</dt><dd className="mono">{world.config.mutationStep.toFixed(2)} <small>par variation</small></dd></div>
      <div><dt>Entretien d'adhésion</dt><dd className="mono">{world.config.adhesionEnergyCost} <small>énergie/s/lien/cellule</small></dd></div>
    </dl>
    <div className="info-divider" />
    <div className="section-kicker">ÉCOSYSTÈME</div>
    {loading ? <div className="extinction-state" role="status">Initialisation du monde…</div> : extinct && <div className="extinction-state" role="status">Population éteinte</div>}
    <div className="tick-row"><span>Cellules vivantes</span><strong className="mono">{world.statistics.population.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Colonies multicellulaires</span><strong className="mono">{world.statistics.colonies.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Divisions</span><strong className="mono">{world.statistics.divisions.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Cellules isolées</span><strong className="mono">{world.statistics.isolatedCells.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Taille moyenne des colonies</span><strong className="mono">{world.statistics.averageColonySize.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Plus grande colonie</span><strong className="mono">{world.statistics.largestColonySize}</strong></div>
    <div className="tick-row"><span>Adhésion moyenne</span><strong className="mono">{world.statistics.averageAdhesion.toFixed(3)}</strong></div>
    <div className="tick-row"><span>Allongement moyen</span><strong className="mono">{world.statistics.averageElongation.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Génération maximale</span><strong className="mono">{world.statistics.maxGeneration}</strong></div>
    <div className="tick-row"><span>Naissances moyennes</span><strong className="mono">{world.statistics.birthRate.toFixed(3)}/s</strong></div>
    <div className="tick-row"><span>Mortalité moyenne</span><strong className="mono">{world.statistics.mortalityRate.toFixed(3)}/s</strong></div>
    <EvolutionChart history={world.history} />
    <div className="tick-row"><span>Population initiale</span><strong className="mono">{world.statistics.initialPopulation.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Décès</span><strong className="mono">{world.statistics.totalDeaths.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Décès par famine</span><strong className="mono">{world.statistics.starvationDeaths.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Ressources restantes</span><strong className="mono accent">{world.statistics.resources.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Nourriture consommée</span><strong className="mono">{world.statistics.totalFoodConsumed.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Énergie moyenne</span><strong className="mono">{world.statistics.averageEnergy.toFixed(1)}</strong></div>
    <div className="tick-row"><span>Âge moyen</span><strong className="mono">{world.statistics.averageAge.toFixed(1)} s</strong></div>
    <div className="info-divider" style={{ marginTop: 19 }} />
    <div className="section-kicker">TEMPS SIMULÉ</div>
    <div className="time-display">{formatTime(world.simulatedTime)}<span> s</span></div>
    <div className="tick-row"><span>Ticks écoulés</span><strong className="mono">{world.tick.toLocaleString('fr-FR')}</strong></div>
    <div className="tick-row"><span>Vitesse</span><strong className="mono accent">×{world.speed}</strong></div>
    <div className="selected-organism">
      <div className="section-kicker">{selected ? 'ORGANISME SÉLECTIONNÉ' : 'INSPECTION'}</div>
      {selected ? <>
        <strong className="selected-id">{selected.id}</strong>
        <div className="tick-row"><span>Cellules dans la colonie</span><strong className="mono">{selected.colonySize}</strong></div>
        <div className="tick-row"><span>Colonie</span><strong className="mono">{selected.colonyId}</strong></div>
        <div className="tick-row"><span>Âge</span><strong className="mono">{selected.age.toFixed(2)} s</strong></div>
        <div className="tick-row"><span>Génération</span><strong className="mono">{selected.generation}</strong></div>
        <div className="tick-row"><span>Énergie</span><strong className="mono">{selected.energy.toFixed(1)} / {selected.maxEnergy.toFixed(1)}</strong></div>
        <div className="energy-meter" aria-label={`Énergie ${Math.round(energyRatio * 100)} %`}><span className={energyRatio < 0.25 ? 'critical' : energyRatio < 0.5 ? 'low' : ''} style={{ width: `${energyRatio * 100}%` }} /></div>
        <div className="tick-row"><span>Vitesse</span><strong className="mono">{selected.speed.toFixed(1)} u/s</strong></div>
        <div className="tick-row"><span>Métabolisme de base</span><strong className="mono">{selected.baseMetabolismRate}/s</strong></div>
        <div className="tick-row"><span>Coût déplacement</span><strong className="mono">{selected.movementEnergyCost}/u</strong></div>
        <div className="tick-row"><span>Adhésion génétique</span><strong className="mono">{selected.genome.adhesion.toFixed(3)}</strong></div>
        <div className="tick-row"><span>Forme (rapport axes)</span><strong className="mono">{selected.genome.aspectRatio.toFixed(2)}</strong></div>
        <div className="tick-row"><span>Nourriture consommée</span><strong className="mono">{selected.foodConsumed}</strong></div>
      </> : <p className="selection-hint">{deathNotice ? 'Organisme mort de faim.' : 'Cliquez sur un organisme dans le monde pour afficher ses caractéristiques.'}</p>}
    </div>
    <div className="inspector-footer"><span className="status-ring" />{loading ? 'INITIALISATION' : extinct ? 'POPULATION ÉTEINTE' : `MONDE ${world.paused ? 'STATIONNAIRE' : 'EN ÉVOLUTION'}`}</div>
  </aside>
}

function EvolutionChart({ history }: { history: readonly EvolutionSample[] }) {
  return <div className="evolution-chart" aria-label="Historique de la population et des colonies">
    <div className="chart-label"><span>POPULATION</span><strong>{history.at(-1)?.population ?? 0}</strong></div>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Évolution de la population">
      <polyline points={chartPoints(history, sample => sample.population)} />
    </svg>
    <div className="chart-label"><span>COLONIES</span><strong>{history.at(-1)?.colonies ?? 0}</strong></div>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Évolution du nombre de colonies">
      <polyline className="colonies" points={chartPoints(history, sample => sample.colonies)} />
    </svg>
    <small>1 échantillon/s · rétention max. 10 min</small>
  </div>
}

function chartPoints(history: readonly EvolutionSample[], value: (sample: EvolutionSample) => number): string {
  if (history.length === 0) return ''
  const values = history.map(value)
  const maximum = Math.max(1, ...values)
  return values.map((sampleValue, index) => {
    const x = history.length === 1 ? 100 : index / (history.length - 1) * 100
    const y = 22 - sampleValue / maximum * 20
    return x.toFixed(1) + ',' + y.toFixed(1)
  }).join(' ')
}

function formatTime(seconds: number): string {
  return seconds.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
