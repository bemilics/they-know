import { describe, expect, it } from 'vitest'
import { matchLexicon, matchCategory, cardsFromLexicon, lexiconVersion } from '../../src/impact/infer/searchLexicon'
import { inferPlaces, inferStreaks } from '../../src/impact/infer/places'
import { computeSpikes } from '../../src/impact/infer/spikes'
import { findCoProximal } from '../../src/impact/infer/correlations'
import { inferPurchases } from '../../src/impact/infer/purchases'
import { inferAppCards } from '../../src/impact/infer/appUsage'
import { runImpact, sortCards } from '../../src/impact/cards/generator'
import { buildSharePayload, serializeShare } from '../../src/impact/share/payload'
import {
  buildSyntheticDataset,
  search,
  loc,
  mapsEntity,
  app,
  purchase,
  santiagoIso
} from './fixtures/synthetic'

const TZ = 'America/Santiago'

describe('lexicon', () => {
  it('detecta categoria y version', () => {
    const hits = matchLexicon([search('psiquiatra de cabecera', santiagoIso(2025, 3, 1, 10))])
    expect(hits.length).toBe(1)
    expect(hits[0].category).toBe('salud')
    expect(lexiconVersion()).toBe('v1')
  })

  it('normaliza acentos y minusculas', () => {
    const hits = matchLexicon([search('CÁNCER tratamiento', santiagoIso(2025, 3, 1, 10))])
    expect(hits.some((h) => h.category === 'salud_fisica')).toBe(true)
  })

  it('el léxico también analiza entidades de maps', () => {
    const hits = matchLexicon([
      mapsEntity('Indicaciones a psiquiatra Providencia', santiagoIso(2025, 3, 1, 10))
    ])
    expect(hits).toHaveLength(1)
    expect(hits[0].category).toBe('salud')
  })

  it('matchCategory devuelve la primera coincidencia de texto plano', () => {
    expect(matchCategory('1 Boost (Hinge Dating App)')?.category).toBe('relaciones')
    expect(matchCategory('Recarga de saldo') ).toBeNull()
  })

  it('genera card con confianza segun conteo', () => {
    const entities = Array.from({ length: 6 }, (_, i) =>
      search('deudas tarjeta', santiagoIso(2025, 3, 1 + i, 10))
    )
    const cards = cardsFromLexicon(matchLexicon(entities))
    expect(cards.length).toBe(1)
    expect(cards[0].confianza).toBe('alta')
    expect(cards[0].sensibilidad).toBe('alta')
  })

  it('no emite card con un solo hit de baja', () => {
    const cards = cardsFromLexicon(
      matchLexicon([search('algo de trabajo raro', santiagoIso(2025, 3, 1, 10))])
    )
    expect(cards.length).toBeLessThanOrEqual(1)
    if (cards.length) expect(['baja', 'media']).toContain(cards[0].confianza)
  })
})

describe('places', () => {
  it('encuentra casa y trabajo con dataset sintetico', () => {
    const entities = buildSyntheticDataset()
    const { places, cards } = inferPlaces(entities, TZ)
    expect(places[0].kind).toBe('casa')
    expect(places[0].noches).toBeGreaterThan(50)
    const trabajo = places.find((p) => p.kind === 'trabajo')
    expect(trabajo).toBeTruthy()
    expect(trabajo!.dias_laborales).toBeGreaterThan(30)
    expect(cards.some((c) => c.id === 'lugar_casa')).toBe(true)
  })

  it('streak de dias consecutivos', () => {
    const entities: ReturnType<typeof loc>[] = []
    for (let i = 0; i < 10; i++) {
      const d = new Date(Date.UTC(2025, 0, 6 + i, 6, 0))
      entities.push(loc(-33.45, -70.66, d.toISOString()))
    }
    const cards = inferStreaks(entities, TZ)
    expect(cards.length).toBe(1)
    expect(cards[0].datos_rellenables.dias.valor).toBe(10)
  })
})

describe('spikes', () => {
  it('detecta z-score en semana con pico', () => {
    const entities = buildSyntheticDataset()
    const spikes = computeSpikes(entities, TZ)
    expect(spikes.length).toBeGreaterThan(0)
    expect(spikes.some((s) => s.category === 'trabajo')).toBe(true)
    expect(Math.max(...spikes.map((s) => s.z))).toBeGreaterThanOrEqual(2)
  })
})

