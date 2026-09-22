import type { NormalizedEntity } from '../../shared/types'
import { parseTimestamp, stripKnownPrefix } from '../normalize'

const SEARCH_PREFIXES = ['searched for ', 'buscaste ']
const VISIT_PREFIXES = ['visited ', 'visitaste ']

export function parseSearchItem(item: Record<string, unknown>): NormalizedEntity | null {
  const timestamp = parseTimestamp(item.time)
  if (!timestamp) return null
  const title = typeof item.title === 'string' ? item.title : ''
  if (!title) return null
  const lower = title.toLowerCase()
  if (VISIT_PREFIXES.some((p) => lower.startsWith(p))) return null
  return {
    tipo: 'search',
    timestamp,
    titulo: stripKnownPrefix(title, SEARCH_PREFIXES),
    detalle: typeof item.titleUrl === 'string' ? item.titleUrl : undefined
  }
}
