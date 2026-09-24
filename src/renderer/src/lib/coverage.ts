import type { SkippedEntry } from '../../../shared/types'

export interface SkippedSummary {
  /** Secciones con un motivo que merece informarse (formato desconocido, daño, etc.). */
  detailed: SkippedEntry[]
  /** Archivos vacíos o sin actividad: normal en un Takeout, se resumen en una línea. */
  emptyCount: number
}

export function summarizeSkipped(skipped: SkippedEntry[]): SkippedSummary {
  const detailed = skipped.filter((s) => s.reason !== 'empty')
  return { detailed, emptyCount: skipped.length - detailed.length }
}
