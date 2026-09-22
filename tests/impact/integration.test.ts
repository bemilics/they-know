import { describe, expect, it } from 'vitest'
import { runImpact } from '../../src/impact/cards/generator'
import type { ImpactProgress } from '../../src/impact/types'
import { buildSharePayload, serializeShare } from '../../src/impact/share/payload'
import { buildSyntheticDataset, search, loc, santiagoIso } from './fixtures/synthetic'
import { storeSettingsRoundtrip } from './helpers/settings'

const TZ = 'America/Santiago'

describe('integración: pipeline completo del motor', () => {
  it('emite progreso por etapas en orden', () => {
    const entities = buildSyntheticDataset()
    const stages: ImpactProgress[] = []
    const result = runImpact(
      entities,
      { timezone: TZ, lexiconVersion: 'v1', now: Date.parse('2025-06-01T12:00:00Z') },
      (p) => stages.push(p)
    )
    expect(stages.length).toBeGreaterThanOrEqual(5)
    expect(stages[0].stage).toBe('init')
    expect(stages[stages.length - 1].stage).toBe('done')
    const order = ['init', 'places', 'lexicon', 'spikes', 'correlations', 'cards', 'done']
    let last = -1
    for (const s of stages) {
      const idx = order.indexOf(s.stage)
      expect(idx).toBeGreaterThanOrEqual(last)
      last = idx
    }
    expect(result.cards.length).toBeGreaterThan(5)
  })

  it('es determinista con la misma entrada', () => {
    const entities = buildSyntheticDataset()
    const cfg = {
      timezone: TZ,
      lexiconVersion: 'v1',
      now: Date.parse('2025-06-01T12:00:00Z')
    }
    const a = runImpact(entities, cfg)
    const b = runImpact(entities, cfg)
    expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id))
    expect(a.cards.map((c) => c.confianza)).toEqual(b.cards.map((c) => c.confianza))
  })

  it('cada carta tiene nivel, confianza y evidencia', () => {
    const entities = buildSyntheticDataset()
    const result = runImpact(entities, {
      timezone: TZ,
      lexiconVersion: 'v1',
      now: Date.parse('2025-06-01T12:00:00Z')
    })
    for (const card of result.cards) {
      expect(['hecho', 'inferencia', 'implicancia']).toContain(card.nivel)
      expect(['alta', 'media', 'baja']).toContain(card.confianza)
      expect(card.evidencia.length).toBeGreaterThan(0)
      expect(card.reveal_steps.length).toBeGreaterThan(0)
      expect(card.titulo_i18n_key.startsWith('confessional:')).toBe(true)
      expect(card.detalle_i18n_key.startsWith('confessional:')).toBe(true)
    }
  })

  it('share payload limpio incluso con correlaciones y léxico', () => {
    const entities = [
      ...buildSyntheticDataset(),
      search('quiebra personal abogado', santiagoIso(2025, 4, 1, 23, 10)),
      loc(-33.45, -70.66, santiagoIso(2025, 4, 1, 23, 0))
    ]
    const result = runImpact(entities, {
      timezone: TZ,
      lexiconVersion: 'v1',
      now: Date.parse('2025-06-01T12:00:00Z')
    })
    const raw = serializeShare(buildSharePayload(result))
    expect(raw).not.toContain('quiebra personal')
    expect(raw).not.toContain('psiquiatra')
    expect(raw).not.toMatch(/timestamps/)
    expect(raw).not.toContain('"evidencia"')
  })

  it('dataset vacío no truena y devuelve 0 cartas', () => {
    const result = runImpact([], {
      timezone: TZ,
      lexiconVersion: 'v1',
      now: Date.now()
    })
    expect(result.cards).toEqual([])
    expect(result.places).toEqual([])
  })

  it('persistencia de settings timezone (formato FileStore)', async () => {
    const saved = await storeSettingsRoundtrip({ timezone: 'Europe/Berlin' })
    expect(saved.timezone).toBe('Europe/Berlin')
  })
})
