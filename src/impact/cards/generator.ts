import type { NormalizedEntity } from '../../shared/types'
import type { Card, ImpactConfig, ImpactProgress, ImpactResult, Place } from '../types'
import { inferPlaces, inferStreaks, inferNightCoverage } from '../infer/places'
import { matchLexicon, cardsFromLexicon, lexiconVersion } from '../infer/searchLexicon'
import { computeSpikes, cardsFromSpikes } from '../infer/spikes'
import { findCoProximal, cardsFromCorrelations } from '../infer/correlations'

export type ProgressFn = (p: ImpactProgress) => void

const CARD_WEIGHT: Record<string, number> = {
  lugar_casa: 30,
  lugar_trabajo: 30,
  lugar_secundario_1: 30,
  lugar_secundario_2: 30,
  lugar_secundario_3: 30,
  streak_location: 15,
  night_coverage: 15,
  lexicon_salud: 40,
  lexicon_dinero: 40,
  lexicon_legal: 40,
  lexicon_relaciones: 40,
  lexicon_salud_fisica: 40,
  lexicon_adicciones: 40,
  lexicon_trabajo: 40,
  spike_trabajo: 25,
  spike_salud: 25,
  spike_viajes: 25,
  spike_compras: 25
}

function weight(card: Card): number {
  if (card.id.startsWith('correlacion_')) return 45
  return CARD_WEIGHT[card.id] ?? 20
}

const LEVEL_RANK: Record<string, number> = { hecho: 0, inferencia: 1, implicancia: 2 }

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const dw = weight(b) - weight(a)
    if (dw !== 0) return dw
    const dl = LEVEL_RANK[a.nivel] - LEVEL_RANK[b.nivel]
    if (dl !== 0) return dl
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

export function runImpact(
  entities: NormalizedEntity[],
  config: ImpactConfig,
  onProgress?: ProgressFn
): ImpactResult {
  const report = (stage: ImpactProgress['stage'], done = 0, total = 0): void => {
    onProgress?.({ stage, done, total })
  }

  report('init', 0, 4)
  report('places', 0, 4)
  const { places, cards: placeCards } = inferPlaces(entities, config.timezone)
  const placeCardsAll = [
    ...placeCards,
    ...inferStreaks(entities, config.timezone),
    ...inferNightCoverage(entities, config.timezone)
  ]

  report('lexicon', 1, 4)
  const hits = matchLexicon(entities)
  const lexCards = cardsFromLexicon(hits)

  report('spikes', 2, 4)
  const spikes = computeSpikes(entities, config.timezone)
  const spikeCards = cardsFromSpikes(spikes)

  report('correlations', 3, 4)
  const events = findCoProximal(entities, places, config.timezone)
  const corrCards = cardsFromCorrelations(events)

  report('cards', 4, 4)
  const all = sortCards([...placeCardsAll, ...lexCards, ...spikeCards, ...corrCards])

  // filtrado de privacidad: nada de títulos de búsqueda en datos_rellenables de share-safe fields
  const result: ImpactResult = {
    cards: all,
    places: [] as Place[],
    meta: {
      entities: entities.length,
      version: `${lexiconVersion()}/${config.lexiconVersion || lexiconVersion()}`
    }
  }
  report('done', 4, 4)
  return result
}
