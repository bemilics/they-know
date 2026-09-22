import type { NormalizedEntity } from '../../../src/shared/types'

export function resetFixtures(): void {
  void 0
}

export function loc(
  lat: number,
  lng: number,
  timestamp: string,
  titulo = 'ubicación'
): NormalizedEntity {
  return { tipo: 'location', timestamp, titulo, lat, lng }
}

export function search(titulo: string, timestamp: string, detalle = ''): NormalizedEntity {
  return { tipo: 'search', timestamp, titulo, detalle }
}

export function youtube(titulo: string, timestamp: string): NormalizedEntity {
  return { tipo: 'youtube', timestamp, titulo }
}

/** Offset horario Santiago aproximado (CLT UTC-3 / CLST UTC-4) simple por mes. */
export function santiagoIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): string {
  // asume UTC-3 (estable para tests de invierno; evitar cambios de hora en fixtures)
  const utcHour = hour + 3
  const d = new Date(Date.UTC(year, month - 1, day, utcHour, minute))
  return d.toISOString()
}

/** ~250 noches en casa (-33.45, -70.66) y días laborales en trabajo (-33.44, -70.63). */
export function buildSyntheticDataset(): NormalizedEntity[] {
  const entities: NormalizedEntity[] = []
  const start = new Date(Date.UTC(2025, 0, 6)) // lunes

  for (let d = 0; d < 120; d++) {
    const day = new Date(start.getTime() + d * 86400000)
    const y = day.getUTCFullYear()
    const mo = day.getUTCMonth() + 1
    const da = day.getUTCDate()
    const weekday = day.getUTCDay()

    // noche en casa: punto 03:00 local
    entities.push(loc(-33.45, -70.66, santiagoIso(y, mo, da, 3), 'casa'))

    // lunes-viernes: sesión trabajo 09:30-17:30 (varios puntos)
    if (weekday >= 1 && weekday <= 5) {
      entities.push(loc(-33.44, -70.63, santiagoIso(y, mo, da, 9, 30), 'trabajo'))
      entities.push(loc(-33.44, -70.63, santiagoIso(y, mo, da, 13, 0), 'trabajo'))
      entities.push(loc(-33.44, -70.63, santiagoIso(y, mo, da, 17, 30), 'trabajo'))
      // búsqueda laboral en horario
      entities.push(search('ofertas de trabajo', santiagoIso(y, mo, da, 12, 0)))
    }

    // cada 7 días: residencia secundaria (-33.42, -70.60) de noche
    if (d % 7 === 3) {
      entities.push(loc(-33.42, -70.6, santiagoIso(y, mo, da, 2, 0), 'secundario'))
    }
  }

  // hitos de léxico: 8 búsquedas de psiquiatra (nocturnas)
  for (let i = 0; i < 8; i++) {
    const day = new Date(start.getTime() + (10 + i * 5) * 86400000)
    entities.push(
      search(
        'psiquiatra santiago',
        santiagoIso(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), 23, 15)
      )
    )
  }

  // spike: 12 búsquedas de "entrevista de trabajo" en una semana, pocas antes
  for (let i = 0; i < 40; i++) {
    const day = new Date(start.getTime() + i * 86400000)
    const count = i >= 30 && i < 37 ? 2 : i < 20 ? 0 : 1
    for (let k = 0; k < count; k++) {
      entities.push(
        search('entrevista de trabajo senior', santiagoIso(
          day.getUTCFullYear(),
          day.getUTCMonth() + 1,
          day.getUTCDate(),
          10,
          10 + k
        ))
      )
    }
  }

  // co-proximidad: búsquedas junto a puntos de ubicación
  for (let i = 0; i < 6; i++) {
    const day = new Date(start.getTime() + (20 + i * 8) * 86400000)
    const y = day.getUTCFullYear()
    const mo = day.getUTCMonth() + 1
    const da = day.getUTCDate()
    entities.push(loc(-33.45, -70.66, santiagoIso(y, mo, da, 21, 30), 'casa'))
    entities.push(search('farmacia abierta', santiagoIso(y, mo, da, 21, 45)))
  }

  return entities.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
}
