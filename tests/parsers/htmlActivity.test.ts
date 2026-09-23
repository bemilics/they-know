import { describe, expect, it } from 'vitest'
import {
  looksLikeActivityHtml,
  parseActivityCell,
  parseTakeoutHtmlDate
} from '../../src/parsers/htmlActivity'

describe('parseTakeoutHtmlDate', () => {
  it('parses Spanish date with a.m./p.m. and GMT offset', () => {
    expect(parseTakeoutHtmlDate('2 mar 2024, 4:12:33 a.m. GMT-03:00')).toBe(
      '2024-03-02T07:12:33.000Z'
    )
    expect(parseTakeoutHtmlDate('5 mar 2024, 8:41:10 p.m. GMT-03:00')).toBe(
      '2024-03-05T23:41:10.000Z'
    )
  })

  it('parses Spanish sept and narrow no-break space before a.m.', () => {
    expect(parseTakeoutHtmlDate('24 may 2023, 8:00:40\u202fa.m. GMT-03:00')).toBe(
      '2023-05-24T11:00:40.000Z'
    )
    expect(parseTakeoutHtmlDate('22 sept 2026, 4:17:36 p.m. GMT-03:00')).toBe(
      '2026-09-22T19:17:36.000Z'
    )
  })

  it('parses English date with positive offset', () => {
    expect(parseTakeoutHtmlDate('15 Jan 2024, 10:45:00 a.m. GMT+00:00')).toBe(
      '2024-01-15T10:45:00.000Z'
    )
    expect(parseTakeoutHtmlDate('16 Jan 2024, 2:20:00 a.m. GMT+00:00')).toBe(
      '2024-01-16T02:20:00.000Z'
    )
  })

  it('rejects garbage', () => {
    expect(parseTakeoutHtmlDate('ayer en la noche')).toBeNull()
    expect(parseTakeoutHtmlDate('')).toBeNull()
  })
})

describe('looksLikeActivityHtml', () => {
  const activity = `</style><body><div class="outer-cell x"><div>Búsquedas Productos: Buscaste hola</div></div></body>`
  const noise = `</style><body><div class="score">Level 1</div></body>`
  const withoutMarkers = `</style><body><p>Buscaste hola Productos:</p></body>`

  it('detects takeout activity export', () => {
    expect(looksLikeActivityHtml(activity)).toBe(true)
  })

  it('rejects unrelated html and missing markers', () => {
    expect(looksLikeActivityHtml(noise)).toBe(false)
    expect(looksLikeActivityHtml(withoutMarkers)).toBe(false)
    expect(looksLikeActivityHtml('')).toBe(false)
  })
})

describe('parseActivityCell', () => {
  const cell = (content: string): string =>
    `<div class="outer-cell"><div class="mdl-grid"><div class="header-cell"><p class="mdl-typography--title">Búsqueda<br></p></div><div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">${content}<br></div><div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1 mdl-typography--text-right"></div></div></div>`

  it('parses a Spanish search line', () => {
    const entity = parseActivityCell(
      cell('Buscaste cómo dormir mejor<br>2 mar 2024, 4:12:33 a.m. GMT-03:00')
    )
    expect(entity).toMatchObject({
      tipo: 'search',
      titulo: 'cómo dormir mejor',
      timestamp: '2024-03-02T07:12:33.000Z'
    })
  })

  it('parses youtube watch with channel link', () => {
    const entity = parseActivityCell(
      cell(
        'Has visto <a href="https://www.youtube.com/watch?v=abc123">Cómo dejar de procrastinar</a><br><a href="https://www.youtube.com/channel/x">Canal Motivacional</a><br>3 mar 2024, 9:15:00 p.m. GMT-03:00'
      )
    )
    expect(entity).toMatchObject({
      tipo: 'youtube',
      titulo: 'Cómo dejar de procrastinar',
      detalle: 'Canal Motivacional',
      timestamp: '2024-03-04T00:15:00.000Z'
    })
  })

  it('skips visits and cells without a date', () => {
    expect(
      parseActivityCell(cell('Visitaste Google Maps<br>6 mar 2024, 7:00:00 a.m. GMT-03:00'))
    ).toBeNull()
    expect(parseActivityCell(cell('Buscaste sin fecha'))).toBeNull()
    expect(
      parseActivityCell(
        cell('3 notificaciones<br>Temas incluidos:<br>22 sept 2026, 4:17:36 p.m. GMT-03:00')
      )
    ).toBeNull()
  })
})
