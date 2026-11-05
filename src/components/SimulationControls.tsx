import type { WorldSnapshot } from '../core/types'

interface Props {
  world: WorldSnapshot
  onCommand: (command: 'start' | 'pause' | 'replay' | 'new-world' | 'set-speed', speed?: number) => void
}

export function SimulationControls({ world, onCommand }: Props) {
  return <div className="transport">
    <button className="play-button" onClick={() => onCommand(world.paused ? 'start' : 'pause')} aria-label={world.paused ? 'Reprendre' : 'Mettre en pause'}>
      {world.paused ? <span className="play-icon">▶</span> : <span className="pause-icon">Ⅱ</span>}
      {world.paused ? 'Reprendre' : 'Pause'}
    </button>
    <div className="speed-control" aria-label="Vitesse de simulation">
      {[1, 2, 5, 10].map(speed => <button key={speed} className={world.speed === speed ? 'speed active' : 'speed'} onClick={() => onCommand('set-speed', speed)} aria-pressed={world.speed === speed}>×{speed}</button>)}
    </div>
    <div className="transport-spacer" />
    <div className="transport-readout"><span className="live-dot" />{world.paused ? 'EN PAUSE' : 'SIMULATION ACTIVE'}</div>
    <button className="reset-button" onClick={() => onCommand('replay')} aria-label="Rejouer le monde avec la même graine">↻ Rejouer</button>
    <button className="reset-button" onClick={() => onCommand('new-world')} aria-label="Générer un nouveau monde avec une nouvelle graine"><span>✦</span> Nouveau monde</button>
  </div>
}
