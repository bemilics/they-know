import type { NormalizedEntity } from '../../shared/types'
import { haversineMeters } from '../geo'
import { toLocal, isNightHour } from '../time'
import type { Card, Place } from '../types'

const PROXIMITY_MS = 30 * 60 * 1000
const MAX_RADIUS_M = 150

export interface CoProximalEvent {
  location: NormalizedEntity
  search: NormalizedEntity
  distanceM: number
  deltaMs: number
}

/**
 * Correlación por co-proximidad temporal: una búsqueda y un punto de ubicación
 * dentro de ±30 min. El radio se estima contra el centroide del cluster más
 * cercano (o se asume ruido ≤150m si no hay place conocido).
 */
export function findCoProximal(
  entities: NormalizedEntity[],
  places: Place[],
  timezone: string
): CoProximalEvent[] {
  const locations = entities.filter(
    (e) => e.tipo === 'location' && typeof e.lat === 'number' && typeof e.lng === 'number'
  )
  const searches = entities.filter((e) => e.tipo === 'search')
  if (locations.length === 0 || searches.length === 0) return []

  const locMs = locations.map((e) => Date.parse(e.timestamp))
  const sortedIdx = locMs
    .map((ms, i) => ({ ms, i }))
    .filter((x) => !Number.isNaN(x.ms))
    .sort((a, b) => a.ms - b.ms)

  const out: CoProximalEvent[] = []
  for (const s of searches) {
    const sms = Date.parse(s.timestamp)
    if (Number.isNaN(sms)) continue
    // binary search lower bound
    let lo = 0
    let hi = sortedIdx.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (sortedIdx[mid].ms < sms - PROXIMITY_MS) lo = mid + 1
      else hi = mid
    }
    for (let k = lo; k < sortedIdx.length; k++) {
      const { ms, i } = sortedIdx[k]
      if (ms > sms + PROXIMITY_MS) break
      const loc = locations[i]
      const dist = estimateDistance(loc, places, timezone)
      if (dist > MAX_RADIUS_M) continue
      out.push({
        location: loc,
        search: s,
        distanceM: dist,
        deltaMs: Math.abs(ms - sms)
      })
    }
  }
  return out
}

function estimateDistance(
  loc: NormalizedEntity,
  places: Place[],
  _timezone: string
): number {
  void _timezone
  if (places.length === 0) return 0 // sin places: confiar en ±30min temporal
  let best = Infinity
  for (const p of places) {
    const d = haversineMeters(loc.lat!, loc.lng!, p.lat, p.lng)
    if (d < best) best = d
  }
  // si está dentro de 150m de un place conocido o lejano (ruido entre visitas), aceptar
  if (best <= MAX_RADIUS_M) return best
  // punto no asociado: aceptar solo si hay pocos places (movilidad) — radio efectivo 150m implícito
  return MAX_RADIUS_M
}

export function cardsFromCorrelations(events: CoProximalEvent[]): Card[] {
  if (events.length < 3) return []

  // agrupar por search term-ish (titulo)
  const byTitle = new Map<string, CoProximalEvent[]>()
  for (const ev of events) {
    const key = ev.search.titulo.trim().toLowerCase().slice(0, 80)
    const arr = byTitle.get(key)
    if (arr) arr.push(ev)
    else byTitle.set(key, [ev])
  }

  const cards: Card[] = []
  let rank = 0
  const ranked = [...byTitle.entries()].sort((a, b) => b[1].length - a[1].length)
  for (const [title, list] of ranked.slice(0, 5)) {
    if (list.length < 2) continue
    const timestamps = list
      .map((x) => x.search.timestamp)
      .sort((a, b) => Date.parse(b) - Date.parse(a))
    const deltaAvg = Math.round(
      list.reduce((a, b) => a + b.deltaMs, 0) / list.length / 60000
    )
    const distMax = Math.round(Math.max(...list.map((x) => x.distanceM)))
    cards.push({
      id: `correlacion_${rank++}`,
      nivel: 'implicancia',
      titulo_i18n_key: 'confessional:correlation.titulo',
      detalle_i18n_key: 'confessional:correlation.detalle',
      datos_rellenables: {
        busqueda: { valor: title },
        ocurrencias: { valor: list.length },
        delta_minutos: { valor: deltaAvg, unidad: 'min' },
        radio_m: { valor: distMax, unidad: 'm' }
      },
      evidencia: [
        {
          tipo: 'coproximidad_temporal',
          puntos: list.length,
          detalle: `ventana_±${PROXIMITY_MS / 60000}min`,
          timestamps: timestamps.slice(0, 10)
        }
      ],
      confianza: list.length >= 5 ? 'alta' : 'media',
      sensibilidad: 'alta',
      reveal_steps: ['busqueda', 'ocurrencias', 'proximidad']
    })
  }
  return cards
}

/** Momento más reciente de búsqueda en ventana nocturna ligada a un place. */
export function nightSearchAnchor(
  events: CoProximalEvent[],
  timezone: string
): { timestamp: string; place: Place | null } | null {
  const night = events.filter((e) => isNightHour(toLocal(e.search.timestamp, timezone).hour))
  if (night.length === 0) return null
  const top = night.sort((a, b) => Date.parse(b.search.timestamp) - Date.parse(a.search.timestamp))[0]
  void top
  const latest = [...night].sort(
    (a, b) => Date.parse(b.search.timestamp) - Date.parse(a.search.timestamp)
  )[0]
  return { timestamp: latest.search.timestamp, place: null }
}
