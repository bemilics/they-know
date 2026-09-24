import { describe, expect, it } from 'vitest'
import {
  classifyJsonText,
  classifyJsonValue,
  classifyMyActivityItem,
  isEmptyJson
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
  it('detects maps reviews GeoJSON', () => {
    expect(classifyJsonValue({ type: 'FeatureCollection', features: [] })).toBe('maps-reviews')
    expect(
      classifyJsonValue({ type: 'FeatureCollection', features: [{ type: 'Feature' }] })
    ).toBe('maps-reviews')
    expect(classifyJsonValue({ type: 'Feature', geometry: {} })).toBeNull()
  })
  it('detects play store wrapper arrays', () => {
    expect(classifyJsonValue([{ install: {} }])).toBe('play-store')
    expect(classifyJsonValue([{ libraryDoc: {} }])).toBe('play-store')
    expect(classifyJsonValue([{ purchaseHistory: {} }])).toBe('play-store')
    expect(classifyJsonValue([{ subscription: {} }])).toBe('play-store')
    expect(classifyJsonValue([{ orderHistory: {} }])).toBe('play-store')
    expect(classifyJsonValue([{ device: {} }])).toBe('play-store')
    expect(classifyJsonValue([{ userSetting: {} }])).toBe('play-store')
  })
  it('classifies empty json as empty, not unknown', () => {
    expect(isEmptyJson([])).toBe(true)
    expect(isEmptyJson({})).toBe(true)
    expect(isEmptyJson({ answers: [], questions: [], replies: [], thumbs_ups: [] })).toBe(true)
    expect(isEmptyJson([{ install: {} }])).toBe(false)
    expect(isEmptyJson({ foo: 1 })).toBe(false)
    expect(isEmptyJson({ answers: [1] })).toBe(false)
    expect(isEmptyJson(null)).toBe(false)
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
  it('detects maps reviews and play store from head text', () => {
    expect(classifyJsonText('{"type": "FeatureCollection", "features": [')).toBe('maps-reviews')
    expect(classifyJsonText('[{"purchaseHistory": {"purchaseTime": "2024')).toBe('play-store')
    expect(classifyJsonText('[{"install": {"doc":')).toBe('play-store')
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
