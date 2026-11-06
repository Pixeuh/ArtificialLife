import { useState } from 'react'
import type { EvolutionSample, WorldSnapshot } from '../core/types'
import type { TerrainCell } from '../environment/terrain/terrainTypes'
import { biomeLabel } from './TerrainLegend'

export function WorldInfo({ world, selectedOrganismId, onSelectOrganism, deathNotice = false, loading = false, hoveredTerrain }: { world: WorldSnapshot; selectedOrganismId: string | null; onSelectOrganism: (id: string) => void; deathNotice?: boolean; loading?: boolean; hoveredTerrain?: TerrainCell | null }) {
  const [showColonyMembers, setShowColonyMembers] = useState(false)
  const selected = world.organisms.find(organism => organism.id === selectedOrganismId)
  const selectedColony = selected ? world.organisms.filter(organism => organism.colonyId === selected.colonyId) : []
  const selectedIds = new Set(selectedColony.map(organism => organism.id))
  const colonyLinks = selected ? world.links.filter(link => selectedIds.has(link.cellAId) && selectedIds.has(link.cellBId)) : []
  const colonySize = selectedColony.length > 0 ? approximateColonySize(selectedColony) : 0
  const colonyEnergy = selectedColony.reduce((sum, cell) => sum + cell.energy, 0)
  const colonyMeanAge = selectedColony.length === 0 ? 0 : selectedColony.reduce((sum, cell) => sum + cell.age, 0) / selectedColony.length
  const colonyMeanBranching = mean(selectedColony.map(cell => cell.genome.branching))
  const colonyMeanPersistence = mean(selectedColony.map(cell => cell.genome.bondPersistence))
  const colonyAngle = circularMean(selectedColony.map(cell => cell.genome.divisionAngle))
  const extinct = !loading && world.statistics.population === 0 && world.tick > 0
  const energyRatio = selected ? Math.max(0, Math.min(1, selected.energy / Math.max(selected.maxEnergy, Number.EPSILON))) : 0
  return <aside className="inspector">
    <div className="section-kicker"><span className="kicker-line" />{world.scenario ? 'EXPÉRIENCE CONTRÔLÉE' : 'OBSERVATION'}</div>
    <div className="world-heading"><div className="world-symbol">◈</div><div><div className="world-mode">{world.scenario ? 'LABORATOIRE · MULTICELLULARITÉ' : `${world.interventionMode === 'observation' ? 'OBSERVATION' : 'MODE DIVIN'} · ${world.originType === 'primordial' ? 'PRIMORDIAL' : 'PERSONNALISÉ'}`}</div><h1>{world.name}</h1></div></div>
    <p className="world-description">{world.scenario?.startsWith('differentiation') ? 'Comparaison à seed et conditions identiques. Le monde témoin désactive l’expression fonctionnelle et les transferts d’énergie.' : world.scenario ? 'Conditions initiales reproductibles, mêmes règles biologiques que les mondes naturels. Trois profils fondateurs contrastés permettent de suivre les différences héritées.' : 'Un écosystème primitif où organismes et ressources évoluent selon des règles déterministes.'}</p>
    {world.scenario && <div className="experiment-profiles"><strong>PROFILS INITIAUX · SEED {world.seed}</strong>{world.initialGenomes?.map((genome, index) => <span key={index}>P{index + 1} · bif. {genome.branching?.toFixed(2)} · cueille {genome.foraging?.toFixed(2)} · moteur {genome.motility?.toFixed(2)} · structure {genome.resilience?.toFixed(2)}</span>)}<small>La parenté est suivie par cellule ; aucun arbre généalogique graphique n’est encore fourni.</small></div>}
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
    <div className="tick-row"><span>Allongement des colonies</span><strong className="mono">{world.statistics.averageColonyElongation.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Liaisons par cellule</span><strong className="mono">{world.statistics.averageLinksPerCell.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Liaisons par colonie</span><strong className="mono">{world.statistics.averageLinksPerColony.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Bifurcation héréditaire</span><strong className="mono">{world.statistics.averageBranchingTendency.toFixed(3)}</strong></div>
    <div className="tick-row"><span>Persistance moyenne</span><strong className="mono">{world.statistics.averageBondPersistence.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Expression · acquisition</span><strong className="mono">{world.statistics.averageForagingExpression.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Expression · motricité</span><strong className="mono">{world.statistics.averageMotilityExpression.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Expression · résistance</span><strong className="mono">{world.statistics.averageResilienceExpression.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Énergie moyenne · acquisition élevée</span><strong className="mono">{world.statistics.averageEnergyHighForaging.toFixed(1)}</strong></div>
    <div className="tick-row"><span>Énergie moyenne · acquisition faible</span><strong className="mono">{world.statistics.averageEnergyLowForaging.toFixed(1)}</strong></div>
    <div className="tick-row"><span>Énergie transférée · perte</span><strong className="mono">{world.statistics.totalEnergyTransferred.toFixed(2)} · {world.statistics.energyTransferLoss.toFixed(2)}</strong></div>
    <div className="tick-row"><span>Colonies différenciées</span><strong className="mono">{(world.statistics.differentiatedColonyRatio * 100).toFixed(1)} %</strong></div>
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
        <div className="tick-row"><span>Lignée fondatrice</span><strong className="mono">{selected.lineageId}</strong></div>
        <div className="tick-row"><span>Parent</span><strong className="mono">{selected.parentId ?? 'Fondateur / inconnu'}</strong></div>
        <div className="tick-row"><span>Tick de naissance</span><strong className="mono">{selected.birthTick}</strong></div>
        <div className="tick-row"><span>Diamètre estimé</span><strong className="mono">{colonySize.toFixed(1)} u</strong></div>
        <div className="tick-row"><span>Énergie cumulée</span><strong className="mono">{colonyEnergy.toFixed(1)}</strong></div>
        <div className="tick-row"><span>Âge moyen des cellules</span><strong className="mono">{colonyMeanAge.toFixed(2)} s</strong></div>
        <div className="tick-row"><span>Liaisons / force moyenne</span><strong className="mono">{colonyLinks.length} / {averageLinkStrength(colonyLinks).toFixed(2)}</strong></div>
        <div className="tick-row"><span>Gènes moyens · bifurcation</span><strong className="mono">{colonyMeanBranching.toFixed(3)}</strong></div>
        <div className="tick-row"><span>Gènes moyens · persistance</span><strong className="mono">{colonyMeanPersistence.toFixed(2)}</strong></div>
        <div className="tick-row"><span>Angle de division moyen</span><strong className="mono">{(colonyAngle * 180 / Math.PI).toFixed(0)}°</strong></div>
        <details className="colony-members" onToggle={event => setShowColonyMembers(event.currentTarget.open)}>
          <summary>Cellules de la colonie · {selectedColony.length}</summary>
          {showColonyMembers && <div className="colony-member-list">{selectedColony.map(cell => <button key={cell.id} className={cell.id === selected.id ? 'active' : ''} onClick={() => onSelectOrganism(cell.id)}>{cell.id}<span>G{cell.generation}</span></button>)}</div>}
        </details>
        <div className="tick-row"><span>Âge</span><strong className="mono">{selected.age.toFixed(2)} s</strong></div>
        <div className="tick-row"><span>Génération</span><strong className="mono">{selected.generation}</strong></div>
        <div className="tick-row"><span>Énergie</span><strong className="mono">{selected.energy.toFixed(1)} / {selected.maxEnergy.toFixed(1)}</strong></div>
        <div className="energy-meter" aria-label={`Énergie ${Math.round(energyRatio * 100)} %`}><span className={energyRatio < 0.25 ? 'critical' : energyRatio < 0.5 ? 'low' : ''} style={{ width: `${energyRatio * 100}%` }} /></div>
        <div className="tick-row"><span>Vitesse</span><strong className="mono">{selected.speed.toFixed(1)} u/s</strong></div>
        <div className="tick-row"><span>Métabolisme de base</span><strong className="mono">{selected.baseMetabolismRate}/s</strong></div>
        <div className="tick-row"><span>Coût déplacement</span><strong className="mono">{selected.movementEnergyCost}/u</strong></div>
        <div className="tick-row"><span>Adhésion génétique</span><strong className="mono">{selected.genome.adhesion.toFixed(3)}</strong></div>
        <div className="tick-row"><span>Forme (rapport axes)</span><strong className="mono">{selected.genome.aspectRatio.toFixed(2)}</strong></div>
        <div className="tick-row"><span>Angle de division</span><strong className="mono">{(selected.genome.divisionAngle * 180 / Math.PI).toFixed(0)}°</strong></div>
        <div className="tick-row"><span>Tendance à bifurquer</span><strong className="mono">{selected.genome.branching.toFixed(3)}</strong></div>
        <div className="tick-row"><span>Persistance des liaisons</span><strong className="mono">{selected.genome.bondPersistence.toFixed(2)}</strong></div>
        <div className="tick-row"><span>Gènes · acquisition / motricité / résistance</span><strong className="mono">{selected.genome.foraging.toFixed(2)} / {selected.genome.motility.toFixed(2)} / {selected.genome.resilience.toFixed(2)}</strong></div>
        <div className="tick-row"><span>Expression · acquisition / motricité / résistance</span><strong className="mono">{selected.expression.foraging.toFixed(2)} / {selected.expression.motility.toFixed(2)} / {selected.expression.resilience.toFixed(2)}</strong></div>
        <div className="tick-row"><span>Contexte local · ressources / périphérie</span><strong className="mono">{selected.expression.localResourceSignal.toFixed(2)} / {selected.expression.colonyEdgeSignal.toFixed(2)}</strong></div>
        <div className="capacity-legend"><span><i className="foraging" />Acquisition</span><span><i className="motility" />Motricité</span><span><i className="resilience" />Résistance</span><small>Arcs colorés visibles au zoom microscopique ; leur longueur et leur intensité suivent l’expression simulée.</small></div>
        <div className="tick-row"><span>Nourriture consommée</span><strong className="mono">{selected.foodConsumed}</strong></div>
      </> : <p className="selection-hint">{deathNotice ? 'Organisme mort de faim.' : 'Cliquez sur un organisme dans le monde pour afficher ses caractéristiques.'}</p>}
    </div>
    <div className="inspector-footer"><span className="status-ring" />{loading ? 'INITIALISATION' : extinct ? 'POPULATION ÉTEINTE' : `MONDE ${world.paused ? 'STATIONNAIRE' : 'EN ÉVOLUTION'}`}</div>
  </aside>
}

function approximateColonySize(cells: readonly WorldSnapshot['organisms'][number][]): number {
  if (cells.length === 0) return 0
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const cell of cells) {
    minX = Math.min(minX, cell.x - cell.radius)
    minY = Math.min(minY, cell.y - cell.radius)
    maxX = Math.max(maxX, cell.x + cell.radius)
    maxY = Math.max(maxY, cell.y + cell.radius)
  }
  return Math.hypot(maxX - minX, maxY - minY)
}

function averageLinkStrength(links: WorldSnapshot['links']): number {
  return links.length === 0 ? 0 : links.reduce((sum, link) => sum + link.strength, 0) / links.length
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
    <div className="chart-label"><span>MORPHOLOGIE · BIFURCATION</span><strong>{history.at(-1)?.averageBranchingTendency.toFixed(2) ?? '0.00'}</strong></div>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Évolution de la tendance moyenne à bifurquer">
      <polyline className="morphology" points={chartPoints(history, sample => sample.averageBranchingTendency)} />
    </svg>
    <div className="chart-label"><span>GÈNE · PERSISTANCE DES LIAISONS</span><strong>{history.at(-1)?.averageBondPersistence.toFixed(2) ?? '0.00'}</strong></div>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Évolution de la persistance moyenne des liaisons héritée">
      <polyline className="morphology" points={chartPoints(history, sample => sample.averageBondPersistence)} />
    </svg>
    <div className="chart-label"><span>MORPHOLOGIE · RAPPORT D’AXES CELLULAIRE</span><strong>{history.at(-1)?.averageElongation.toFixed(2) ?? '0.00'}</strong></div>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Évolution du rapport moyen des axes cellulaires">
      <polyline className="morphology" points={chartPoints(history, sample => sample.averageElongation)} />
    </svg>
    <div className="chart-label"><span>ALLONGEMENT DES COLONIES</span><strong>{history.at(-1)?.averageColonyElongation.toFixed(2) ?? '0.00'}</strong></div>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Évolution de l'allongement géométrique moyen des colonies">
      <polyline className="morphology" points={chartPoints(history, sample => sample.averageColonyElongation)} />
    </svg>
    <div className="chart-label"><span>EXPRESSION · ACQUISITION / MOTRICITÉ / RÉSISTANCE</span><strong>{history.at(-1)?.averageForagingExpression.toFixed(2) ?? '0.00'} / {history.at(-1)?.averageMotilityExpression.toFixed(2) ?? '0.00'} / {history.at(-1)?.averageResilienceExpression.toFixed(2) ?? '0.00'}</strong></div>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Évolution de l'expression moyenne des capacités fonctionnelles">
      <polyline className="morphology" points={chartPoints(history, sample => sample.averageForagingExpression)} />
      <polyline className="colonies" points={chartPoints(history, sample => sample.averageMotilityExpression)} />
      <polyline className="resilience" points={chartPoints(history, sample => sample.averageResilienceExpression)} />
    </svg>
    <div className="chart-label"><span>COLONIES DIFFÉRENCIÉES · ÉNERGIE TRANSFÉRÉE</span><strong>{((history.at(-1)?.differentiatedColonyRatio ?? 0) * 100).toFixed(0)} % · {history.at(-1)?.totalEnergyTransferred.toFixed(1) ?? '0.0'}</strong></div>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Évolution de la proportion des colonies différenciées">
      <polyline className="morphology" points={chartPoints(history, sample => sample.differentiatedColonyRatio)} />
    </svg>
    <small>1 échantillon/s · rétention max. 10 min</small>
  </div>
}

function mean(values: readonly number[]): number { return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length }

function circularMean(angles: readonly number[]): number {
  if (angles.length === 0) return 0
  const sine = angles.reduce((sum, angle) => sum + Math.sin(angle), 0)
  const cosine = angles.reduce((sum, angle) => sum + Math.cos(angle), 0)
  return Math.atan2(sine, cosine)
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
