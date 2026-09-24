import type { Card, ImpactResult } from '../types'

export interface ShareCard {
  id: string
  nivel: string
  titulo_key: string
  resumen: string
  confianza: string
}

export interface SharePayload {
  version: 1
  generado: string
  cartas: ShareCard[]
  meta: { cartas: number; entidades: number }
}

const SENSITIVE_KEYS = new Set([
  'busqueda',
  'titulo',
  'detalle',
  'matches',
  'query',
  'aplicacion',
  'ejemplo',
  'producto',
  'lugar'
])

function redactValue(v: unknown): string {
  void v
  return '•••'
}

/** Construye payload de share sin contenido sensible (términos de búsqueda, títulos crudos). */
export function buildSharePayload(result: ImpactResult): SharePayload {
  const cartas: ShareCard[] = result.cards.map((c: Card) => {
    const resumenParts: string[] = []
    for (const [key, data] of Object.entries(c.datos_rellenables)) {
      if (SENSITIVE_KEYS.has(key)) {
        resumenParts.push(`${key}=${redactValue(data.valor)}`)
        continue
      }
      const val = data.valor
      if (typeof val === 'string' && val.length > 40) {
        resumenParts.push(`${key}=•••`)
      } else {
        resumenParts.push(`${key}=${String(val)}`)
      }
    }
    return {
      id: c.id,
      nivel: c.nivel,
      titulo_key: c.titulo_i18n_key,
      resumen: resumenParts.join(', '),
      confianza: c.confianza
    }
  })

  return {
    version: 1,
    generado: new Date().toISOString(),
    cartas,
    meta: {
      cartas: cartas.length,
      entidades: result.meta.entities
    }
  }
}

/** Serialización segura para clipboard/file (sin evidencia con timestamps si sensitive). */
export function serializeShare(payload: SharePayload): string {
  return JSON.stringify(payload, null, 2)
}
