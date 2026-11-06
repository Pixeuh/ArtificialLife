import { useEffect, useRef, useState } from 'react'
import type { WorldDefinition, WorldSnapshot } from './core/types'
import type { WorkerCommand, WorkerEvent } from './workers/protocol'
import { WORLD_DEFAULTS, type WorldConfig } from './core/types'
import { applyTheme, getInitialTheme, type Theme } from './theme/theme'
import { SimulationControls } from './components/SimulationControls'
import { WorldCanvas } from './components/WorldCanvas'
import { WorldInfo } from './components/WorldInfo'
import { WorldTabs } from './components/WorldTabs'
import { generateNewSeed } from './components/seedActions'
import { TERRAIN_DEFAULTS } from './environment/terrain/terrainTypes'
import type { TerrainCell, TerrainSnapshot } from './environment/terrain/terrainTypes'
import { TerrainSettings, type TerrainDraft } from './components/TerrainSettings'
import { TerrainLegend } from './components/TerrainLegend'
import { createColonyGrowthExperiment } from './experiments/colonyGrowth'
import { createDifferentiationExperiment } from './experiments/differentiation'
import { APP_VERSION } from './version'

const differentiationConditions = createDifferentiationExperiment()
const definitions: WorldDefinition[] = [
  { id: 'world-a', name: 'Monde A', width: 4_000, height: 2_500, seed: 381_047_21, originType: 'primordial', interventionMode: 'observation', config: { initialOrganismCount: 50, initialFoodCount: 250, maxFoodCount: 350 } },
  { id: 'world-b', name: 'Monde B', width: 4_000, height: 2_500, seed: 927_163_04, originType: 'primordial', interventionMode: 'divine', config: { initialOrganismCount: 40, initialFoodCount: 180, maxFoodCount: 300 } },
  createColonyGrowthExperiment(),
  ...differentiationConditions,
]

type WorldSettings = { organisms: number; foods: number; foodEnergy: number; foodRegenerationRate: number; baseMetabolismRate: number; movementEnergyCost: number; divisionEnergyThreshold: number; mutationRate: number; mutationStep: number; adhesionEnergyCost: number; maximumPopulation: number }

function makeTerrainDraft(definition: WorldDefinition): TerrainDraft {
  return { ...TERRAIN_DEFAULTS, ...definition.terrainConfig, seed: definition.seed, customSeed: false }
}

