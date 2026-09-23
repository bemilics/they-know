import { StringDecoder } from 'node:string_decoder'
import type { Readable } from 'node:stream'
import type { NormalizedEntity } from '../shared/types'
import { stripKnownPrefix } from './normalize'

const CELL_MARKER = '<div class="outer-cell'

const SEARCH_PREFIXES = ['buscaste ', 'searched for ']
const VISIT_PREFIXES = ['visitaste ', 'visited ']
const WATCH_PREFIXES = ['has visto ', 'watched ', 'viste ', 'miraste ']

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  ene: 0,
  enero: 0,
  feb: 1,
  february: 1,
  febrero: 1,
  mar: 2,
  march: 2,
  marzo: 2,
  apr: 3,
  april: 3,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  june: 5,
  junio: 5,
  jul: 6,
  july: 6,
  julio: 6,
  aug: 7,
  august: 7,
  ago: 7,
  agosto: 7,
  sep: 8,
  sept: 8,
  september: 8,
  septiembre: 8,
  oct: 9,
  october: 9,
  octubre: 9,
  nov: 10,
  november: 10,
  noviembre: 10,
  dec: 11,
  december: 11,
  dic: 11,
  diciembre: 11
}

const DATE_RE =
  /^(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,12})\s+(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*([ap])\.?\s*m\.?\s*GMT([+-])(\d{2}):(\d{2})$/i

export function normalizeSpaces(value: string): string {
  return value.replace(/[\u00a0\u202f\u2009]/g, ' ')
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
}

function htmlToPlain(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n')
  const tagsStripped = withBreaks.replace(/<[^>]+>/g, '')
  return normalizeSpaces(decodeEntities(tagsStripped))
}

export function looksLikeActivityHtml(head: string): boolean {
  if (!head.includes(CELL_MARKER) && !head.includes('outer-cell')) return false
  const styleEnd = head.indexOf('</style>')
  const region = styleEnd >= 0 ? head.slice(styleEnd) : head
  if (!region.includes('outer-cell') && !region.includes(CELL_MARKER)) return false
  return (
    /Productos:|Products:|¿Por qué se grabó esta actividad\?|Why was this activity saved\?/.test(
      region
    ) || /Buscaste |Searched for |Has visto |Watched /.test(region)
  )
}

export function parseTakeoutHtmlDate(line: string): string | null {
  const m = normalizeSpaces(line.trim()).match(DATE_RE)
  if (!m) return null
  const day = Number(m[1])
  const monthKey = m[2].toLowerCase().replace(/\./g, '')
  const month = MONTHS[monthKey]
  if (month === undefined) return null
  const year = Number(m[3])
  const hourRaw = Number(m[4])
  const minute = Number(m[5])
  const second = Number(m[6])
  const isPm = m[7].toLowerCase() === 'p'
  const sign = m[8] === '-' ? -1 : 1
  const offsetMin = sign * (Number(m[9]) * 60 + Number(m[10]))
  const hour = (hourRaw % 12) + (isPm ? 12 : 0)
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(year) ||
    hourRaw < 1 ||
    hourRaw > 12 ||
    minute > 59 ||
    second > 59
  ) {
    return null
  }
  const utcMs = Date.UTC(year, month, day, hour, minute, second) - offsetMin * 60_000
  const d = new Date(utcMs)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function extractContentHtml(cellHtml: string): string | null {
  const m = cellHtml.match(
    /class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">([\s\S]*?)<\/div>/
  )
  return m ? m[1] : null
}

export function parseActivityCell(cellHtml: string): NormalizedEntity | null {
  const headerMatch = cellHtml.match(/class="mdl-typography--title">([\s\S]*?)<\/p>/)
  const header = headerMatch ? htmlToPlain(headerMatch[1]).trim().toLowerCase() : ''

  const contentHtml = extractContentHtml(cellHtml)
  if (contentHtml === null) return null

  const watchUrl =
    contentHtml.match(/href="(https:\/\/www\.youtube\.com\/watch\?[^"]+)"/i)?.[1] ?? undefined
  const channelHtml =
    contentHtml.match(
      /<a[^>]+href="https:\/\/www\.youtube\.com\/channel\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i
    )?.[1] ?? undefined

  const plain = htmlToPlain(contentHtml)
  const lines = plain
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return null

  let timestamp: string | null = null
  for (let i = lines.length - 1; i >= 0; i--) {
    timestamp = parseTakeoutHtmlDate(lines[i])
    if (timestamp) break
  }
  if (!timestamp) return null

  const first = lines[0]
  const lower = first.toLowerCase()
  const isYoutubeHeader = header.includes('youtube')

  if (VISIT_PREFIXES.some((p) => lower.startsWith(p))) return null

  if (SEARCH_PREFIXES.some((p) => lower.startsWith(p))) {
    const titulo = stripKnownPrefix(first, SEARCH_PREFIXES)
    if (!titulo) return null
    return { tipo: 'search', timestamp, titulo, ...(watchUrl ? { detalle: watchUrl } : {}) }
  }

  if (WATCH_PREFIXES.some((p) => lower.startsWith(p)) && (isYoutubeHeader || watchUrl)) {
    const titulo = stripKnownPrefix(first, WATCH_PREFIXES)
    if (!titulo) return null
    const channel = channelHtml ? htmlToPlain(channelHtml).trim() : undefined
    return {
      tipo: 'youtube',
      timestamp,
      titulo,
      ...(channel ? { detalle: channel } : {})
    }
  }

  return null
}

export async function parseActivityHtmlStream(
  source: Readable,
  onEntity: (entity: NormalizedEntity) => void
): Promise<number> {
  const decoder = new StringDecoder('utf8')
  let buf = ''
  let records = 0
  let started = false

  const processCell = (cell: string): void => {
    if (!cell.includes(CELL_MARKER)) return
    const entity = parseActivityCell(cell)
    if (entity) {
      onEntity(entity)
      records++
    }
  }

  for await (const chunk of source) {
    buf += decoder.write(chunk as Buffer)
    if (!started) {
      const idx = buf.indexOf(CELL_MARKER)
      if (idx === -1) {
        if (buf.length > CELL_MARKER.length) buf = buf.slice(-(CELL_MARKER.length - 1))
        continue
      }
      buf = buf.slice(idx)
      started = true
    }
    let idx: number
    while ((idx = buf.indexOf(CELL_MARKER, CELL_MARKER.length)) !== -1) {
      processCell(buf.slice(0, idx))
      buf = buf.slice(idx)
    }
  }
  buf += decoder.end()
  if (started) processCell(buf)
  return records
}
