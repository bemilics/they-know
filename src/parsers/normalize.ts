export function parseTimestamp(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const ms = value < 1e12 ? value * 1000 : value
    return toIso(ms)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{10}$/.test(trimmed)) return toIso(Number(trimmed) * 1000)
    if (/^\d{11,}$/.test(trimmed)) return toIso(Number(trimmed))
    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) return toIso(parsed)
  }
  return null
}

function toIso(ms: number): string | null {
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function parseE7(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const coord = n / 1e7
  if (coord < -180 || coord > 180) return null
  return coord
}

export function parseLatLngString(value: unknown): { lat: number; lng: number } | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[°\s]/g, '')
  const parts = cleaned.split(',')
  if (parts.length !== 2) return null
  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

export function stripKnownPrefix(title: string, prefixes: string[]): string {
  const lower = title.toLowerCase()
  for (const p of prefixes) {
    if (lower.startsWith(p)) return title.slice(p.length).trim()
  }
  return title
}
