import type { WorldSnapshot } from '../core/types'

export function WorldInfo({ world, selectedOrganismId, deathNotice = false }: { world: WorldSnapshot; selectedOrganismId: string | null; deathNotice?: boolean }) {
  const selected = world.organisms.find(organism => organism.id === selectedOrganismId)
  const extinct = world.statistics.population === 0
  const energyRatio = selected ? Math.max(0, Math.min(1, selected.energy / Math.max(selected.maxEnergy, Number.EPSILON))) : 0
  return <aside className="inspector">
    <div className="section-kicker"><span className="kicker-line" />OBSERVATION</div>
    <div className="world-heading"><div className="world-symbol">◈</div><div><div className="world-mode">{world.id === 'world-a' ? 'MODE NATUREL' : 'MODE DIVIN'}</div><h1>{world.name}</h1></div></div>
    <p className="world-description">Un écosystème primitif où organismes et ressources évoluent selon des règles déterministes.</p>
    <div className="info-divider" />
    <div className="section-kicker">PARAMÈTRES DU MONDE</div>
    <dl className="info-list">
      <div><dt>Graine aléatoire</dt><dd className="mono">{world.seed.toString().padStart(8, '0')}</dd></div>
      <div><dt>Dimensions</dt><dd className="mono">{world.width.toLocaleString('fr-FR')} × {world.height.toLocaleString('fr-FR')} <small>u</small></dd></div>
      <div><dt>Pas de simulation</dt><dd className="mono">{world.config.tickDuration.toFixed(3)} <small>s</small></dd></div>
      <div><dt>Métabolisme de base</dt><dd className="mono">{world.config.baseMetabolismRate} <small>énergie/s</small></dd></div>
      <div><dt>Coût déplacement</dt><dd className="mono">{world.config.movementEnergyCost} <small>énergie/u</small></dd></div>
    </dl>
    <div className="info-divider" />
    <div className="section-kicker">ÉCOSYSTÈME</div>
    {extinct && <div className="extinction-state" role="status">Population éteinte</div>}
    <div className="tick-row"><span>Population vivante</span><strong className="mono">{world.statistics.population.toLocaleString('fr-FR')}</strong></div>
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
        <div className="tick-row"><span>Âge</span><strong className="mono">{selected.age.toFixed(2)} s</strong></div>
        <div className="tick-row"><span>Énergie</span><strong className="mono">{selected.energy.toFixed(1)} / {selected.maxEnergy.toFixed(1)}</strong></div>
        <div className="energy-meter" aria-label={`Énergie ${Math.round(energyRatio * 100)} %`}><span className={energyRatio < 0.25 ? 'critical' : energyRatio < 0.5 ? 'low' : ''} style={{ width: `${energyRatio * 100}%` }} /></div>
        <div className="tick-row"><span>Vitesse</span><strong className="mono">{selected.speed.toFixed(1)} u/s</strong></div>
        <div className="tick-row"><span>Métabolisme de base</span><strong className="mono">{selected.baseMetabolismRate}/s</strong></div>
        <div className="tick-row"><span>Coût déplacement</span><strong className="mono">{selected.movementEnergyCost}/u</strong></div>
        <div className="tick-row"><span>Nourriture consommée</span><strong className="mono">{selected.foodConsumed}</strong></div>
      </> : <p className="selection-hint">{deathNotice ? 'Organisme mort de faim.' : 'Cliquez sur un organisme dans le monde pour afficher ses caractéristiques.'}</p>}
    </div>
    <div className="inspector-footer"><span className="status-ring" />{extinct ? 'POPULATION ÉTEINTE' : `MONDE ${world.paused ? 'STATIONNAIRE' : 'EN ÉVOLUTION'}`}</div>
  </aside>
}

function formatTime(seconds: number): string {
  return seconds.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
