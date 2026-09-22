import type { NormalizedEntity } from '../../shared/types'
import { clusterByGrid, haversineMeters, type GridPoint } from '../geo'
import { isNightHour, isWorkHour, localDayKey, toLocal } from '../time'
import type { Card, Place } from '../types'

const RADIUS_M = 150
const MIN_NIGHTS_SECUNDARIO = 20
const WORK_SESSION_HOURS = 6

export interface PlacesInference {
  places: Place[]
  cards: Card[]
}

interface ParsedLocation {
  idx: number
  entity: NormalizedEntity
  ms: number
}

function parseLocations(entities: NormalizedEntity[], timezone: string): ParsedLocation[] {
  const out: ParsedLocation[] = []
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i]
    if (e.tipo !== 'location') continue
    if (typeof e.lat !== 'number' || typeof e.lng !== 'number') continue
    const ms = Date.parse(e.timestamp)
    if (Number.isNaN(ms)) continue
    out.push({ idx: i, entity: e, ms })
  }
  void timezone
  return out
}

/** Estima si el punto está en ventana nocturna local. */
function isNightPoint(p: ParsedLocation, timezone: string): boolean {
  return isNightHour(toLocal(p.ms, timezone).hour)
}

export function inferPlaces(
  entities: NormalizedEntity[],
  timezone: string
): PlacesInference {
  const locs = parseLocations(entities, timezone)
  if (locs.length === 0) return { places: [], cards: [] }

  const gridPoints: GridPoint[] = locs.map((p, i) => ({
    lat: p.entity.lat!,
    lng: p.entity.lng!,
    idx: i
  }))
  const clusters = clusterByGrid(gridPoints, RADIUS_M)

  // stats por cluster
  interface ClusterStats {
    id: number
    lat: number
    lng: number
    nightDays: Set<string>
    workDays: Set<string>
    total: number
  }
  const stats: ClusterStats[] = clusters.map((c) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    nightDays: new Set(),
    workDays: new Set(),
    total: 0
  }))

  for (const c of clusters) {
    const s = stats[c.id]
    for (const localIdx of c.members) {
      const p = locs[localIdx]
      s.total++
      if (isNightPoint(p, timezone)) {
        s.nightDays.add(localDayKey(p.ms, timezone))
      }
      const lp = toLocal(p.ms, timezone)
      if (lp.weekday >= 1 && lp.weekday <= 5 && isWorkHour(lp.hour)) {
        s.workDays.add(localDayKey(p.ms, timezone))
      }
    }
  }

  // sesión de trabajo ≥6h: primer y último punto del día dentro de 9-18 en ese cluster
  for (const c of clusters) {
    const s = stats[c.id]
    const byDay = new Map<string, number[]>()
    for (const localIdx of c.members) {
      const p = locs[localIdx]
      const lp = toLocal(p.ms, timezone)
      if (lp.weekday < 1 || lp.weekday > 5) continue
      if (!isWorkHour(lp.hour)) continue
      const key = localDayKey(p.ms, timezone)
      const arr = byDay.get(key)
      if (arr) arr.push(p.ms)
      else byDay.set(key, [p.ms])
    }
    for (const [, times] of byDay) {
      times.sort((a, b) => a - b)
      const spanH = (times[times.length - 1] - times[0]) / 3600000
      if (spanH >= WORK_SESSION_HOURS) s.workDays.add(`${times[0]}`)
    }
  }

  const withNights = stats.filter((s) => s.nightDays.size > 0)
  if (withNights.length === 0) {
    return { places: [], cards: [] }
  }

  // CASA = más noches
  const sortedByNights = [...withNights].sort(
    (a, b) => b.nightDays.size - a.nightDays.size || b.total - a.total
  )
  const casa = sortedByNights[0]

  // TRABAJO = otro cluster con más días laborales (sesiones largas)
  const workCandidates = stats
    .filter((s) => s.id !== casa.id && s.workDays.size > 0)
    .sort((a, b) => b.workDays.size - a.workDays.size)
  const trabajo = workCandidates[0]

  // requiere distancia mínima entre casa y trabajo
  let trabajoOk: typeof trabajo | undefined = trabajo
  if (trabajo && haversineMeters(casa.lat, casa.lng, trabajo.lat, trabajo.lng) < 300) {
    trabajoOk = undefined
  }

  const secundarios = sortedByNights
    .slice(1)
    .filter(
      (s) =>
        s.id !== (trabajoOk?.id ?? -1) &&
        s.nightDays.size >= MIN_NIGHTS_SECUNDARIO
    )

  const places: Place[] = []
  places.push({
    id: 'casa',
    kind: 'casa',
    lat: casa.lat,
    lng: casa.lng,
    noches: casa.nightDays.size,
    dias_laborales: 0,
    puntos: casa.total
  })
  if (trabajoOk) {
    places.push({
      id: 'trabajo',
      kind: 'trabajo',
      lat: trabajoOk.lat,
      lng: trabajoOk.lng,
      noches: 0,
      dias_laborales: trabajoOk.workDays.size,
      puntos: trabajoOk.total
    })
  }
  secundarios.forEach((s, i) => {
    places.push({
      id: `secundario_${i + 1}`,
      kind: 'secundario',
      lat: s.lat,
      lng: s.lng,
      noches: s.nightDays.size,
      dias_laborales: 0,
      puntos: s.total
    })
  })

  const cards: Card[] = []
  cards.push({
    id: 'lugar_casa',
    nivel: 'hecho',
    titulo_i18n_key: 'confessional:places.casa.titulo',
    detalle_i18n_key: 'confessional:places.casa.detalle',
    datos_rellenables: {
      noches: { valor: casa.nightDays.size, unidad: 'dias' },
      lat: { valor: Number(casa.lat.toFixed(4)) },
      lng: { valor: Number(casa.lng.toFixed(4)) }
    },
    evidencia: [
      {
        tipo: 'noches_cluster',
        puntos: casa.nightDays.size,
        detalle: 'cluster_nocturno_dominante',
        timestamps: [...casa.nightDays].slice(0, 10)
      }
    ],
    confianza: casa.nightDays.size >= 30 ? 'alta' : 'media',
    sensibilidad: 'media',
    reveal_steps: ['cluster', 'noches']
  })

  if (trabajoOk) {
    cards.push({
      id: 'lugar_trabajo',
      nivel: 'inferencia',
      titulo_i18n_key: 'confessional:places.trabajo.titulo',
      detalle_i18n_key: 'confessional:places.trabajo.detalle',
      datos_rellenables: {
        dias_laborales: { valor: trabajoOk.workDays.size, unidad: 'dias' },
        lat: { valor: Number(trabajoOk.lat.toFixed(4)) },
        lng: { valor: Number(trabajoOk.lng.toFixed(4)) }
      },
      evidencia: [
        {
          tipo: 'sesiones_laborales',
          puntos: trabajoOk.workDays.size,
          detalle: `sesion_min_${WORK_SESSION_HOURS}h_laborable`
        }
      ],
      confianza: trabajoOk.workDays.size >= 20 ? 'alta' : 'media',
      sensibilidad: 'media',
      reveal_steps: ['cluster', 'sesiones']
    })
  }

  secundarios.forEach((s, i) => {
    cards.push({
      id: `lugar_secundario_${i + 1}`,
      nivel: 'inferencia',
      titulo_i18n_key: 'confessional:places.secundario.titulo',
      detalle_i18n_key: 'confessional:places.secundario.detalle',
      datos_rellenables: {
        noches: { valor: s.nightDays.size, unidad: 'dias' }
      },
      evidencia: [
        {
          tipo: 'noches_cluster',
          puntos: s.nightDays.size,
          detalle: 'residencia_secundaria'
        }
      ],
      confianza: s.nightDays.size >= 40 ? 'alta' : 'media',
      sensibilidad: 'media',
      reveal_steps: ['cluster', 'noches']
    })
  })

  return { places, cards }
}

