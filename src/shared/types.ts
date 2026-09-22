export type EntityType = 'location' | 'search' | 'youtube'

export interface NormalizedEntity {
  tipo: EntityType
  timestamp: string
  titulo: string
  detalle?: string
  lat?: number
  lng?: number
}

export type SourceKind = 'google' | 'meta' | 'unknown'

export interface CoverageEntry {
  path: string
  kind: string
  records: number
}

export type SkipReason =
  | 'unsupported-section'
  | 'unknown-format'
  | 'parse-error'
  | 'non-json'

export interface SkippedEntry {
  path: string
  reason: SkipReason
}

export interface CoverageReport {
  parsed: CoverageEntry[]
  skipped: SkippedEntry[]
}

export interface ParseReport {
  source: SourceKind
  entities: NormalizedEntity[]
  coverage: CoverageReport
  filesScanned: number
}

export interface DossierSnapshot {
  version: 1
  source: SourceKind
  createdAt: string
  entities: NormalizedEntity[]
  coverage: CoverageReport
}

export type CleanupStatus = 'pending' | 'done'

export interface ChecklistItemState {
  status: CleanupStatus
  doneAt: string | null
}

export type ChecklistState = Record<string, ChecklistItemState>

export interface StoredData {
  snapshot: DossierSnapshot | null
  checklist: ChecklistState
}
