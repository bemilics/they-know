export type {
  Card,
  Confidence,
  EpistemicLevel,
  Evidence,
  ImpactConfig,
  ImpactProgress,
  ImpactProgressStage,
  ImpactResult,
  Place,
  Sensibilidad
} from './types'
export { runImpact, sortCards, type ProgressFn } from './cards/generator'
export { detectTimezone, localDayKey, localWeekKey, toLocal } from './time'
export { haversineMeters, clusterByGrid } from './geo'
export { inferPlaces, inferStreaks, inferNightCoverage } from './infer/places'
export { matchLexicon, matchCategory, cardsFromLexicon, lexiconVersion } from './infer/searchLexicon'
export { computeSpikes, cardsFromSpikes } from './infer/spikes'
export { findCoProximal, cardsFromCorrelations } from './infer/correlations'
export { inferPurchases } from './infer/purchases'
export { inferAppCards } from './infer/appUsage'
export { buildSharePayload, serializeShare, type SharePayload, type ShareCard } from './share/payload'
