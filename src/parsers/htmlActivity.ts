import { StringDecoder } from 'node:string_decoder'
import type { Readable } from 'node:stream'
import type { NormalizedEntity } from '../shared/types'

const CELL_MARKER = '<div class="outer-cell'

// Prefijos sin espacio final: el matching exige límite de palabra (fin de
// línea o espacio), así que "Empezaste a comprar<br>Kimi" también calza.
const SEARCH_PREFIXES = ['buscaste', 'searched for']
const VISIT_PREFIXES = ['visitaste', 'has visitado', 'visited']
const WATCH_PREFIXES = ['has visto', 'watched', 'viste', 'miraste']
const DIRECTIONS_PREFIXES = ['indicaciones a', 'directions to', 'got directions to']
const USED_PREFIXES = ['se ha utilizado', 'used', 'se ha llamado', 'called']
const PURCHASE_START_PREFIXES = ['empezaste a comprar', 'started purchasing']

/** Ruido transversal: sincronización y notificaciones, sin historia. */
const NOISE_PREFIXES = [
  'se ha recibido',
  'has recibido',
  'received a',
  'has received',
  'dispositivo conectado',
  'device connected',
  'se ha actualizado la información de uso',
  'usage information has been updated'
]

/** Ruido dentro de celdas con header de Maps (zonas exploradas, timeline, etc.). */
const MAPS_NOISE_PREFIXES = [
  'explorado en',
  'explored',
  'se ha visualizado',
  'viewed',
  'visto',
  'notificación'
]

const NOTIFICATION_RE = /^(\d+\s*)?(notificaci|notification)/

/** El store mismo como "destino de visita" no es dato, es ruido. */
const PLAY_STORE_SELF_TITLES = ['google play', 'google play store', 'play store']

/** El verbo calza si termina en límite de palabra: fin de línea o espacio. */
function matchesVerb(lower: string, prefix: string): boolean {
  if (!lower.startsWith(prefix)) return false
  const next = lower.charAt(prefix.length)
  return next === '' || next === ' '
}

function stripVerb(title: string, prefixes: string[]): string {
  const lower = title.toLowerCase()
  for (const p of prefixes) {
    if (matchesVerb(lower, p)) return title.slice(p.length).trim()
  }
  return ''
}

function hasVerb(lower: string, prefixes: string[]): boolean {
  return prefixes.some((p) => matchesVerb(lower, p))
}

/**
 * Cuando el verbo va solo en su línea ("Indicaciones a<br>Destino<br>…"),
 * el título está en la línea siguiente. Omit fechas, marcadores de ubicación
 * y notificaciones: no son títulos.
 */
function titleFromNextLines(lines: string[]): string {
  for (const line of lines.slice(1)) {
    if (parseTakeoutHtmlDate(line)) continue
    if (/^(ubicación actual|current location)$/i.test(line)) continue
    if (NOTIFICATION_RE.test(line.toLowerCase())) continue
    return line
  }
  return ''
}

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
  const headerMaps = header.includes('maps')
  const headerPlay = header.includes('play')

  const product = headerMaps ? 'maps' : headerPlay ? 'play-store' : undefined

  if (NOTIFICATION_RE.test(lower)) return null
  if (hasVerb(lower, NOISE_PREFIXES)) return null
  if (headerMaps && hasVerb(lower, MAPS_NOISE_PREFIXES)) return null

  if (hasVerb(lower, SEARCH_PREFIXES)) {
    const titulo = stripVerb(first, SEARCH_PREFIXES) || titleFromNextLines(lines)
    if (!titulo) return null
    return {
      tipo: 'search',
      timestamp,
      titulo,
      ...(product ? { product } : {}),
      ...(watchUrl ? { detalle: watchUrl } : {})
    }
  }

  if (hasVerb(lower, DIRECTIONS_PREFIXES)) {
    const titulo = stripVerb(first, DIRECTIONS_PREFIXES) || titleFromNextLines(lines)
    if (!titulo) return null
    return { tipo: 'maps', timestamp, titulo, product: 'maps' }
  }

  if (hasVerb(lower, USED_PREFIXES)) {
    const titulo =
      stripVerb(first, USED_PREFIXES) ||
      titleFromNextLines(lines) ||
      (PLAY_STORE_SELF_TITLES.includes(header) ? '' : header)
    if (!titulo) return null
    return { tipo: 'app', timestamp, titulo, product: product ?? 'play-store' }
  }

  if (hasVerb(lower, PURCHASE_START_PREFIXES)) {
    const titulo =
      stripVerb(first, PURCHASE_START_PREFIXES) ||
      titleFromNextLines(lines) ||
      (PLAY_STORE_SELF_TITLES.includes(header) ? '' : header)
    if (!titulo) return null
    return { tipo: 'purchase', timestamp, titulo, product: 'play-store' }
  }

  if (hasVerb(lower, VISIT_PREFIXES)) {
    if (headerPlay) {
      const titulo = (stripVerb(first, VISIT_PREFIXES) || titleFromNextLines(lines)).trim()
      const norm = titulo.toLowerCase()
      if (!norm || PLAY_STORE_SELF_TITLES.includes(norm)) return null
      return { tipo: 'app', timestamp, titulo, product: 'play-store' }
    }
    // Visitas genéricas (ej. "Visitaste Google Maps" en Búsqueda) siguen omitidas.
    return null
  }

  if (hasVerb(lower, WATCH_PREFIXES) && (isYoutubeHeader || watchUrl)) {
    const titulo = stripVerb(first, WATCH_PREFIXES) || titleFromNextLines(lines)
    if (!titulo) return null
    const channel = channelHtml ? htmlToPlain(channelHtml).trim() : undefined
    return {
      tipo: 'youtube',
      timestamp,
      titulo,
      ...(channel ? { detalle: channel } : {})
    }
  }

  // Lugares vistos en Maps: celda con header Maps sin verbo reconocido = nombre del lugar.
  if (headerMaps) {
    const titulo = first.trim()
    if (!titulo) return null
    return { tipo: 'maps', timestamp, titulo, product: 'maps' }
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
