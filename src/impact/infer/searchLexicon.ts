import type { NormalizedEntity } from '../../shared/types'
import type { Card, Confidence, Sensibilidad } from '../types'
import lexicon from '../lexicon/v1/lexicon.json'

export interface LexiconHit {
  category: string
  term: string
  entity: NormalizedEntity
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

interface CompiledCategory {
  name: string
  terms: { raw: string; norm: string }[]
}

function compile(): CompiledCategory[] {
  const cats: CompiledCategory[] = []
  for (const [name, terms] of Object.entries(lexicon.categories)) {
    cats.push({
      name,
      terms: (terms as string[]).map((t) => ({ raw: t, norm: normalize(t) }))
    })
  }
  return cats
}

const compiled = compile()

export function lexiconVersion(): string {
  return lexicon.version
}

export function matchLexicon(entities: NormalizedEntity[]): LexiconHit[] {
  const hits: LexiconHit[] = []
  for (const e of entities) {
    if (e.tipo !== 'search' && e.tipo !== 'youtube') continue
    const hay = normalize(`${e.titulo} ${e.detalle ?? ''}`)
    for (const cat of compiled) {
      for (const term of cat.terms) {
        if (term.norm === '') continue
        if (hay.includes(term.norm)) {
          hits.push({ category: cat.name, term: term.raw, entity: e })
          break
        }
      }
    }
  }
  return hits
}

const CATEGORY_ORDER = [
  'salud',
  'dinero',
  'legal',
  'relaciones',
  'salud_fisica',
  'adicciones',
  'trabajo'
]

const SENSITIVITY: Record<string, Sensibilidad> = {
  salud: 'alta',
  dinero: 'alta',
  legal: 'alta',
  relaciones: 'alta',
  salud_fisica: 'alta',
  adicciones: 'alta',
  trabajo: 'media'
}

function confidenceFor(count: number): Confidence {
  if (count >= 5) return 'alta'
  if (count >= 2) return 'media'
  return 'baja'
}

export function cardsFromLexicon(hits: LexiconHit[]): Card[] {
  const byCat = new Map<string, LexiconHit[]>()
  for (const h of hits) {
    const arr = byCat.get(h.category)
    if (arr) arr.push(h)
    else byCat.set(h.category, [h])
  }

  const cards: Card[] = []
  let i = 0
  const ordered = CATEGORY_ORDER.filter((c) => byCat.has(c))
  for (const cat of ordered) {
    const list = byCat.get(cat)!
    const count = list.length
    const timestamps = list.slice(0, 10).map((h) => h.entity.timestamp)
    cards.push({
      id: `lexicon_${cat}`,
      nivel: count >= 3 ? 'hecho' : 'inferencia',
      titulo_i18n_key: `confessional:lexicon.${cat}.titulo`,
      detalle_i18n_key: `confessional:lexicon.${cat}.detalle`,
      datos_rellenables: {
        categoria: { valor: cat },
        cantidad: { valor: count, unidad: 'hits' }
      },
      evidencia: [
        {
          tipo: 'busquedas_lexico',
          puntos: count,
          detalle: `matches:${list.map((h) => h.term).join('|')}`,
          timestamps
        }
      ],
      confianza: confidenceFor(count),
      sensibilidad: SENSITIVITY[cat] ?? 'media',
      reveal_steps: ['buscado', 'categoria', 'cantidad']
    })
    i++
    void i
  }
  return cards
}
