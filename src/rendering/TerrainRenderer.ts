import type { TerrainCell, TerrainSnapshot } from '../environment/terrain/terrainTypes'
import type { TerrainColors } from './WorldRenderer'

type Decoration =
  | { kind: 'tree'; x: number; y: number; radius: number; variant: number; shade: number }
  | { kind: 'grass'; x: number; y: number; size: number; variant: number }
  | { kind: 'dune'; x: number; y: number; width: number; height: number; variant: number }
  | { kind: 'rock'; x: number; y: number; size: number; variant: number }
  | { kind: 'shore'; x: number; y: number; width: number; vertical: boolean }
  | { kind: 'wave'; x: number; y: number; width: number; phase: number }

/** Static terrain color and deterministic decorations; only water highlights animate. */
export class TerrainRenderer {
  private bitmap?: HTMLCanvasElement
  private decorations: Decoration[] = []
  private key = ''

  setTerrain(terrain: TerrainSnapshot | undefined, colors: TerrainColors): void {
    if (!terrain) { this.bitmap = undefined; this.decorations = []; this.key = ''; return }
    const colorKey = Object.values(colors).join('|')
    const key = `${terrain.seed}:${terrain.width}:${terrain.height}:${Object.values(terrain.config).join(':')}:${colorKey}`
    if (key === this.key) return

    // A modest raster scale plus a small blur removes cell seams without smearing biome edges.
    const resolution = Math.min(0.5, 1800 / Math.max(terrain.width, terrain.height))
    const bitmap = document.createElement('canvas')
    bitmap.width = Math.max(1, Math.ceil(terrain.width * resolution))
    bitmap.height = Math.max(1, Math.ceil(terrain.height * resolution))
    const context = bitmap.getContext('2d')
    if (!context) { this.bitmap = undefined; this.decorations = []; this.key = ''; return }
    const sx = bitmap.width / terrain.width
    const sy = bitmap.height / terrain.height
    const size = terrain.config.cellSize
    for (let index = 0; index < terrain.cells.length; index += 1) {
      const column = index % terrain.columns
      const row = Math.floor(index / terrain.columns)
      const x = column * size
      const y = row * size
      const width = Math.min(size, terrain.width - x)
      const height = Math.min(size, terrain.height - y)
      context.fillStyle = colors[terrain.cells[index].biome]
      context.fillRect(x * sx - 0.65, y * sy - 0.65, width * sx + 1.3, height * sy + 1.3)
      drawGroundTexture(context, terrain.cells[index], x * sx, y * sy, width * sx, height * sy, hash(index, terrain.seed))
    }
    const softened = document.createElement('canvas')
    softened.width = bitmap.width
    softened.height = bitmap.height
    const softContext = softened.getContext('2d')
    if (softContext) {
      softContext.filter = 'blur(2.2px)'
      softContext.drawImage(bitmap, -2, -2, bitmap.width + 4, bitmap.height + 4)
      this.bitmap = softened
    } else this.bitmap = bitmap
    this.decorations = createDecorations(terrain)
    this.key = key
  }

  draw(context: CanvasRenderingContext2D, x: number, y: number, scale: number, terrain: TerrainSnapshot | undefined, time: number, viewportWidth: number, viewportHeight: number): void {
    if (!this.bitmap || !terrain || scale <= 0) return
    context.save()
    context.imageSmoothingEnabled = true
    context.drawImage(this.bitmap, x, y, terrain.width * scale, terrain.height * scale)
    const zoom = scale / 0.14
    const margin = 40 / Math.max(scale, 0.01)
    const minX = -x / scale - margin
    const minY = -y / scale - margin
    const maxX = (viewportWidth - x) / scale + margin
    const maxY = (viewportHeight - y) / scale + margin
    for (const detail of this.decorations) {
      if (detail.x < minX || detail.x > maxX || detail.y < minY || detail.y > maxY) continue
      const px = x + detail.x * scale
      const py = y + detail.y * scale
      switch (detail.kind) {
        case 'tree': drawTree(context, px, py, Math.max(detail.radius * scale, 1.2), detail.variant, detail.shade); break
        case 'grass': if (zoom > 0.65) drawGrass(context, px, py, detail.size * scale, detail.variant); break
        case 'dune': if (zoom > 0.38) drawDune(context, px, py, detail.width * scale, detail.height * scale, detail.variant); break
        case 'rock': if (zoom > 0.42) drawRock(context, px, py, Math.max(detail.size * scale, 1.25), detail.variant); break
        case 'shore': drawShore(context, px, py, detail.width * scale, detail.vertical); break
      }
    }
    if (zoom > 0.22) drawWaterHighlights(context, this.decorations, x, y, scale, time, minX, minY, maxX, maxY)
    context.restore()
  }
}

