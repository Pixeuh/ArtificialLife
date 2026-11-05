import type { TerrainSnapshot } from '../environment/terrain/terrainTypes'
import type { TerrainColors } from './WorldRenderer'

/** Builds a static raster layer once per terrain or theme; simulation ticks never redraw the map. */
export class TerrainRenderer {
  private bitmap?: HTMLCanvasElement
  private key = ''

  setTerrain(terrain: TerrainSnapshot | undefined, colors: TerrainColors): void {
    if (!terrain) { this.bitmap = undefined; this.key = ''; return }
    const colorKey = Object.values(colors).join('|')
    const key = `${terrain.seed}:${terrain.width}:${terrain.height}:${Object.values(terrain.config).join(':')}:${colorKey}`
    if (key === this.key) return

    const bitmap = document.createElement('canvas')
    const resolution = 0.42
    bitmap.width = Math.max(1, Math.ceil(terrain.width * resolution))
    bitmap.height = Math.max(1, Math.ceil(terrain.height * resolution))
    const context = bitmap.getContext('2d')
    if (!context) { this.bitmap = undefined; this.key = ''; return }
    const scaleX = bitmap.width / terrain.width
    const scaleY = bitmap.height / terrain.height
    const cellWidth = terrain.config.cellSize
    const cellHeight = terrain.config.cellSize

    for (let index = 0; index < terrain.cells.length; index += 1) {
      const cell = terrain.cells[index]
      const column = index % terrain.columns
      const row = Math.floor(index / terrain.columns)
      const x = column * cellWidth
      const y = row * cellHeight
      const w = Math.min(cellWidth, terrain.width - x)
      const h = Math.min(cellHeight, terrain.height - y)
      const px = x * scaleX
      const py = y * scaleY
      const pw = w * scaleX + 1
      const ph = h * scaleY + 1
      context.fillStyle = colors[cell.biome]
      context.fillRect(px, py, pw, ph)
      drawRelief(context, cell.biome, px, py, pw, ph, cell.elevation, index, terrain.seed)
    }
    const softened = document.createElement('canvas')
    softened.width = bitmap.width
    softened.height = bitmap.height
    const softContext = softened.getContext('2d')
    if (softContext) {
      softContext.filter = 'blur(7px)'
      softContext.drawImage(bitmap, -7, -7, bitmap.width + 14, bitmap.height + 14)
      this.bitmap = softened
    } else this.bitmap = bitmap
    this.key = key
  }

  draw(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    if (this.bitmap) {
      context.save()
      context.imageSmoothingEnabled = true
      context.drawImage(this.bitmap, x, y, width, height)
      context.restore()
    }
  }
}

function drawRelief(context: CanvasRenderingContext2D, biome: string, x: number, y: number, width: number, height: number, elevation: number, index: number, seed: number): void {
  const key = hash(index, seed)
  if (biome === 'water') {
    context.save()
    context.globalAlpha = 0.18
    context.strokeStyle = '#a2dbe3'
    context.lineWidth = 0.7
    for (let line = 0; line < 2; line += 1) {
      const lineY = y + height * (0.35 + line * 0.35) + ((key >>> (line * 5)) % 5)
      context.beginPath()
      context.moveTo(x + width * 0.18, lineY)
      context.quadraticCurveTo(x + width * 0.5, lineY - 2, x + width * 0.82, lineY)
      context.stroke()
    }
    context.restore()
    return
  }
  if (biome === 'forest') {
    context.save()
    for (let tree = 0; tree < 4; tree += 1) {
      const seedOffset = Math.imul(tree + 1, 0x9e3779b9)
      const tx = x + width * (0.18 + unit(hash(index ^ seedOffset, seed)) * 0.64)
      const ty = y + height * (0.18 + unit(hash(index ^ seedOffset, seed + 17)) * 0.64)
      const radius = Math.max(1, Math.min(width, height) * (0.075 + unit(hash(index, seed + tree * 13)) * 0.035))
      context.globalAlpha = 0.32
      context.fillStyle = '#101f17'
      context.beginPath(); context.ellipse(tx + radius * 0.35, ty + radius * 0.5, radius * 1.25, radius * 0.72, 0, 0, Math.PI * 2); context.fill()
      context.globalAlpha = 0.28
      context.fillStyle = (tree + (key & 3)) % 2 ? '#b5d68b' : '#112e21'
      context.beginPath(); context.arc(tx, ty, radius, 0, Math.PI * 2); context.fill()
    }
    context.restore()
    return
  }
  if (biome === 'mountain') {
    const peakX = x + width * (0.25 + unit(key) * 0.5)
    const peakY = y + height * 0.23
    context.save()
    context.globalAlpha = 0.2 + elevation * 0.15
    context.fillStyle = '#e6e4d6'
    context.beginPath(); context.moveTo(peakX, peakY); context.lineTo(x + width * 0.82, y + height * 0.82); context.lineTo(x + width * 0.2, y + height * 0.82); context.closePath(); context.fill()
    context.globalAlpha = 0.2
    context.fillStyle = '#182329'
    context.beginPath(); context.moveTo(peakX, peakY); context.lineTo(x + width * 0.82, y + height * 0.82); context.lineTo(x + width * 0.56, y + height * 0.76); context.closePath(); context.fill()
    context.restore()
    return
  }

  // Soft height tint keeps open plains and dunes readable without adding moving objects.
  const gradient = context.createRadialGradient(x + width * 0.42, y + height * 0.38, 0, x + width * 0.5, y + height * 0.5, Math.max(width, height) * 0.75)
  gradient.addColorStop(0, `rgba(245, 229, 174, ${0.035 + elevation * 0.035})`)
  gradient.addColorStop(1, 'rgba(20, 28, 22, 0.12)')
  context.fillStyle = gradient
  context.fillRect(x, y, width + 1, height + 1)
}

function hash(value: number, seed: number): number {
  let result = Math.imul(value ^ seed, 0x45d9f3b)
  result = Math.imul(result ^ (result >>> 16), 0x45d9f3b)
  return (result ^ (result >>> 16)) >>> 0
}

function unit(value: number): number { return value / 0xffff_ffff }

