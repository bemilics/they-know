import type { EntityType, NormalizedEntity } from '../../../shared/types'

export interface MonthBucket {
  key: string
  count: number
  samples: string[]
}

export interface Aggregates {
  counts: Record<EntityType, number>
  locationPoints: number
  locationDays: number
  oldestTimestamp: string | null
  oldestYear: number | null
  nightSearches: number
  byMonth: MonthBucket[]
}

export function computeAggregates(entities: NormalizedEntity[]): Aggregates {
  const counts: Record<EntityType, number> = { location: 0, search: 0, youtube: 0 }
  const locationDates = new Set<string>()
  let locationPoints = 0
  let nightSearches = 0
  let oldestMs: number | null = null
  const months = new Map<string, { count: number; samples: string[] }>()

  for (const e of entities) {
    counts[e.tipo]++
    const ms = Date.parse(e.timestamp)
    if (!Number.isNaN(ms)) {
      if (oldestMs === null || ms < oldestMs) oldestMs = ms
      const d = new Date(ms)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.get(key) ?? { count: 0, samples: [] }
      bucket.count++
      if (bucket.samples.length < 3 && e.tipo !== 'location' && e.titulo) {
        bucket.samples.push(e.titulo)
      }
      months.set(key, bucket)

      if (e.tipo === 'search') {
        const hour = d.getHours()
        if (hour >= 0 && hour < 5) nightSearches++
      }
      if (e.tipo === 'location') {
        locationPoints++
        locationDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
      }
    }
  }

  const byMonth = [...months.entries()]
    .map(([key, v]) => ({ key, count: v.count, samples: v.samples }))
    .sort((a, b) => b.key.localeCompare(a.key))

  const oldest = oldestMs !== null ? new Date(oldestMs) : null

  return {
    counts,
    locationPoints,
    locationDays: locationDates.size,
    oldestTimestamp: oldest ? oldest.toISOString() : null,
    oldestYear: oldest ? oldest.getFullYear() : null,
    nightSearches,
    byMonth
  }
}

export function locationsWithCoords(entities: NormalizedEntity[]): NormalizedEntity[] {
  return entities.filter(
    (e) => e.tipo === 'location' && typeof e.lat === 'number' && typeof e.lng === 'number'
  )
}

export function samplePoints<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items
  const step = items.length / max
  const out: T[] = []
  for (let i = 0; i < max; i++) out.push(items[Math.floor(i * step)])
  return out
}