function createDecorations(terrain: TerrainSnapshot): Decoration[] {
  const output: Decoration[] = []
  const cellSize = terrain.config.cellSize
  const at = (column: number, row: number): TerrainCell | undefined => column < 0 || row < 0 || column >= terrain.columns || row >= terrain.rows ? undefined : terrain.cells[row * terrain.columns + column]
  for (let index = 0; index < terrain.cells.length; index += 1) {
    const cell = terrain.cells[index]
    const column = index % terrain.columns
    const row = Math.floor(index / terrain.columns)
    const left = column * cellSize
    const top = row * cellSize
    const width = Math.min(cellSize, terrain.width - left)
    const height = Math.min(cellSize, terrain.height - top)
    const seed = hash(index, terrain.seed)
    const point = (salt: number, axis: number): number => axis === 0
      ? left + width * (0.1 + random(seed, salt) * 0.8)
      : top + height * (0.1 + random(seed, salt) * 0.8)
    if (cell.biome === 'water') {
      for (let n = 0; n < 3; n += 1) {
        const salt = n * 13 + 30
        output.push({ kind: 'wave', x: point(salt, 0), y: point(salt + 1, 1), width: cellSize * (0.13 + random(seed, salt + 2) * 0.13), phase: random(seed, salt + 3) * Math.PI * 2 })
      }
    } else if (cell.biome === 'forest') {
      // Staggered deterministic samples follow forest cells but avoid a visible stamp grid.
      const count = 3 + Math.floor(cell.moisture * 3)
      for (let n = 0; n < count; n += 1) {
        const salt = n * 17 + 3
        output.push({ kind: 'tree', x: point(salt, 0), y: point(salt + 1, 1), radius: cellSize * (0.105 + random(seed, salt + 2) * 0.075), variant: Math.floor(random(seed, salt + 3) * 4), shade: random(seed, salt + 4) })
      }
    } else if (cell.biome === 'plains') {
      for (let n = 0; n < 5; n += 1) {
        const salt = n * 11 + 5
        output.push({ kind: 'grass', x: point(salt, 0), y: point(salt + 1, 1), size: cellSize * (0.035 + random(seed, salt + 2) * 0.025), variant: Math.floor(random(seed, salt + 3) * 4) })
      }
    } else if (cell.biome === 'desert') {
      for (let n = 0; n < 2; n += 1) {
        const salt = n * 13 + 9
        output.push({ kind: 'dune', x: point(salt, 0), y: point(salt + 1, 1), width: width * (0.42 + random(seed, salt + 2) * 0.24), height: height * 0.17, variant: Math.floor(random(seed, salt + 3) * 3) })
      }
      if (random(seed, 41) > 0.55) output.push({ kind: 'rock', x: point(42, 0), y: point(43, 1), size: cellSize * 0.08, variant: Math.floor(random(seed, 44) * 3) })
    } else if (cell.biome === 'mountain') {
      for (let n = 0; n < 2; n += 1) {
        const salt = n * 7 + 21
        output.push({ kind: 'rock', x: point(salt, 0), y: point(salt + 1, 1), size: cellSize * (0.12 + cell.elevation * 0.1), variant: Math.floor(random(seed, salt + 2) * 3) })
      }
    }

    if (cell.biome !== 'water') {
      for (const [dc, dr, vertical] of [[-1, 0, true], [1, 0, true], [0, -1, false], [0, 1, false]] as const) {
        if (at(column + dc, row + dr)?.biome !== 'water') continue
        output.push({ kind: 'shore', x: vertical ? (dc < 0 ? left : left + width) : left + width / 2, y: vertical ? top + height / 2 : (dr < 0 ? top : top + height), width: vertical ? height : width, vertical })
      }
    }
  }
  output.sort((a, b) => a.y - b.y || a.x - b.x)
  return output
}

