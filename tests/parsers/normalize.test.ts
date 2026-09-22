import { describe, expect, it } from 'vitest'
import { parseE7, parseLatLngString, parseTimestamp, stripKnownPrefix } from '../../src/parsers/normalize'

describe('parseTimestamp', () => {
  it('parses ISO strings', () => {
    expect(parseTimestamp('2024-01-15T13:45:00.000Z')).toBe('2024-01-15T13:45:00.000Z')
  })
  it('parses ISO strings with timezone offset', () => {
    expect(parseTimestamp('2024-03-02T04:12:33.000-03:00')).toBe('2024-03-02T07:12:33.000Z')
  })
  it('parses millisecond epoch strings', () => {
    expect(parseTimestamp('1705316400000')).toBe('2024-01-15T11:00:00.000Z')
  })
  it('parses second epoch strings', () => {
    expect(parseTimestamp('1705316400')).toBe('2024-01-15T11:00:00.000Z')
  })
  it('rejects garbage', () => {
    expect(parseTimestamp('ayer en la noche')).toBeNull()
    expect(parseTimestamp('')).toBeNull()
    expect(parseTimestamp(null)).toBeNull()
    expect(parseTimestamp(undefined)).toBeNull()
    expect(parseTimestamp({})).toBeNull()
  })
})

describe('parseE7', () => {
  it('converts E7 integers', () => {
    expect(parseE7(-334489000)).toBeCloseTo(-33.4489)
    expect(parseE7(-706693000)).toBeCloseTo(-70.6693)
  })
  it('rejects out of range and junk', () => {
    expect(parseE7(99999999999)).toBeNull()
    expect(parseE7('abc')).toBeNull()
    expect(parseE7(null)).toBeNull()
  })
})

describe('parseLatLngString', () => {
  it('parses takeout degree format', () => {
    expect(parseLatLngString('-33.4489°, -70.6693°')).toEqual({ lat: -33.4489, lng: -70.6693 })
  })
  it('rejects malformed', () => {
    expect(parseLatLngString('norte, sur')).toBeNull()
    expect(parseLatLngString('-91.0, 0')).toBeNull()
    expect(parseLatLngString(42)).toBeNull()
  })
})

describe('stripKnownPrefix', () => {
  it('strips case-insensitively', () => {
    expect(stripKnownPrefix('Buscaste hola', ['buscaste '])).toBe('hola')
    expect(stripKnownPrefix('Watched video', ['watched '])).toBe('video')
  })
  it('returns original when no prefix matches', () => {
    expect(stripKnownPrefix('hola', ['watched '])).toBe('hola')
  })
})
