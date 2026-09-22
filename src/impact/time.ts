const offsetCache = new Map<string, number>()

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Offset en horas de un timezone respecto UTC para una fecha dada (ms epoch). */
export function tzOffsetHours(timezone: string, utcMs: number): number {
  const key = `${timezone}|${Math.floor(utcMs / 86400000)}`
  const hit = offsetCache.get(key)
  if (hit !== undefined) return hit
  let offset = 0
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    const parts = dtf.formatToParts(new Date(utcMs))
    const get = (t: string): number => {
      const p = parts.find((x) => x.type === t)
      return p ? parseInt(p.value, 10) : 0
    }
    let hour = get('hour')
    if (hour === 24) hour = 0
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
    offset = Math.round((asUTC - utcMs) / 3600000)
  } catch {
    offset = 0
  }
  offsetCache.set(key, offset)
  return offset
}

export interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
}

export function toLocal(ts: number | string, timezone: string): LocalParts {
  const ms = typeof ts === 'string' ? Date.parse(ts) : ts
  const off = tzOffsetHours(timezone, ms)
  const local = new Date(ms + off * 3600000)
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    weekday: local.getUTCDay()
  }
}

/** Clave de día local YYYY-MM-DD. */
export function localDayKey(ts: number | string, timezone: string): string {
  const p = toLocal(ts, timezone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Clave de semana ISO (YYYY-Www) en tiempo local. */
export function localWeekKey(ts: number | string, timezone: string): string {
  const ms = typeof ts === 'string' ? Date.parse(ts) : ts
  const off = tzOffsetHours(timezone, ms)
  const local = new Date(ms + off * 3600000)
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Día ordinal (desde epoch day) en el timezone dado — para diffs de días consecutivos. */
export function localDayOrdinal(ts: number | string, timezone: string): number {
  const ms = typeof ts === 'string' ? Date.parse(ts) : ts
  const off = tzOffsetHours(timezone, ms)
  return Math.floor((ms + off * 3600000) / 86400000)
}

export function isNightHour(hour: number): boolean {
  return hour >= 22 || hour < 7
}

export function isWorkHour(hour: number): boolean {
  return hour >= 9 && hour < 18
}
