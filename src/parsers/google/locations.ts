import type { NormalizedEntity } from '../../shared/types'
import { parseE7, parseLatLngString, parseTimestamp } from '../normalize'

type RawItem = Record<string, unknown>

function asRecord(value: unknown): RawItem | null {
  return value !== null && typeof value === 'object' ? (value as RawItem) : null
}

export function parseSemanticLocationItem(item: unknown): NormalizedEntity | null {
  const rec = asRecord(item)
  if (!rec) return null
  const timestamp = parseTimestamp(rec.startTime)
  if (!timestamp) return null

  const visit = asRecord(rec.visit)
  const topCandidate = visit ? asRecord(visit.topCandidate) : null
  if (topCandidate) {
    const placeLocation = asRecord(topCandidate.placeLocation)
    const coords = placeLocation ? parseLatLngString(placeLocation.latLng) : null
    if (coords) {
      return {
        tipo: 'location',
        timestamp,
        titulo: typeof topCandidate.semanticType === 'string' ? topCandidate.semanticType : 'visit',
        lat: coords.lat,
        lng: coords.lng
      }
    }
  }

  const activity = asRecord(rec.activity)
  if (activity) {
    const start = asRecord(activity.start)
    const coords = start ? parseLatLngString(start.latLng) : null
    const activityTop = asRecord(activity.topCandidate)
    if (coords) {
      return {
        tipo: 'location',
        timestamp,
        titulo: typeof activityTop?.type === 'string' ? activityTop.type : 'activity',
        lat: coords.lat,
        lng: coords.lng
      }
    }
  }

  return null
}

export function parseLocationRecordItem(item: unknown): NormalizedEntity | null {
  const rec = asRecord(item)
  if (!rec) return null
  const timestamp = parseTimestamp(rec.timestampMs ?? rec.timestamp)
  const lat = parseE7(rec.latitudeE7)
  const lng = parseE7(rec.longitudeE7)
  if (!timestamp || lat === null || lng === null) return null
  return { tipo: 'location', timestamp, titulo: 'records', lat, lng }
}
