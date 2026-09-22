import { describe, expect, it } from 'vitest'
import { haversineMeters, clusterByGrid } from '../../src/impact/geo'
import { localWeekKey, localDayKey, toLocal, isNightHour } from '../../src/impact/time'

describe('geo', () => {
  it('haversine distancia conocida', () => {
    // ~111m por 0.001 grados de latitud
    const d = haversineMeters(-33.45, -70.66, -33.451, -70.66)
    expect(d).toBeGreaterThan(90)
    expect(d).toBeLessThan(130)
  })

  it('cluster separa dos sitios lejanos', () => {
    const pts = [
      { lat: -33.45, lng: -70.66, idx: 0 },
      { lat: -33.4501, lng: -70.6601, idx: 1 },
      { lat: -33.44, lng: -70.63, idx: 2 }
    ]
    const clusters = clusterByGrid(pts, 150)
    expect(clusters.length).toBe(2)
    const sizes = clusters.map((c) => c.members.length).sort()
    expect(sizes).toEqual([1, 2])
  })
})

describe('time', () => {
  it('day key en timezone fijo', () => {
    // 2025-03-01T02:00:00Z en America/Santiago (UTC-3) = 2025-02-28
    expect(localDayKey('2025-03-01T02:00:00Z', 'America/Santiago')).toBe('2025-02-28')
  })

  it('week key ISO', () => {
    // 2025-01-06 es lunes de semana 2
    expect(localWeekKey('2025-01-06T12:00:00Z', 'UTC')).toMatch(/^2025-W0[0-9]$/)
  })

  it('partes locales y noche', () => {
    const p = toLocal('2025-03-01T05:00:00Z', 'America/Santiago')
    expect(p.hour).toBe(2)
    expect(isNightHour(p.hour)).toBe(true)
  })
})