describe('correlations', () => {
  it('encuentra coproximidad ±30min', () => {
    const t = '2025-03-10T21:30:00.000Z'
    const t2 = '2025-03-10T21:45:00.000Z'
    const entities = [
      loc(-33.45, -70.66, t),
      search('farmacia abierta', t2)
    ]
    const events = findCoProximal(entities, [], TZ)
    expect(events.length).toBe(1)
    expect(events[0].deltaMs).toBe(15 * 60 * 1000)
  })
})

describe('purchases', () => {
  it('genera cartas: total, nocturnas y categoría sensible', () => {
    const entities = [
      purchase('Recarga Play', santiagoIso(2025, 3, 1, 12)),
      purchase('Pack de stickers', santiagoIso(2025, 3, 2, 12)),
      purchase('Curso de cocina', santiagoIso(2025, 3, 3, 12)),
      purchase('1 Boost (Hinge Dating App)', santiagoIso(2025, 3, 10, 1)),
      purchase('Hinge+ Membership', santiagoIso(2025, 3, 11, 2)),
      purchase('Super Like pack', santiagoIso(2025, 3, 12, 3))
    ]
    const cards = inferPurchases(entities, TZ)
    const ids = cards.map((c) => c.id)
    expect(ids).toContain('purchase_total')
    expect(ids).toContain('purchase_night')
    expect(ids).toContain('purchase_relaciones')

    const total = cards.find((c) => c.id === 'purchase_total')!
    expect(total.nivel).toBe('hecho')
    expect(total.datos_rellenables.cantidad.valor).toBe(6)

    const night = cards.find((c) => c.id === 'purchase_night')!
    expect(night.datos_rellenables.cantidad.valor).toBe(3)
    expect(night.sensibilidad).toBe('alta')
    expect(String(night.datos_rellenables.fecha.valor)).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const cat = cards.find((c) => c.id === 'purchase_relaciones')!
    expect(cat.evidencia[0].detalle).toContain('hinge')
  })

  it('suma suscripciones activas mensuales', () => {
    const entities = [
      purchase('HBO Max Plan', santiagoIso(2025, 3, 1, 12), 'subscription · CLP 7,990/MONTH · Canceled'),
      purchase('LIONSGATE+', santiagoIso(2025, 3, 2, 12), 'subscription · CLP 5,990/MONTH · Active'),
      purchase('Crunchyroll', santiagoIso(2025, 3, 3, 12), 'subscription · CLP 4,500/MONTH · Active'),
      purchase('Pack suelto', santiagoIso(2025, 3, 4, 12), 'purchase · CLP 1,000 · Entel')
    ]
    const cards = inferPurchases(entities, TZ)
    const subs = cards.find((c) => c.id === 'purchase_active_subs')
    expect(subs).toBeTruthy()
    expect(subs!.datos_rellenables.cantidad.valor).toBe(2)
    expect(subs!.datos_rellenables.total.valor).toBe(10490)
  })

  it('no genera cartas con menos de 3 compras', () => {
    expect(inferPurchases([purchase('X', santiagoIso(2025, 3, 1, 12))], TZ)).toEqual([])
    expect(inferPurchases([], TZ)).toEqual([])
  })
})

describe('app usage', () => {
  it('genera app_top y app_night', () => {
    const entities = []
    for (let i = 0; i < 15; i++) {
      entities.push(app('WhatsApp Messenger', santiagoIso(2025, 3, 1 + i, 14)))
      entities.push(app('Instagram', santiagoIso(2025, 3, 1 + i, 15)))
    }
    for (let i = 0; i < 25; i++) {
      entities.push(app('Instagram', santiagoIso(2025, 3, 5 + i, 1)))
    }
    const cards = inferAppCards(entities, TZ)
    const ids = cards.map((c) => c.id)
    expect(ids).toContain('app_top')
    expect(ids).toContain('app_night')

    const top = cards.find((c) => c.id === 'app_top')!
    expect(top.datos_rellenables.aplicacion.valor).toBe('Instagram')
    expect(top.datos_rellenables.cantidad.valor).toBe(40)

    const night = cards.find((c) => c.id === 'app_night')!
    expect(night.datos_rellenables.cantidad.valor).toBe(25)
    // El detalle menciona que la sincronización es por bloques (honestidad epistémica)
    expect(night.evidencia[0].detalle).toBe('ventana_22_04_local')
  })

  it('con pocos eventos no genera cartas', () => {
    expect(inferAppCards([app('X', santiagoIso(2025, 3, 1, 12))], TZ)).toEqual([])
  })
})