export default function App() {
  const workers = useRef<Worker[]>([])
  const [worldDefinitions, setWorldDefinitions] = useState(definitions)
  const [readyWorlds, setReadyWorlds] = useState<Record<string, boolean>>({})
  const [terrains, setTerrains] = useState<Record<string, TerrainSnapshot>>({})
  const [hoveredTerrain, setHoveredTerrain] = useState<TerrainCell | null>(null)
  const [worlds, setWorlds] = useState<WorldSnapshot[]>(() => definitions.map(definition => ({
    ...definition,
    originType: definition.originType ?? 'primordial',
    interventionMode: definition.interventionMode ?? 'observation',
    config: { ...WORLD_DEFAULTS, ...definition.config },
    terrainConfig: { ...TERRAIN_DEFAULTS, ...definition.terrainConfig },
    simulatedTime: 0,
    tick: 0,
    paused: true,
    speed: 1,
    organisms: [],
    resources: [],
    links: [],
    history: [],
    statistics: { population: 0, resources: 0, totalFoodConsumed: 0, averageEnergy: 0, averageAge: 0, initialPopulation: 0, totalDeaths: 0, starvationDeaths: 0, divisions: 0, colonies: 0, isolatedCells: 0, averageColonySize: 0, largestColonySize: 0, averageAdhesion: 0, averageElongation: 0, averageBranchingTendency: 0, averageBondPersistence: 0, averageColonyElongation: 0, averageLinksPerCell: 0, averageLinksPerColony: 0, maxGeneration: 0, birthRate: 0, mortalityRate: 0, averageForagingExpression: 0, averageMotilityExpression: 0, averageResilienceExpression: 0, averageEnergyHighForaging: 0, averageEnergyLowForaging: 0, differentiatedColonyRatio: 0, totalEnergyTransferred: 0, energyTransferLoss: 0 },
  })))
  const [selectedId, setSelectedId] = useState(definitions[0].id)
  const [selectedOrganismId, setSelectedOrganismId] = useState<string | null>(null)
  const [followTargetId, setFollowTargetId] = useState<string | null>(null)
  const [draftCounts, setDraftCounts] = useState<Record<string, WorldSettings>>(() => Object.fromEntries(definitions.map(definition => [definition.id, {
    organisms: definition.config?.initialOrganismCount ?? WORLD_DEFAULTS.initialOrganismCount,
    foods: definition.config?.initialFoodCount ?? WORLD_DEFAULTS.initialFoodCount,
    foodEnergy: definition.config?.foodEnergy ?? WORLD_DEFAULTS.foodEnergy,
    foodRegenerationRate: definition.config?.foodRegenerationRate ?? WORLD_DEFAULTS.foodRegenerationRate,
    baseMetabolismRate: definition.config?.baseMetabolismRate ?? WORLD_DEFAULTS.baseMetabolismRate,
    movementEnergyCost: definition.config?.movementEnergyCost ?? WORLD_DEFAULTS.movementEnergyCost,
    divisionEnergyThreshold: definition.config?.divisionEnergyThreshold ?? WORLD_DEFAULTS.divisionEnergyThreshold,
    mutationRate: definition.config?.mutationRate ?? WORLD_DEFAULTS.mutationRate,
    mutationStep: definition.config?.mutationStep ?? WORLD_DEFAULTS.mutationStep,
    adhesionEnergyCost: definition.config?.adhesionEnergyCost ?? WORLD_DEFAULTS.adhesionEnergyCost,
    maximumPopulation: definition.config?.maximumPopulation ?? WORLD_DEFAULTS.maximumPopulation,
  }])))
  const [terrainDrafts, setTerrainDrafts] = useState<Record<string, TerrainDraft>>(() => Object.fromEntries(definitions.map(definition => [definition.id, makeTerrainDraft(definition)])))
  const [showSettings, setShowSettings] = useState(false)
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [deathNotice, setDeathNotice] = useState(false)
  const selected = worlds.find(world => world.id === selectedId) ?? worlds[0]

  useEffect(() => {
    if (!selectedOrganismId || selected.statistics.initialPopulation === 0 || selected.organisms.some(item => item.id === selectedOrganismId)) return
    setSelectedOrganismId(null)
    setFollowTargetId(null)
    setDeathNotice(true)
    const timer = window.setTimeout(() => setDeathNotice(false), 3_000)
    return () => window.clearTimeout(timer)
  }, [selectedOrganismId, selected.organisms, selected])

  useEffect(() => {
    const instances = definitions.map(() => new Worker(new URL('./workers/simulation.worker.ts', import.meta.url), { type: 'module' }))
    workers.current = instances
    instances.forEach((worker, index) => {
      worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
        const message = event.data
        if (message.type === 'state') {
          setReadyWorlds(current => ({ ...current, [message.world.id]: true }))
          setWorlds(current => current.map(world => world.id === message.world.id ? message.world : world))
        }
        if (message.type === 'terrain') setTerrains(current => ({ ...current, [message.worldId]: message.terrain }))
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
    setFollowTargetId(null)
    setHoveredTerrain(null)
  }

  const selectOrganism = (id: string | null): void => {
    setSelectedOrganismId(id)
    if (id !== followTargetId) setFollowTargetId(null)
  }

  const command = (type: 'start' | 'pause' | 'replay' | 'new-world' | 'set-speed', speed?: number): void => {
    const index = definitions.findIndex(definition => definition.id === selectedId)
    let message: WorkerCommand
    if (type === 'set-speed') message = { type, speed: speed ?? 1 }
    else if (type === 'replay') {
      message = { type: 'reset', world: worldDefinitions[index] }
      setSelectedOrganismId(null)
      setFollowTargetId(null)
      setHoveredTerrain(null)
      setDeathNotice(false)
    } else if (type === 'new-world') {
      const definition = worldDefinitions[index]
      const counts = draftCounts[selectedId]
      const terrainDraft = terrainDrafts[selectedId]
      const config: Partial<WorldConfig> = {
        ...definition.config,
        initialOrganismCount: counts.organisms,
        initialFoodCount: counts.foods,
        foodEnergy: counts.foodEnergy,
        foodRegenerationRate: counts.foodRegenerationRate,
        maxFoodCount: Math.max(definition.config?.maxFoodCount ?? WORLD_DEFAULTS.maxFoodCount, counts.foods),
        baseMetabolismRate: counts.baseMetabolismRate,
        movementEnergyCost: counts.movementEnergyCost,
        divisionEnergyThreshold: counts.divisionEnergyThreshold,
        mutationRate: counts.mutationRate,
        mutationStep: counts.mutationStep,
        adhesionEnergyCost: counts.adhesionEnergyCost,
        maximumPopulation: counts.maximumPopulation,
      }
      const seed = terrainDraft.customSeed ? terrainDraft.seed >>> 0 : generateNewSeed(definition.seed)
      const terrainConfig = { cellSize: definition.terrainConfig?.cellSize ?? TERRAIN_DEFAULTS.cellSize, relief: terrainDraft.relief, moisture: terrainDraft.moisture, waterCoverage: terrainDraft.waterCoverage }
      const updatedDefinition = { ...definition, seed, config, terrainConfig }
      setWorldDefinitions(current => current.map((item, itemIndex) => itemIndex === index ? updatedDefinition : item))
      setTerrainDrafts(current => ({ ...current, [selectedId]: { ...terrainDraft, seed, customSeed: false } }))
      message = { type: 'reset', world: updatedDefinition }
      setSelectedOrganismId(null)
      setFollowTargetId(null)
      setHoveredTerrain(null)
      setDeathNotice(false)
    } else message = { type }
    workers.current[index]?.postMessage(message)
  }

  const updateWorldSetting = (field: keyof WorldSettings, value: number): void => {
    const bounded = !Number.isFinite(value) ? 0
      : field === 'organisms' || field === 'foods' ? Math.max(0, Math.min(2_000, Math.floor(value)))
        : field === 'maximumPopulation' ? Math.max(0, Math.min(10_000, Math.floor(value)))
        : field === 'mutationRate' || field === 'mutationStep' ? Math.max(0, Math.min(1, value))
          : Math.max(0, value)
    setDraftCounts(current => ({ ...current, [selectedId]: { ...current[selectedId], [field]: bounded } }))
  }

  const updateTerrainSetting = (field: keyof TerrainDraft, value: number | boolean): void => {
    setTerrainDrafts(current => {
      const draft = current[selectedId]
      if (typeof value === 'boolean') return { ...current, [selectedId]: { ...draft, [field]: value } }
      const bounded = field === 'seed' ? Math.max(0, Math.min(0xffff_ffff, Math.floor(Number.isFinite(value) ? value : 0)))
        : field === 'waterCoverage' ? Math.max(0, Math.min(0.6, value))
          : Math.max(0, Math.min(1, value))
      return { ...current, [selectedId]: { ...draft, [field]: bounded } }
    })
  }

  const randomizeTerrainSeed = (): void => {
    const seed = generateNewSeed(terrainDrafts[selectedId].seed)
    updateTerrainSetting('seed', seed)
    updateTerrainSetting('customSeed', true)
  }

  const toggleTheme = (): void => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme, true)
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="Artificial Life accueil"><span className="brand-mark"><i /><i /><i /><i /></span><span>ARTIFICIAL<span className="brand-light"> LIFE</span></span><span className="version">{APP_VERSION}</span></a>
      <div className="header-divider" />
      <WorldTabs worlds={worlds} selectedId={selectedId} onSelect={selectWorld} />
      <div className="header-right"><span className="system-label"><span className="live-dot" />SYSTÈME OPÉRATIONNEL</span><button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'} aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'} aria-pressed={theme === 'light'}>
        {theme === 'dark' ? <svg key={theme} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg> : <svg key={theme} viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.6 8.6 0 1 0 20.2 15.3Z" /></svg>}
      </button><button className={`settings-button ${showSettings ? 'selected' : ''}`} onClick={() => setShowSettings(value => !value)} aria-expanded={showSettings} aria-label="Afficher les paramètres"><span>☷</span><span>Paramètres</span></button></div>
    </header>
    {showSettings && <div className="settings-popover"><div className="section-kicker">ÉCOSYSTÈME · {selected.name.toUpperCase()}</div><label>Population initiale<input type="number" min="0" max="2000" value={draftCounts[selectedId].organisms} onChange={event => updateWorldSetting('organisms', Number(event.target.value))} /></label><label>Population maximale<input type="number" min="0" max="10000" step="1" value={draftCounts[selectedId].maximumPopulation} onChange={event => updateWorldSetting('maximumPopulation', Number(event.target.value))} /></label><label>Ressources initiales<input type="number" min="0" max="2000" value={draftCounts[selectedId].foods} onChange={event => updateWorldSetting('foods', Number(event.target.value))} /></label><label>Énergie par ressource<input type="number" min="0" step="1" value={draftCounts[selectedId].foodEnergy} onChange={event => updateWorldSetting('foodEnergy', Number(event.target.value))} /></label><label>Régénération ressources/s<input type="number" min="0" step="0.1" value={draftCounts[selectedId].foodRegenerationRate} onChange={event => updateWorldSetting('foodRegenerationRate', Number(event.target.value))} /></label><label>Métabolisme (énergie/s)<input type="number" min="0" step="0.01" value={draftCounts[selectedId].baseMetabolismRate} onChange={event => updateWorldSetting('baseMetabolismRate', Number(event.target.value))} /></label><label>Coût mouvement (énergie/u)<input type="number" min="0" step="0.0001" value={draftCounts[selectedId].movementEnergyCost} onChange={event => updateWorldSetting('movementEnergyCost', Number(event.target.value))} /></label><label>Seuil de division<input type="number" min="0" step="1" value={draftCounts[selectedId].divisionEnergyThreshold} onChange={event => updateWorldSetting('divisionEnergyThreshold', Number(event.target.value))} /></label><label>Mutation par division (%)<input type="number" min="0" max="100" step="1" value={draftCounts[selectedId].mutationRate * 100} onChange={event => updateWorldSetting('mutationRate', Number(event.target.value) / 100)} /></label><label>Amplitude mutation<input type="number" min="0" max="1" step="0.01" value={draftCounts[selectedId].mutationStep} onChange={event => updateWorldSetting('mutationStep', Number(event.target.value))} /></label><label>Coût adhésion (énergie/s/lien)<input type="number" min="0" step="0.001" value={draftCounts[selectedId].adhesionEnergyCost} onChange={event => updateWorldSetting('adhesionEnergyCost', Number(event.target.value))} /></label><p>Réglages appliqués à la réinitialisation.</p><p>Pas fixe : <strong>33,3 ms · worker indépendant</strong></p><TerrainSettings value={terrainDrafts[selectedId]} onChange={updateTerrainSetting} onRandomSeed={randomizeTerrainSeed} /></div>}
    <section className="workspace">
      <div className="canvas-column">
        <div className="canvas-toolbar"><div><span className="breadcrumb">ESPACE DE SIMULATION</span><span className="breadcrumb-separator">/</span><span className="current-world">{selected.name}</span></div><div className="canvas-actions">{selectedOrganismId && <button className={`center-button ${followTargetId === selectedOrganismId ? 'selected' : ''}`} onClick={() => setFollowTargetId(current => current === selectedOrganismId ? null : selectedOrganismId)}><span>◎</span>{followTargetId === selectedOrganismId ? 'Arrêter le suivi' : 'Suivre'}</button>}<button className="center-button" onClick={() => { setFollowTargetId(null); setCameraResetKey(value => value + 1) }}><span>⌖</span> Recentrer</button></div></div>
        <div className="canvas-frame"><WorldCanvas key={`${selected.id}-${cameraResetKey}`} world={selected} terrain={terrains[selected.id]} theme={theme} selectedOrganismId={selectedOrganismId} followTargetId={followTargetId} onStopFollowing={() => setFollowTargetId(null)} onSelectOrganism={selectOrganism} onResetCamera={() => { setFollowTargetId(null); setCameraResetKey(value => value + 1) }} onHoverTerrain={setHoveredTerrain} /><TerrainLegend /><div className="canvas-corner top-left" /><div className="canvas-corner top-right" /><div className="canvas-corner bottom-left" /><div className="canvas-corner bottom-right" /><div className="canvas-coordinates">PLAN XY <span>·</span> UNITÉS DE MONDE</div><div className="canvas-grid-icon">＋</div></div>
        <SimulationControls world={selected} onCommand={command} />
        <div className="workspace-foot"><span>GLISSER POUR DÉPLACER <b>·</b> MOLETTE POUR ZOOMER <b>·</b> DOUBLE-CLIC POUR RECENTRER</span><span>RENDER 2D <i>●</i></span></div>
      </div>
      <WorldInfo world={selected} selectedOrganismId={selectedOrganismId} onSelectOrganism={selectOrganism} deathNotice={deathNotice} loading={!readyWorlds[selected.id]} hoveredTerrain={hoveredTerrain} />
    </section>
    <footer className="app-footer"><span>ARTIFICIAL LIFE <span className="footer-sep">/</span> LABORATOIRE DE VIE ARTIFICIELLE</span><span>ENVIRONNEMENT DE SIMULATION <span className="footer-sep">·</span> V.{APP_VERSION}</span></footer>
  </main>
}
