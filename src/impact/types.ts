import type { NormalizedEntity } from '../shared/types'

export type EpistemicLevel = 'hecho' | 'inferencia' | 'implicancia'
export type Confidence = 'alta' | 'media' | 'baja'
export type Sensibilidad = 'alta' | 'media' | 'baja'

export interface Evidence {
  tipo: string
  puntos: number
  detalle: string
  timestamps?: string[]
}

export interface CardData {
  valor?: string | number
  unidad?: string
}

export interface Card {
  id: string
  nivel: EpistemicLevel
  titulo_i18n_key: string
  detalle_i18n_key: string
  datos_rellenables: Record<string, CardData>
  evidencia: Evidence[]
  confianza: Confidence
  sensibilidad: Sensibilidad
  reveal_steps: string[]
}

export interface Cluster {
  id: number
  lat: number
  lng: number
  points: number[]
}

export interface Place {
  id: string
  kind: 'casa' | 'trabajo' | 'secundario'
  lat: number
  lng: number
  noches: number
  dias_laborales: number
  puntos: number
}

export interface ImpactConfig {
  timezone: string
  lexiconVersion: string
  now: number
}

export interface ImpactResult {
  cards: Card[]
  places: Place[]
  meta: {
    entities: number
    version: string
  }
}

export type ImpactProgressStage =
  | 'init'
  | 'places'
  | 'lexicon'
  | 'spikes'
  | 'correlations'
  | 'cards'
  | 'done'

export interface ImpactProgress {
  stage: ImpactProgressStage
  done: number
  total: number
}

export type EntityFilter = (e: NormalizedEntity) => boolean
