import type { NormalizedEntity } from '../../shared/types'
import { parseTimestamp, stripKnownPrefix } from '../normalize'

const WATCH_PREFIXES = ['watched ', 'viste ', 'miraste ']

export function parseYoutubeItem(item: Record<string, unknown>): NormalizedEntity | null {
  const timestamp = parseTimestamp(item.time)
  if (!timestamp) return null
  const title = typeof item.title === 'string' ? item.title : ''
  if (!title) return null
  let channel: string | undefined
  if (Array.isArray(item.subtitles) && item.subtitles.length > 0) {
    const first = item.subtitles[0]
    if (first !== null && typeof first === 'object' && typeof first.name === 'string') {
      channel = first.name
    }
  }
  return {
    tipo: 'youtube',
    timestamp,
    titulo: stripKnownPrefix(title, WATCH_PREFIXES),
    detalle: channel
  }
}
