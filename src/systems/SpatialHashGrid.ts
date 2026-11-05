import type { Point } from '../core/types'

/** Reusable point index. Query results are indices into the array passed to rebuild. */
export class SpatialHashGrid {
  private readonly buckets = new Map<string, number[]>()

  constructor(private readonly bucketSize: number) {
    if (!Number.isFinite(bucketSize) || bucketSize <= 0) throw new RangeError('Bucket size must be positive.')
  }

  rebuild(points: readonly Point[]): void {
    this.buckets.clear()
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]
      const key = bucketKey(Math.floor(point.x / this.bucketSize), Math.floor(point.y / this.bucketSize))
      const bucket = this.buckets.get(key)
      if (bucket) bucket.push(index)
      else this.buckets.set(key, [index])
    }
  }

  query(x: number, y: number, radius: number, results: number[]): void {
    results.length = 0
    const minX = Math.floor((x - radius) / this.bucketSize)
    const maxX = Math.floor((x + radius) / this.bucketSize)
    const minY = Math.floor((y - radius) / this.bucketSize)
    const maxY = Math.floor((y + radius) / this.bucketSize)
    for (let bucketY = minY; bucketY <= maxY; bucketY += 1) {
      for (let bucketX = minX; bucketX <= maxX; bucketX += 1) {
        const bucket = this.buckets.get(bucketKey(bucketX, bucketY))
        if (bucket) for (const index of bucket) results.push(index)
      }
    }
    results.sort((left, right) => left - right)
  }
}

function bucketKey(x: number, y: number): string { return `${x},${y}` }
