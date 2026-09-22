import type { Aggregates } from './aggregates'

export interface UncomfortableFact {
  key: 'nightSearches' | 'oldestRecord' | 'locationSpan' | 'videos'
  score: number
  params: Record<string, number>
}

export function pickUncomfortableFact(agg: Aggregates): UncomfortableFact | null {
  const candidates: UncomfortableFact[] = []

  if (agg.nightSearches > 0) {
    candidates.push({
      key: 'nightSearches',
      score: agg.nightSearches * 3,
      params: { count: agg.nightSearches }
    })
  }
  if (agg.oldestYear !== null) {
    const years = Math.max(1, new Date().getFullYear() - agg.oldestYear)
    candidates.push({ key: 'oldestRecord', score: years * 10, params: { years } })
  }
  if (agg.locationDays > 0) {
    candidates.push({
      key: 'locationSpan',
      score: agg.locationDays * 2,
      params: { count: agg.locationDays }
    })
  }
  if (agg.counts.youtube > 0) {
    candidates.push({
      key: 'videos',
      score: Math.min(agg.counts.youtube, 500),
      params: { count: agg.counts.youtube }
    })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]
}