function drawGroundTexture(context: CanvasRenderingContext2D, cell: TerrainCell, x: number, y: number, width: number, height: number, seed: number): void {
  if (cell.biome === 'mountain') {
    const peakX = x + width * (0.24 + random(seed, 2) * 0.52)
    const peakY = y + height * (0.18 + (1 - cell.elevation) * 0.18)
    context.globalAlpha = 0.12 + cell.elevation * 0.1
    context.fillStyle = '#f1efe2'
    context.beginPath(); context.moveTo(peakX, peakY); context.lineTo(x + width * 0.86, y + height * 0.82); context.lineTo(x + width * 0.18, y + height * 0.82); context.closePath(); context.fill()
    context.globalAlpha = 0.1
    context.fillStyle = '#182329'
    context.beginPath(); context.moveTo(peakX, peakY); context.lineTo(x + width * 0.86, y + height * 0.82); context.lineTo(x + width * 0.55, y + height * 0.75); context.closePath(); context.fill()
    context.globalAlpha = 1
  } else if (cell.biome !== 'water') {
    const radius = Math.max(width, height) * (0.45 + random(seed, 3) * 0.3)
    const gradient = context.createRadialGradient(x + width * 0.38, y + height * 0.36, 0, x + width * 0.5, y + height * 0.5, radius)
    gradient.addColorStop(0, `rgba(245, 229, 174, ${0.035 + cell.elevation * 0.035})`)
    gradient.addColorStop(1, 'rgba(20, 28, 22, 0.13)')
    context.fillStyle = gradient
    context.fillRect(x, y, width + 1, height + 1)
  }
}

function drawTree(context: CanvasRenderingContext2D, x: number, y: number, radius: number, variant: number, shade: number): void {
  const crown = radius * (1.05 + variant * 0.07)
  context.save()
  context.globalAlpha = 0.34
  context.fillStyle = '#111a16'
  context.beginPath(); context.ellipse(x + crown * 0.3, y + crown * 0.48, crown * 1.25, crown * 0.62, -0.25, 0, Math.PI * 2); context.fill()
  context.globalAlpha = 0.8
  context.fillStyle = '#533d2a'
  context.fillRect(x - radius * 0.1, y - radius * 0.08, radius * 0.2, radius * 0.78)
  context.globalAlpha = 0.94
  context.fillStyle = shade > 0.5 ? '#527b4c' : '#365f40'
  context.beginPath(); context.arc(x, y, crown, 0, Math.PI * 2); context.fill()
  context.fillStyle = variant % 2 ? '#73945b' : '#8aa56a'
  context.globalAlpha = 0.25
  context.beginPath(); context.arc(x - crown * 0.25, y - crown * 0.28, crown * 0.55, 0, Math.PI * 2); context.fill()
  context.restore()
}

function drawGrass(context: CanvasRenderingContext2D, x: number, y: number, size: number, variant: number): void {
  context.save(); context.strokeStyle = variant % 2 ? '#a8bd70' : '#7f9f5e'; context.globalAlpha = 0.65; context.lineWidth = Math.max(0.7, size * 0.12)
  for (let blade = 0; blade < 3; blade += 1) { const dx = (blade - 1) * size * 0.48; context.beginPath(); context.moveTo(x + dx, y); context.quadraticCurveTo(x + dx - size * 0.1, y - size * 0.5, x + dx + size * (variant % 2 ? 0.22 : -0.22), y - size); context.stroke() }
  context.restore()
}

