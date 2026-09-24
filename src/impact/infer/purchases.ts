import type { NormalizedEntity } from '../../shared/types'
import { localDayKey, toLocal } from '../time'
import type { Card, Confidence } from '../types'
import { matchCategory } from './searchLexicon'

function isNightPurchase(e: NormalizedEntity, timezone: string): boolean {
  const hour = toLocal(e.timestamp, timezone).hour
  return hour >= 22 || hour < 4
}

function parsePrice(value: string): number | null {
  const m = value.match(/(\d[\d,.]*)/)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function confidenceFor(count: number): Confidence {
  if (count >= 5) return 'alta'
  return 'media'
}

/**
 * Cartas de impacto a partir del historial de compras/suscripciones de Play Store.
 * Las compras son hechos (no inferencias): el nivel es `hecho`; la categoría
 * sensibles viene del léxico sobre el título de la compra.
 */
export function inferPurchases(entities: NormalizedEntity[], timezone: string): Card[] {
  const purchases = entities.filter((e) => e.tipo === 'purchase')
  if (purchases.length < 3) return []

  const cards: Card[] = []
  const newestFirst = [...purchases].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))

  cards.push({
    id: 'purchase_total',
    nivel: 'hecho',
    titulo_i18n_key: 'confessional:purchases.total.titulo',
    detalle_i18n_key: 'confessional:purchases.total.detalle',
    datos_rellenables: {
      cantidad: { valor: purchases.length, unidad: 'compras' }
    },
    evidencia: [
      {
        tipo: 'historial_play_store',
        puntos: purchases.length,
        detalle: 'purchase_history+subscriptions+library',
        timestamps: newestFirst.slice(0, 10).map((e) => e.timestamp)
      }
    ],
    confianza: purchases.length >= 20 ? 'alta' : 'media',
    sensibilidad: 'media',
    reveal_steps: ['cantidad', 'fechas']
  })

  // Compras nocturnas (22:00-04:00 local)
  const night = purchases.filter((e) => isNightPurchase(e, timezone))
  if (night.length >= 3) {
    const latest = [...night].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0]
    cards.push({
      id: 'purchase_night',
      nivel: 'hecho',
      titulo_i18n_key: 'confessional:purchases.night.titulo',
      detalle_i18n_key: 'confessional:purchases.night.detalle',
      datos_rellenables: {
        cantidad: { valor: night.length, unidad: 'compras' },
        ejemplo: { valor: latest.titulo },
        fecha: { valor: localDayKey(latest.timestamp, timezone) }
      },
      evidencia: [
        {
          tipo: 'compras_nocturnas',
          puntos: night.length,
          detalle: 'ventana_22_04_local',
          timestamps: night.slice(0, 10).map((e) => e.timestamp)
        }
      ],
      confianza: confidenceFor(night.length),
      sensibilidad: 'alta',
      reveal_steps: ['cantidad', 'ejemplo', 'horario']
    })
  }

  // Compras cuyo título cae en una categoría sensible del léxico
  interface CatHit {
    category: string
    items: NormalizedEntity[]
    terms: Set<string>
  }
  const byCat = new Map<string, CatHit>()
  for (const p of purchases) {
    const m = matchCategory(`${p.titulo} ${p.detalle ?? ''}`)
    if (!m) continue
    const hit = byCat.get(m.category)
    if (hit) {
      hit.items.push(p)
      hit.terms.add(m.term)
    } else {
      byCat.set(m.category, { category: m.category, items: [p], terms: new Set([m.term]) })
    }
  }
  const orderedCats = [...byCat.values()].sort(
    (a, b) => b.items.length - a.items.length || a.category.localeCompare(b.category)
  )
  for (const hit of orderedCats) {
    const newest = [...hit.items].sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
    )[0]
    cards.push({
      id: `purchase_${hit.category}`,
      nivel: 'hecho',
      titulo_i18n_key: 'confessional:purchases.cat.titulo',
      detalle_i18n_key: 'confessional:purchases.cat.detalle',
      datos_rellenables: {
        categoria: { valor: hit.category },
        cantidad: { valor: hit.items.length, unidad: 'compras' },
        ejemplo: { valor: newest.titulo }
      },
      evidencia: [
        {
          tipo: 'compras_sensibles',
          puntos: hit.items.length,
          detalle: `matches:${[...hit.terms].join('|')}`,
          timestamps: newest ? [newest.timestamp] : []
        }
      ],
      confianza: confidenceFor(hit.items.length),
      sensibilidad: 'alta',
      reveal_steps: ['categoria', 'cantidad', 'ejemplo']
    })
  }

  // Suscripciones activas con precio mensual recurrente
  const activeSubs = purchases.filter(
    (p) =>
      (p.detalle ?? '').startsWith('subscription') &&
      /·\s*(Active|Activa|Activo)\s*$/.test(p.detalle ?? '')
  )
  if (activeSubs.length >= 1) {
    let monthly = 0
    let priced = 0
    const titles: string[] = []
    for (const s of activeSubs) {
      const parts = (s.detalle ?? '').split(' · ')
      const pricePart = parts.find((p) => p.includes('/MONTH'))
      const value = pricePart ? parsePrice(pricePart) : null
      if (value !== null) {
        monthly += value
        priced++
      }
      titles.push(s.titulo.slice(0, 40))
    }
    if (priced > 0) {
      cards.push({
        id: 'purchase_active_subs',
        nivel: 'hecho',
        titulo_i18n_key: 'confessional:purchases.activeSubs.titulo',
        detalle_i18n_key: 'confessional:purchases.activeSubs.detalle',
        datos_rellenables: {
          cantidad: { valor: activeSubs.length, unidad: 'suscripciones' },
          total: { valor: Math.round(monthly) }
        },
        evidencia: [
          {
            tipo: 'suscripciones_activas',
            puntos: activeSubs.length,
            detalle: titles.join(' | '),
            timestamps: activeSubs.slice(0, 10).map((e) => e.timestamp)
          }
        ],
        confianza: 'alta',
        sensibilidad: 'media',
        reveal_steps: ['cantidad', 'total']
      })
    }
  }

  return cards
}