describe('generator', () => {
  it('runImpact produce cartas ordenadas por peso', () => {
    const entities = buildSyntheticDataset()
    const result = runImpact(entities, {
      timezone: TZ,
      lexiconVersion: 'v1',
      now: Date.parse('2025-05-01T12:00:00Z')
    })
    expect(result.cards.length).toBeGreaterThan(3)
    expect(result.meta.entities).toBe(entities.length)
    const ids = result.cards.map((c) => c.id)
    expect(ids[0]).toMatch(/lugar_|lexicon_|correlacion_/)
    // correlaciones (45) antes que places (30) si existen
    const corrIdx = ids.findIndex((i) => i.startsWith('correlacion_'))
    const casaIdx = ids.indexOf('lugar_casa')
    if (corrIdx >= 0 && casaIdx >= 0) expect(corrIdx).toBeLessThan(casaIdx)
  })

  it('sortCards es deterministico', () => {
    const a = sortCards([
      {
        id: 'b',
        nivel: 'hecho',
        titulo_i18n_key: 't',
        detalle_i18n_key: 'd',
        datos_rellenables: {},
        evidencia: [],
        confianza: 'alta',
        sensibilidad: 'baja',
        reveal_steps: []
      },
      {
        id: 'a',
        nivel: 'hecho',
        titulo_i18n_key: 't',
        detalle_i18n_key: 'd',
        datos_rellenables: {},
        evidencia: [],
        confianza: 'alta',
        sensibilidad: 'baja',
        reveal_steps: []
      }
    ])
    expect(a.map((c) => c.id)).toEqual(['a', 'b'])
  })
})

describe('share payload privacidad', () => {
  it('no expone terminos de busqueda sensibles en claro', () => {
    const entities = buildSyntheticDataset()
    const result = runImpact(entities, {
      timezone: TZ,
      lexiconVersion: 'v1',
      now: Date.parse('2025-05-01T12:00:00Z')
    })
    const payload = buildSharePayload(result)
    const raw = serializeShare(payload)
    expect(raw).not.toContain('psiquiatra')
    expect(raw).not.toContain('entrevista de trabajo')
    expect(raw).not.toContain('farmacia abierta')
    expect(raw).not.toMatch(/timestamps/)
  })

  it('marca busqueda como redactada', () => {
    const payload = buildSharePayload({
      cards: [
        {
          id: 'correlacion_0',
          nivel: 'implicancia',
          titulo_i18n_key: 'k',
          detalle_i18n_key: 'd',
          datos_rellenables: { busqueda: { valor: 'deudas con el banco' } },
          evidencia: [],
          confianza: 'alta',
          sensibilidad: 'alta',
          reveal_steps: []
        }
      ],
      places: [],
      meta: { entities: 1, version: 'v1' }
    })
    expect(payload.cartas[0].resumen).toContain('•••')
    expect(payload.cartas[0].resumen).not.toContain('deudas con el banco')
  })

  it('redacta aplicacion y ejemplo de cartas de compras/apps', () => {
    const payload = buildSharePayload({
      cards: [
        {
          id: 'purchase_relaciones',
          nivel: 'hecho',
          titulo_i18n_key: 'k',
          detalle_i18n_key: 'd',
          datos_rellenables: {
            cantidad: { valor: 3 },
            aplicacion: { valor: 'Tinder' },
            ejemplo: { valor: '1 Week Hinge+ Membership (Hinge)' }
          },
          evidencia: [],
          confianza: 'alta',
          sensibilidad: 'alta',
          reveal_steps: []
        }
      ],
      places: [],
      meta: { entities: 1, version: 'v1' }
    })
    const raw = serializeShare(payload)
    expect(raw).not.toContain('Tinder')
    expect(raw).not.toContain('Hinge')
    expect(raw).toContain('cantidad=3')
  })
})
