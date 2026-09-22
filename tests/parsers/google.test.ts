import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZipFile } from 'yazl'
import { afterAll, describe, expect, it } from 'vitest'
import { GoogleTakeoutAdapter } from '../../src/parsers/google/GoogleTakeoutAdapter'
import { BIG_FILE_THRESHOLD } from '../../src/parsers/types'

const fixtures = path.dirname(fileURLToPath(import.meta.url)).replace(/parsers$/, 'fixtures')

const adapter = new GoogleTakeoutAdapter()

describe('GoogleTakeoutAdapter', () => {
  it('parses a Spanish takeout', async () => {
    const report = await adapter.parse([path.join(fixtures, 'takeout-es.zip')])
    expect(report.source).toBe('google')

    const searches = report.entities.filter((e) => e.tipo === 'search')
    expect(searches).toHaveLength(2)
    expect(searches[0].titulo).toBe('cómo dormir mejor')
    expect(searches[0].timestamp).toBe('2024-03-02T07:12:33.000Z')

    const youtube = report.entities.filter((e) => e.tipo === 'youtube')
    expect(youtube).toHaveLength(2)
    expect(youtube[0].titulo).toBe('Cómo dejar de procrastinar')
    expect(youtube[0].detalle).toBe('Canal Motivacional')

    const locations = report.entities.filter((e) => e.tipo === 'location')
    expect(locations).toHaveLength(2)
    expect(locations[0].lat).toBeCloseTo(-33.4489)
    expect(locations[0].lng).toBeCloseTo(-70.6693)
    expect(locations[1].titulo).toBe('WALKING')
  })

  it('parses an English takeout including Records.json', async () => {
    const report = await adapter.parse([path.join(fixtures, 'takeout-en.zip')])
    expect(report.source).toBe('google')

    const searches = report.entities.filter((e) => e.tipo === 'search')
    expect(searches.map((s) => s.titulo)).toContain('divorce lawyer near me')

    const locations = report.entities.filter((e) => e.tipo === 'location')
    expect(locations).toHaveLength(3)
    expect(locations[0].timestamp).toBe('2024-01-15T11:00:00.000Z')
    expect(locations[0].lat).toBeCloseTo(-33.4489)
  })

  it('combines multiple zips from a folder', async () => {
    const report = await adapter.parse([path.join(fixtures, 'takeout-multi')])
    expect(report.source).toBe('google')
    expect(report.entities.filter((e) => e.tipo === 'search')).toHaveLength(2)
    expect(report.entities.filter((e) => e.tipo === 'location')).toHaveLength(3)
  })

  it('combines multiple explicit zip paths', async () => {
    const report = await adapter.parse([
      path.join(fixtures, 'takeout-multi', 'takeout-002.zip'),
      path.join(fixtures, 'takeout-multi', 'takeout-001.zip')
    ])
    expect(report.source).toBe('google')
    expect(report.entities).toHaveLength(5)
  })

  it('never throws on a broken takeout and reports coverage', async () => {
    const report = await adapter.parse([path.join(fixtures, 'broken.zip')])
    expect(report.source).toBe('unknown')
    expect(report.entities).toHaveLength(0)
    expect(report.coverage.skipped.length).toBeGreaterThanOrEqual(2)
    const reasons = report.coverage.skipped.map((s) => s.reason)
    expect(reasons).toContain('parse-error')
    expect(reasons).toContain('unknown-format')
  })

  it('reports unknown source for non-takeout zips', async () => {
    const report = await adapter.parse([path.join(fixtures, 'not-a-takeout.zip')])
    expect(report.source).toBe('unknown')
    expect(report.entities).toHaveLength(0)
    expect(report.filesScanned).toBeGreaterThan(0)
  })

  it('handles nonexistent paths without throwing', async () => {
    const report = await adapter.parse(['/does/not/exist.zip'])
    expect(report.source).toBe('unknown')
    expect(report.entities).toHaveLength(0)
  })

  describe('big files (streaming)', () => {
    const tmpFiles: string[] = []

    afterAll(async () => {
      for (const f of tmpFiles) await fs.rm(f, { force: true })
    })

    it('streams a Records.json larger than the buffer threshold', async () => {
      const perChunk: string[] = []
      const target = BIG_FILE_THRESHOLD + 1024 * 1024
      let size = 10
      let count = 0
      while (size < target) {
        const entry = `{"timestampMs":"1705316400000","latitudeE7":-334489000,"longitudeE7":-706693000,"accuracy":100},`
        perChunk.push(entry)
        size += entry.length
        count++
      }
      const json = `{"locations":[${perChunk.join('').slice(0, -1)}]}`

      const zipPath = path.join(os.tmpdir(), `they-know-big-${Date.now()}.zip`)
      tmpFiles.push(zipPath)
      await new Promise<void>((resolve, reject) => {
        const zip = new ZipFile()
        zip.addBuffer(Buffer.from(json, 'utf8'), 'Takeout/Location History/Records.json')
        zip.end()
        const chunks: Buffer[] = []
        zip.outputStream.on('data', (c: Buffer) => chunks.push(c))
        zip.outputStream.on('end', async () => {
          await fs.writeFile(zipPath, Buffer.concat(chunks))
          resolve()
        })
        zip.outputStream.on('error', reject)
      })

      const report = await adapter.parse([zipPath])
      expect(report.source).toBe('google')
      const locations = report.entities.filter((e) => e.tipo === 'location')
      expect(locations).toHaveLength(count)
      const parsed = report.coverage.parsed.find((p) => p.kind === 'location-records')
      expect(parsed?.records).toBe(count)
    })
  })
})
