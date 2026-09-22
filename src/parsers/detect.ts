import type { SectionKind } from './types'

export function classifyJsonText(head: string): SectionKind | null {
  const h = head.slice(0, 16384)
  if (/"locations"\s*:/.test(h) && /"latitudeE7"|"longitudeE7"/.test(h)) return 'location-records'
  if (/"startTime"/.test(h) && (/"visit"/.test(h) || /"activity"/.test(h) || /"timelinePath"/.test(h)))
    return 'semantic-location'
  if (/"header"/.test(h) && /"title"/.test(h) && /"time"/.test(h)) return 'my-activity'
  return null
}

export function classifyJsonValue(json: unknown): SectionKind | null {
  if (Array.isArray(json)) {
    const first = json.find((item) => item !== null && typeof item === 'object') as
      | Record<string, unknown>
      | undefined
    if (!first) return null
    if ('startTime' in first && ('visit' in first || 'activity' in first || 'timelinePath' in first))
      return 'semantic-location'
    if ('header' in first && 'title' in first && 'time' in first) return 'my-activity'
    return null
  }
  if (json !== null && typeof json === 'object' && 'locations' in json) return 'location-records'
  return null
}

export type MyActivitySection = 'search' | 'youtube' | null

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function classifyMyActivityItem(item: Record<string, unknown>): MyActivitySection {
  const tokens = [normalizeToken(item.header)]
  if (Array.isArray(item.products)) {
    for (const p of item.products) tokens.push(normalizeToken(p))
  }
  if (tokens.some((t) => t === 'youtube')) return 'youtube'
  if (tokens.some((t) => t === 'search' || t === 'busqueda')) return 'search'
  return null
}
