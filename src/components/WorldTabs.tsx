import type { WorldSnapshot } from '../core/types'

export function WorldTabs({ worlds, selectedId, onSelect }: { worlds: WorldSnapshot[]; selectedId: string; onSelect: (id: string) => void }) {
  return <nav className="world-tabs" aria-label="Sélection du monde">
    {worlds.map(world => <button key={world.id} className={`world-tab ${selectedId === world.id ? 'selected' : ''}`} onClick={() => onSelect(world.id)} aria-current={selectedId === world.id ? 'page' : undefined}>
      <span className={`tab-indicator ${selectedId === world.id ? 'on' : ''}`} />
      <span className="tab-name">{world.name}</span>
      <span className="tab-mode">{world.scenario ? 'EXPÉRIENCE' : world.interventionMode === 'observation' ? 'OBSERVATION' : 'DIVIN'}</span>
    </button>)}
  </nav>
}
