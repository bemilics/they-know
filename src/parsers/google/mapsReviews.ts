import type { NormalizedEntity } from '../../shared/types'
import { parseTimestamp } from '../normalize'

type RawItem = Record<string, unknown>

function asRecord(value: unknown): RawItem | null {
  return value !== null && typeof value === 'object' ? (value as RawItem) : null
}

/**
 * Reseñas de Google Maps: GeoJSON FeatureCollection (`Opiniones.json`/`Reviews.json`).
 * `geometry.coordinates` viene como [lng, lat] (orden GeoJSON, no E7).
 */
export function parseMapsReviewFeature(item: unknown): NormalizedEntity | null {
  const feature = asRecord(item)
  if (!feature) return null

  const props = asRecord(feature.properties)
  if (!props) return null
  const timestamp = parseTimestamp(props.date)
  if (!timestamp) return null

  const location = asRecord(props.location)
  const titulo =
    (location && typeof location.name === 'string' && location.name) ||
    (location && typeof location.address === 'string' && location.address) ||
    (typeof props.name === 'string' && props.name) ||
    ''
  if (!titulo) return null

  const geometry = asRecord(feature.geometry)
  const coords = Array.isArray(geometry?.coordinates) ? geometry.coordinates : null
  const lng = typeof coords?.[0] === 'number' ? coords[0] : null
  const lat = typeof coords?.[1] === 'number' ? coords[1] : null
  const hasCoords =
    lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

  const rating =
    typeof props.five_star_rating_published === 'number'
      ? props.five_star_rating_published
      : typeof props.rating === 'number'
        ? props.rating
        : null
  const text = str(props.review_text_published)

  const parts: string[] = []
  if (rating !== null) parts.push(`${rating}★`)
  if (text) parts.push(text)
  const detalle = parts.length > 0 ? parts.join(' — ') : undefined

  return {
    tipo: 'review',
    timestamp,
    titulo,
    product: 'maps',
    ...(detalle ? { detalle } : {}),
    ...(hasCoords ? { lat: lat as number, lng: lng as number } : {})
  }
}

function str(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : ''
}