/** Streaks: días consecutivos con ≥1 punto location. */
export function inferStreaks(
  entities: NormalizedEntity[],
  timezone: string
): Card[] {
  const days = new Set<number>()
  for (const e of entities) {
    if (e.tipo !== 'location') continue
    const ms = Date.parse(e.timestamp)
    if (Number.isNaN(ms)) continue
    const off = localDayKey(e.timestamp, timezone)
    void off
    days.add(Math.floor((ms + 0) / 86400000))
  }
  // recalcular ordinales locales
  days.clear()
  for (const e of entities) {
    if (e.tipo !== 'location') continue
    const ms = Date.parse(e.timestamp)
    if (Number.isNaN(ms)) continue
    days.add(dayOrdinalLocal(ms, timezone))
  }
  if (days.size < 2) return []
  const sorted = [...days].sort((a, b) => a - b)
  let best = 1
  let cur = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      cur++
      if (cur > best) best = cur
    } else {
      cur = 1
    }
  }
  if (best < 7) return []
  return [
    {
      id: 'streak_location',
      nivel: 'hecho',
      titulo_i18n_key: 'confessional:streak.titulo',
      detalle_i18n_key: 'confessional:streak.detalle',
      datos_rellenables: {
        dias: { valor: best, unidad: 'dias_consecutivos' }
      },
      evidencia: [
        {
          tipo: 'dias_consecutivos_location',
          puntos: best,
          detalle: 'racha_de_presencia_geografica'
        }
      ],
      confianza: 'alta',
      sensibilidad: 'media',
      reveal_steps: ['dias', 'racha']
    }
  ]
}

function dayOrdinalLocal(ms: number, timezone: string): number {
  const p = toLocal(ms, timezone)
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86400000)
}

/** Cobertura nocturna: % de días (en rango) con al menos un punto 02:00-04:00 local. */
export function inferNightCoverage(
  entities: NormalizedEntity[],
  timezone: string
): Card[] {
  const allDays = new Set<number>()
  const nightDays = new Set<number>()
  for (const e of entities) {
    if (e.tipo !== 'location') continue
    const ms = Date.parse(e.timestamp)
    if (Number.isNaN(ms)) continue
    const ord = dayOrdinalLocal(ms, timezone)
    allDays.add(ord)
    const hour = toLocal(ms, timezone).hour
    if (hour >= 2 && hour < 4) nightDays.add(ord)
  }
  if (allDays.size < 14) return []
  const pct = Math.round((nightDays.size / allDays.size) * 100)
  if (pct < 5) return []
  return [
    {
      id: 'night_coverage',
      nivel: 'hecho',
      titulo_i18n_key: 'confessional:coverage.titulo',
      detalle_i18n_key: 'confessional:coverage.detalle',
      datos_rellenables: {
        porcentaje: { valor: pct, unidad: '%' },
        noches_rastreadas: { valor: nightDays.size }
      },
      evidencia: [
        {
          tipo: 'ventana_02_04_local',
          puntos: nightDays.size,
          detalle: `sobre_${allDays.size}_dias`
        }
      ],
      confianza: 'alta',
      sensibilidad: 'alta',
      reveal_steps: ['ventana', 'porcentaje']
    }
  ]
}