function drawDune(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, variant: number): void {
  context.save(); context.globalAlpha = 0.18; context.strokeStyle = variant % 2 ? '#f0d99c' : '#463a28'; context.lineWidth = Math.max(0.8, height * 0.12); context.beginPath(); context.ellipse(x, y, width / 2, height / 2, variant * 0.19, Math.PI * 1.05, Math.PI * 1.95); context.stroke(); context.restore()
}

function drawRock(context: CanvasRenderingContext2D, x: number, y: number, size: number, variant: number): void {
  context.save(); context.fillStyle = '#263235'; context.globalAlpha = 0.28; context.beginPath(); context.ellipse(x + size * 0.3, y + size * 0.45, size * 1.2, size * 0.56, 0, 0, Math.PI * 2); context.fill()
  context.globalAlpha = 0.9; context.fillStyle = variant % 2 ? '#a5aaa0' : '#777f79'; context.beginPath(); context.moveTo(x - size, y + size * 0.2); context.lineTo(x - size * 0.4, y - size * 0.7); context.lineTo(x + size * 0.3, y - size); context.lineTo(x + size, y + size * 0.1); context.lineTo(x + size * 0.4, y + size * 0.5); context.closePath(); context.fill()
  context.globalAlpha = 0.28; context.fillStyle = '#fff'; context.beginPath(); context.moveTo(x - size * 0.4, y - size * 0.7); context.lineTo(x + size * 0.3, y - size); context.lineTo(x + size * 0.12, y + size * 0.05); context.closePath(); context.fill(); context.restore()
}

function drawShore(context: CanvasRenderingContext2D, x: number, y: number, length: number, vertical: boolean): void {
  context.save(); context.globalAlpha = 0.38; context.strokeStyle = '#c8d9a0'; context.lineWidth = 1.5; context.beginPath()
  if (vertical) { context.moveTo(x, y - length * 0.5); context.quadraticCurveTo(x + 2, y, x - 0.5, y + length * 0.5) }
  else { context.moveTo(x - length * 0.5, y); context.quadraticCurveTo(x, y + 2, x + length * 0.5, y - 0.5) }
  context.stroke(); context.restore()
}

function drawWaterHighlights(context: CanvasRenderingContext2D, decorations: readonly Decoration[], x: number, y: number, scale: number, time: number, minX: number, minY: number, maxX: number, maxY: number): void {
  const phase = time * 0.00035
  context.save(); context.strokeStyle = '#b1e8e8'; context.globalAlpha = 0.23; context.lineWidth = Math.max(0.7, scale * 2.4)
  for (const detail of decorations) {
    if ((detail.kind !== 'shore' && detail.kind !== 'wave') || detail.x < minX || detail.x > maxX || detail.y < minY || detail.y > maxY) continue
    const px = x + detail.x * scale; const py = y + detail.y * scale
    context.beginPath()
    if (detail.kind === 'wave') {
      const wavePhase = phase + detail.phase
      const length = detail.width * scale
      context.globalAlpha = 0.13 + (Math.sin(wavePhase) + 1) * 0.08
      context.moveTo(px - length, py + Math.sin(wavePhase) * 1.2)
      context.quadraticCurveTo(px, py + Math.sin(wavePhase + 1) * 1.8, px + length, py + Math.sin(wavePhase + 2) * 1.2)
    } else if (detail.vertical) {
      context.moveTo(px + Math.sin(phase + detail.y) * 1.2, py - detail.width * scale * 0.22)
      context.quadraticCurveTo(px + Math.sin(phase + detail.y + 1) * 2, py, px + Math.sin(phase + detail.y + 2) * 1.2, py + detail.width * scale * 0.22)
    } else {
      context.moveTo(px - detail.width * scale * 0.22, py + Math.sin(phase + detail.x) * 1.2)
      context.quadraticCurveTo(px, py + Math.sin(phase + detail.x + 1) * 2, px + detail.width * scale * 0.22, py + Math.sin(phase + detail.x + 2) * 1.2)
    }
    context.stroke()
  }
  context.restore()
}

function hash(value: number, seed: number): number { let n = Math.imul(value ^ seed, 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0 }
function random(seed: number, salt: number): number { return hash(seed, Math.imul(salt + 1, 0x9e3779b9)) / 0xffff_ffff }

