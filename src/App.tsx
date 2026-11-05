import { useEffect, useRef, useState } from 'react'
import type { WorldDefinition, WorldSnapshot } from './core/types'
import type { WorkerCommand, WorkerEvent } from './workers/protocol'
import { WORLD_DEFAULTS, type WorldConfig } from './core/types'
import { SimulationControls } from './components/SimulationControls'
import { WorldCanvas } from './components/WorldCanvas'
import { WorldInfo } from './components/WorldInfo'
import { WorldTabs } from './components/WorldTabs'

const definitions: WorldDefinition[] = [
  { id: 'world-a', name: 'Monde A', width: 4_000, height: 2_500, seed: 381_047_21, config: { initialOrganismCount: 50, initialFoodCount: 250, maxFoodCount: 350 } },
  { id: 'world-b', name: 'Monde B', width: 4_000, height: 2_500, seed: 927_163_04, config: { initialOrganismCount: 40, initialFoodCount: 180, maxFoodCount: 300 } },
]

type InitialCounts = { organisms: number; foods: number }

export default function App() {
  const workers = useRef<Worker[]>([])
  const [worlds, setWorlds] = useState<WorldSnapshot[]>(() => definitions.map(definition => ({
    ...definition,
    config: { ...WORLD_DEFAULTS, ...definition.config },
    simulatedTime: 0,
    tick: 0,
    paused: true,
    speed: 1,
    organisms: [],
    resources: [],
    statistics: { population: 0, resources: 0, totalFoodConsumed: 0, averageEnergy: 0, averageAge: 0 },
  })))
  const [selectedId, setSelectedId] = useState(definitions[0].id)
  const [selectedOrganismId, setSelectedOrganismId] = useState<string | null>(null)
  const [draftCounts, setDraftCounts] = useState<Record<string, InitialCounts>>(() => Object.fromEntries(definitions.map(definition => [definition.id, {
    organisms: definition.config?.initialOrganismCount ?? WORLD_DEFAULTS.initialOrganismCount,
    foods: definition.config?.initialFoodCount ?? WORLD_DEFAULTS.initialFoodCount,
  }])))
  const [showSettings, setShowSettings] = useState(false)
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const selected = worlds.find(world => world.id === selectedId) ?? worlds[0]

  useEffect(() => {
    const instances = definitions.map(() => new Worker(new URL('./workers/simulation.worker.ts', import.meta.url), { type: 'module' }))
    workers.current = instances
    instances.forEach((worker, index) => {
      worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
        const message = event.data
        if (message.type === 'state') setWorlds(current => current.map(world => world.id === message.world.id ? message.world : world))
        if (message.type === 'error') console.error(message.message)
      }
      worker.postMessage({ type: 'initialize', world: definitions[index] } satisfies WorkerCommand)
    })
    return () => {
      instances.forEach(worker => { worker.postMessage({ type: 'destroy' } satisfies WorkerCommand); worker.terminate() })
      workers.current = []
    }
  }, [])

  const selectWorld = (id: string): void => {
    setSelectedId(id)
    setSelectedOrganismId(null)
  }

  const command = (type: 'start' | 'pause' | 'reset' | 'set-speed', speed?: number): void => {
    const index = definitions.findIndex(definition => definition.id === selectedId)
    let message: WorkerCommand
    if (type === 'set-speed') message = { type, speed: speed ?? 1 }
    else if (type === 'reset') {
      const definition = definitions[index]
      const counts = draftCounts[selectedId]
      const config: Partial<WorldConfig> = {
        ...definition.config,
        initialOrganismCount: counts.organisms,
        initialFoodCount: counts.foods,
        maxFoodCount: Math.max(definition.config?.maxFoodCount ?? WORLD_DEFAULTS.maxFoodCount, counts.foods),
      }
      message = { type, world: { ...definition, config } }
      setSelectedOrganismId(null)
    } else message = { type }
    workers.current[index]?.postMessage(message)
  }

  const updateInitialCount = (field: keyof InitialCounts, value: number): void => {
    setDraftCounts(current => ({ ...current, [selectedId]: { ...current[selectedId], [field]: Number.isFinite(value) ? Math.max(0, Math.min(2_000, Math.floor(value))) : 0 } }))
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="Artificial Life accueil"><span className="brand-mark"><i /><i /><i /><i /></span><span>ARTIFICIAL<span className="brand-light"> LIFE</span></span><span className="version">0.2</span></a>
      <div className="header-divider" />
      <WorldTabs worlds={worlds} selectedId={selectedId} onSelect={selectWorld} />
      <div className="header-right"><span className="system-label"><span className="live-dot" />SYSTÈME OPÉRATIONNEL</span><button className={`settings-button ${showSettings ? 'selected' : ''}`} onClick={() => setShowSettings(value => !value)} aria-expanded={showSettings} aria-label="Afficher les paramètres"><span>☷</span><span>Paramètres</span></button></div>
    </header>
    {showSettings && <div className="settings-popover"><div className="section-kicker">ÉCOSYSTÈME · {selected.name.toUpperCase()}</div><label>Population initiale<input type="number" min="0" max="2000" value={draftCounts[selectedId].organisms} onChange={event => updateInitialCount('organisms', Number(event.target.value))} /></label><label>Ressources initiales<input type="number" min="0" max="2000" value={draftCounts[selectedId].foods} onChange={event => updateInitialCount('foods', Number(event.target.value))} /></label><p>Les réglages sont appliqués à la réinitialisation du monde.</p><p>Pas fixe : <strong>33,3 ms · worker indépendant</strong></p></div>}
    <section className="workspace">
      <div className="canvas-column">
        <div className="canvas-toolbar"><div><span className="breadcrumb">ESPACE DE SIMULATION</span><span className="breadcrumb-separator">/</span><span className="current-world">{selected.name}</span></div><button className="center-button" onClick={() => setCameraResetKey(value => value + 1)}><span>⌖</span> Recentrer</button></div>
        <div className="canvas-frame"><WorldCanvas key={`${selected.id}-${cameraResetKey}`} world={selected} selectedOrganismId={selectedOrganismId} onSelectOrganism={setSelectedOrganismId} onResetCamera={() => setCameraResetKey(value => value + 1)} /><div className="canvas-corner top-left" /><div className="canvas-corner top-right" /><div className="canvas-corner bottom-left" /><div className="canvas-corner bottom-right" /><div className="canvas-coordinates">PLAN XY <span>·</span> UNITÉS DE MONDE</div><div className="canvas-grid-icon">＋</div></div>
        <SimulationControls world={selected} onCommand={command} />
        <div className="workspace-foot"><span>GLISSER POUR DÉPLACER <b>·</b> MOLETTE POUR ZOOMER <b>·</b> DOUBLE-CLIC POUR RECENTRER</span><span>RENDER 2D <i>●</i></span></div>
      </div>
      <WorldInfo world={selected} selectedOrganismId={selectedOrganismId} />
    </section>
    <footer className="app-footer"><span>ARTIFICIAL LIFE <span className="footer-sep">/</span> LABORATOIRE DE VIE ARTIFICIELLE</span><span>ENVIRONNEMENT DE SIMULATION <span className="footer-sep">·</span> V.0.2.0</span></footer>
  </main>
}
