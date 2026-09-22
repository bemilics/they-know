export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const toRad = (d: number): number => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Tamaño de celda de grilla en grados para un radio en metros (aprox, en el ecuador). */
export function gridCellDeg(radiusM: number): number {
  return radiusM / 111320
}

export interface GridPoint {
  lat: number
  lng: number
  idx: number
}

export function gridKey(lat: number, lng: number, cellDeg: number): string {
  return `${Math.floor(lat / cellDeg)}:${Math.floor(lng / cellDeg)}`
}

/** Union-find simple. */
export class UnionFind {
  parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }
  union(a: number, b: number): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[rb] = ra
  }
}

export interface ClusterResult {
  id: number
  members: number[]
  lat: number
  lng: number
}

/**
 * Clustering por grilla de radio y unión de vecinos adyacentes (8-dir).
 * Cada celda se une con vecinos cuyo centroide está a <= radiusM.
 */
export function clusterByGrid(
  points: GridPoint[],
  radiusM: number
): ClusterResult[] {
  const cellDeg = gridCellDeg(radiusM)
  const cells = new Map<string, number[]>()
  for (const p of points) {
    const k = gridKey(p.lat, p.lng, cellDeg)
    const arr = cells.get(k)
    if (arr) arr.push(p.idx)
    else cells.set(k, [p.idx])
  }
  const uf = new UnionFind(points.length)
  const centroidOf = (cell: number[]): { lat: number; lng: number } => {
    let la = 0
    let lo = 0
    for (const i of cell) {
      la += points[i].lat
      lo += points[i].lng
    }
    return { lat: la / cell.length, lng: lo / cell.length }
  }
  const cellCentroids = new Map<string, { lat: number; lng: number }>()
  for (const [k, cell] of cells) cellCentroids.set(k, centroidOf(cell))

  for (const [, cell] of cells) {
    for (let i = 1; i < cell.length; i++) uf.union(cell[0], cell[i])
  }
  for (const [k, cell] of cells) {
    const [gi, gj] = k.split(':').map(Number)
    const c1 = cellCentroids.get(k)!
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (di === 0 && dj === 0) continue
        const nk = `${gi + di}:${gj + dj}`
        const neighbor = cells.get(nk)
        if (!neighbor) continue
        const c2 = cellCentroids.get(nk)!
        if (haversineMeters(c1.lat, c1.lng, c2.lat, c2.lng) <= radiusM * 2) {
          uf.union(cell[0], neighbor[0])
        }
      }
    }
  }

  const groups = new Map<number, number[]>()
  for (let i = 0; i < points.length; i++) {
    const r = uf.find(i)
    const g = groups.get(r)
    if (g) g.push(i)
    else groups.set(r, [i])
  }

  const out: ClusterResult[] = []
  let id = 0
  for (const members of groups.values()) {
    let la = 0
    let lo = 0
    for (const i of members) {
      la += points[i].lat
      lo += points[i].lng
    }
    out.push({ id: id++, members, lat: la / members.length, lng: lo / members.length })
  }
  return out
}
