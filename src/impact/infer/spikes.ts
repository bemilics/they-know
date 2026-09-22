import type { NormalizedEntity } from '../../shared/types'
import { localWeekKey, toLocal, isNightHour } from '../time'
import type { Card, Confidence } from '../types'

export interface Spike {
  category: string
  weekKey: string
  count: number
  z: number
}

const MIN_WEEKS = 4
const Z_THRESHOLD = 2

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

interface SpikeCategory {
  name: string
  terms: string[]
}

const SPIKE_CATEGORIES: SpikeCategory[] = [
  {
    name: 'trabajo',
    terms: ['trabajo', 'empleo', 'entrevista', 'curriculum', 'vacante', 'job']
  },
  {
    name: 'salud',
    terms: ['doctor', 'medico', 'médico', 'cita medica', 'receta', 'examen', 'blood test']
  },
  {
    name: 'viajes',
    terms: ['vuelo', 'airline', 'hotel', 'airbnb', 'viaje', 'booking', 'checked in']
  },
  {
    name: 'compras',
    terms: ['precio', 'oferta', 'cupon', 'cupón', 'sale', 'discount', 'cuanto cuesta']
  }
]

export function computeSpikes(
  entities: NormalizedEntity[],
  timezone: string
): Spike[] {
  const textEntities = entities.filter((e) => e.tipo === 'search' || e.tipo === 'youtube')
  if (textEntities.length < 20) return []

  const spikes: Spike[] = []
  for (const cat of SPIKE_CATEGORIES) {
    const byWeek = new Map<string, number>()
    for (const e of textEntities) {
      const hay = normalize(`${e.titulo} ${e.detalle ?? ''}`)
      if (!cat.terms.some((t) => normalize(t) && hay.includes(normalize(t)))) continue
      const wk = localWeekKey(e.timestamp, timezone)
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1)
    }
    if (byWeek.size < MIN_WEEKS) continue
    const counts = [...byWeek.values()]
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length
    const sd = Math.sqrt(variance)
    if (sd === 0) continue
    for (const [wk, count] of byWeek) {
      const z = (count - mean) / sd
      if (z >= Z_THRESHOLD && count >= 3) {
        spikes.push({ category: cat.name, weekKey: wk, count, z })
      }
    }
  }
  spikes.sort((a, b) => b.z - a.z)
  return spikes
}

function conf(z: number): Confidence {
  if (z >= 3) return 'alta'
  if (z >= 2.5) return 'media'
  return 'baja'
}

export function cardsFromSpikes(spikes: Spike[]): Card[] {
  const byCat = new Map<string, Spike[]>()
  for (const s of spikes) {
    const arr = byCat.get(s.category)
    if (arr) arr.push(s)
    else byCat.set(s.category, [s])
  }
  const cards: Card[] = []
  for (const [cat, list] of byCat) {
    const top = list.sort((a, b) => b.z - a.z)[0]
    cards.push({
      id: `spike_${cat}`,
      nivel: 'inferencia',
      titulo_i18n_key: `confessional:spikes.${cat}.titulo`,
      detalle_i18n_key: `confessional:spikes.${cat}.detalle`,
      datos_rellenables: {
        semana: { valor: top.weekKey },
        cantidad: { valor: top.count, unidad: 'hits' },
        z: { valor: Number(top.z.toFixed(1)) }
      },
      evidencia: [
        {
          tipo: 'zscore_semanal',
          puntos: top.count,
          detalle: `z=${top.z.toFixed(2)};mean_baseline_weeks=${list.length}`
        }
      ],
      confianza: conf(top.z),
      sensibilidad: 'media',
      reveal_steps: ['categoria', 'semana', 'zscore']
    })
  }
  return cards
}

/** Momento representativo: hit nocturno (22-04) más reciente si la categoría tiene ≥2 hits. */
export function representativeMoment(
  entities: NormalizedEntity[],
  categoryTerms: string[],
  timezone: string
): { timestamp: string; titulo: string } | null {
  const terms = categoryTerms.map((t) => normalize(t))
  const hits = entities.filter((e) => {
    if (e.tipo !== 'search' && e.tipo !== 'youtube') return false
    const hay = normalize(`${e.titulo} ${e.detalle ?? ''}`)
    return terms.some((t) => t && hay.includes(t))
  })
  if (hits.length < 2) return null
  const night = hits
    .filter((e) => isNightHour(toLocal(e.timestamp, timezone).hour))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
  const pick = night[0] ?? hits.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0]
  return { timestamp: pick.timestamp, titulo: pick.titulo }
}
