import type { WorldSnapshot } from '../core/types'

export function WorldInfo({ world, selectedOrganismId }: { world: WorldSnapshot; selectedOrganismId: string | null }) {
  const selected = world.organisms.find(organism => organism.id === selectedOrganismId)
  return <aside className="inspector">
    <div className="section-kicker"><span className="kicker-line" />OBSERVATION</div>
    <div className="world-heading"><div className="world-symbol">◈</div><div><div className="world-mode">{world.id === 'world-a' ? 'MODE NATUREL' : 'MODE DIVIN'}</div><h1>{world.name}</h1></div></div>
    <p className="world-description">Un écosystème primitif où organismes et ressources évoluent selon des règles déterministes.</p>
    <div className="info-divider" />
    <div className="section-kicker">PARAMÈTRES DU MONDE</div>
    <dl className="info-list">
      <div><dt>Graine aléatoire</dt><dd className="mono">{world.seed.toString().padStart(8, '0')}</dd></div>
      <div><dt>Dimensions</dt><dd className="mono">{world.width.toLocaleString('fr-FR')} × {world.height.toLocaleString('fr-FR')} <small>u</small></dd></div>
      <div><dt>Pas de simulation</dt><dd className="mono">{(world.config?.tickDuration as number).toFixed(3)} <small>s</small></dd></div>
      <div><dt>Identifiant</dt><dd className="mono muted">{world.id}</dd></div>
    </dl>
    <div className="info-divider" />
    <div className="section-kicker">ÉCOSYSTÈME</div>
    <div className="tick-row"><span>Organismes</span><strong className="mono">{world.statistics.population.toLocaleString('fr-FR')}</strong></div>
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
        <div className="tick-row"><span>Énergie</span><strong className="mono">{selected.energy.toFixed(1)}</strong></div>
        <div className="tick-row"><span>Vitesse</span><strong className="mono">{selected.speed.toFixed(1)} u/s</strong></div>
        <div className="tick-row"><span>Nourriture consommée</span><strong className="mono">{selected.foodConsumed}</strong></div>
      </> : <p className="selection-hint">Cliquez sur un organisme dans le monde pour afficher ses caractéristiques.</p>}
    </div>
    <div className="inspector-footer"><span className="status-ring" />MONDE {world.paused ? 'STATIONNAIRE' : 'EN ÉVOLUTION'}</div>
  </aside>
}

function formatTime(seconds: number): string {
  return seconds.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
