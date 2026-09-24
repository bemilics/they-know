import type { SectionKind } from './types'

/** Claves envolvente de los JSON de Google Play Store. */
export const PLAY_WRAPPER_KEYS = [
  'install',
  'libraryDoc',
  'purchaseHistory',
  'subscription',
  'orderHistory',
  'device',
  'userSetting'
] as const

const PLAY_WRAPPER_RE = /"(install|libraryDoc|purchaseHistory|subscription|orderHistory)"\s*:/

export function classifyJsonText(head: string): SectionKind | null {
  const h = head.slice(0, 16384)
  if (/"locations"\s*:/.test(h) && /"latitudeE7"|"longitudeE7"/.test(h)) return 'location-records'
  if (/"startTime"/.test(h) && (/"visit"/.test(h) || /"activity"/.test(h) || /"timelinePath"/.test(h)))
    return 'semantic-location'
  if (/"type"\s*:\s*"FeatureCollection"/.test(h) && /"features"\s*:/.test(h)) return 'maps-reviews'
  if (PLAY_WRAPPER_RE.test(h)) return 'play-store'
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
    if (PLAY_WRAPPER_KEYS.some((k) => k in first)) return 'play-store'
    if ('header' in first && 'title' in first && 'time' in first) return 'my-activity'
    return null
  }
  if (json !== null && typeof json === 'object') {
    if ('locations' in json) return 'location-records'
    const obj = json as Record<string, unknown>
    if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) return 'maps-reviews'
  }
  return null
}

/** JSON sin contenido: `[]`, `{}`, string vacío, o un objeto cuyos valores son todos arrays vacíos. */
export function isEmptyJson(json: unknown): boolean {
  if (Array.isArray(json)) return json.length === 0
  if (json !== null && typeof json === 'object') {
    const values = Object.values(json as Record<string, unknown>)
    if (values.length === 0) return true
    return values.every((v) => Array.isArray(v) && v.length === 0)
  }
  return false
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
