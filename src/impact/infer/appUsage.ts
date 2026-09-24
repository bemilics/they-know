import type { NormalizedEntity } from '../../shared/types'
import { toLocal } from '../time'
import type { Card } from '../types'

const MIN_APP_EVENTS = 5
const MIN_TOP_EVENTS = 10
const MIN_NIGHT_EVENTS = 20

function isNight(hour: number): boolean {
  return hour >= 22 || hour < 4
}

/**
 * Cartas de impacto sobre el uso de aplicaciones (registro de Play Store).
 * Los eventos se sincronizan en bloques: las horas son aproximadas, no
 * el instante exacto de uso. El copy lo dice explícitamente.
 */
export function inferAppCards(entities: NormalizedEntity[], timezone: string): Card[] {
  const apps = entities.filter((e) => e.tipo === 'app')
  if (apps.length < MIN_APP_EVENTS) return []

  const cards: Card[] = []

  // App más registrada
  const counts = new Map<string, number>()
  for (const a of apps) {
    const key = a.titulo.trim()
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let topTitle = ''
  let topCount = 0
  for (const [title, n] of counts) {
    if (n > topCount || (n === topCount && title.localeCompare(topTitle) < 0)) {
      topTitle = title
      topCount = n
    }
  }
  if (topTitle && topCount >= MIN_TOP_EVENTS) {
    cards.push({
      id: 'app_top',
      nivel: 'hecho',
      titulo_i18n_key: 'confessional:apps.top.titulo',
      detalle_i18n_key: 'confessional:apps.top.detalle',
      datos_rellenables: {
        aplicacion: { valor: topTitle },
        cantidad: { valor: topCount, unidad: 'registros' }
      },
      evidencia: [
        {
          tipo: 'uso_play_store',
          puntos: topCount,
          detalle: 'registros_sincronizados'
        }
      ],
      confianza: topCount >= 50 ? 'alta' : 'media',
      sensibilidad: 'baja',
      reveal_steps: ['cantidad', 'aplicacion']
    })
  }

  // Uso nocturno (22:00-04:00 local)
  const night = apps.filter((e) => {
    const ms = Date.parse(e.timestamp)
    if (Number.isNaN(ms)) return false
    return isNight(toLocal(ms, timezone).hour)
  })
  if (night.length >= MIN_NIGHT_EVENTS) {
    cards.push({
      id: 'app_night',
      nivel: 'hecho',
      titulo_i18n_key: 'confessional:apps.night.titulo',
      detalle_i18n_key: 'confessional:apps.night.detalle',
      datos_rellenables: {
        cantidad: { valor: night.length, unidad: 'registros' }
      },
      evidencia: [
        {
          tipo: 'uso_nocturno_apps',
          puntos: night.length,
          detalle: 'ventana_22_04_local',
          timestamps: night.slice(0, 10).map((e) => e.timestamp)
        }
      ],
      confianza: 'alta',
      sensibilidad: 'media',
      reveal_steps: ['ventana', 'cantidad']
    })
  }

  return cards
}
