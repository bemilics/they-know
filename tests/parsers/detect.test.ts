import { describe, expect, it } from 'vitest'
import {
  classifyJsonText,
  classifyJsonValue,
  classifyMyActivityItem
} from '../../src/parsers/detect'

describe('classifyJsonValue', () => {
  it('detects semantic location arrays', () => {
    expect(classifyJsonValue([{ startTime: 'x', visit: {} }])).toBe('semantic-location')
    expect(classifyJsonValue([{ startTime: 'x', activity: {} }])).toBe('semantic-location')
    expect(classifyJsonValue([{ startTime: 'x', timelinePath: [] }])).toBe('semantic-location')
  })
  it('detects records objects', () => {
    expect(classifyJsonValue({ locations: [] })).toBe('location-records')
  })
  it('detects my activity arrays', () => {
    expect(classifyJsonValue([{ header: 'Search', title: 'x', time: 't' }])).toBe('my-activity')
  })
  it('returns null for unknown shapes', () => {
    expect(classifyJsonValue({ foo: 1 })).toBeNull()
    expect(classifyJsonValue([{ random: true }])).toBeNull()
    expect(classifyJsonValue([])).toBeNull()
    expect(classifyJsonValue('str')).toBeNull()
  })
})

describe('classifyJsonText', () => {
  it('detects from raw head text', () => {
    expect(classifyJsonText('{"locations": [{"latitudeE7": 1}]')).toBe('location-records')
    expect(classifyJsonText('[{"startTime": "x", "visit": {}}]')).toBe('semantic-location')
    expect(classifyJsonText('[{"header": "Search", "title": "t", "time": "x"}]')).toBe(
      'my-activity'
    )
    expect(classifyJsonText('{"a": 1}')).toBeNull()
  })
})

describe('classifyMyActivityItem', () => {
  it('classifies by header in EN and ES (accent-insensitive)', () => {
    expect(classifyMyActivityItem({ header: 'Search' })).toBe('search')
    expect(classifyMyActivityItem({ header: 'Búsqueda' })).toBe('search')
    expect(classifyMyActivityItem({ header: 'YouTube' })).toBe('youtube')
  })
  it('falls back to products array', () => {
    expect(classifyMyActivityItem({ header: '', products: ['YouTube'] })).toBe('youtube')
    expect(classifyMyActivityItem({ products: ['Búsqueda'] })).toBe('search')
  })
  it('returns null for other products', () => {
    expect(classifyMyActivityItem({ header: 'Maps', products: ['Maps'] })).toBeNull()
    expect(classifyMyActivityItem({})).toBeNull()
  })
})
