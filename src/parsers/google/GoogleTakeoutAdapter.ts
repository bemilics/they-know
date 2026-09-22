import type { Readable } from 'node:stream'
import type {
  CoverageReport,
  NormalizedEntity,
  ParseReport,
  SkipReason
} from '../../shared/types'
import { classifyJsonText, classifyJsonValue, classifyMyActivityItem } from '../detect'
import { readHead, streamObjectKeyArray, streamRootArray } from '../jsonStream'
import { BIG_FILE_THRESHOLD, HEAD_SNIFF_BYTES, type SectionKind } from '../types'
import { openZipEntries, resolveZipPaths } from '../zipStream'
import { parseLocationRecordItem, parseSemanticLocationItem } from './locations'
import { parseSearchItem } from './searchHistory'
import { parseYoutubeItem } from './youtubeHistory'

export class GoogleTakeoutAdapter {
  async parse(inputs: string[]): Promise<ParseReport> {
    const zipPaths = await resolveZipPaths(inputs)
    const entities: NormalizedEntity[] = []
    const coverage: CoverageReport = { parsed: [], skipped: [] }
    let filesScanned = 0

    for (const zipPath of zipPaths) {
      let entries
      try {
        entries = await openZipEntries(zipPath)
      } catch {
        coverage.skipped.push({ path: zipPath, reason: 'parse-error' })
        continue
      }

      for (const entry of entries) {
        filesScanned++
        if (!entry.path.toLowerCase().endsWith('.json')) continue
        try {
          await this.parseEntry(entry.path, entry.uncompressedSize, {
            buffer: () => entry.buffer(),
            stream: () => entry.stream()
          }, entities, coverage)
        } catch {
          coverage.skipped.push({ path: entry.path, reason: 'parse-error' })
        }
      }
    }

    return {
      source: coverage.parsed.length > 0 ? 'google' : 'unknown',
      entities,
      coverage,
      filesScanned
    }
  }

  private async parseEntry(
    path: string,
    size: number,
    io: { buffer: () => Promise<Buffer>; stream: () => Readable },
    entities: NormalizedEntity[],
    coverage: CoverageReport
  ): Promise<void> {
    let kind: SectionKind | null

    if (size > BIG_FILE_THRESHOLD) {
      const head = await readHead(io.stream, HEAD_SNIFF_BYTES)
      kind = classifyJsonText(head)
      if (!kind) {
        this.skip(coverage, path, 'unknown-format')
        return
      }
      let records = 0
      const onItem = (item: unknown): void => {
        const entity = this.itemToEntity(kind as SectionKind, item)
        if (entity) {
          entities.push(entity)
          records++
        }
      }
      if (kind === 'location-records') {
        await streamObjectKeyArray(io.stream(), 'locations', onItem)
      } else {
        await streamRootArray(io.stream(), onItem)
      }
      coverage.parsed.push({ path, kind, records })
      return
    }

    const buffer = await io.buffer()
    const json: unknown = JSON.parse(buffer.toString('utf8'))
    kind = classifyJsonValue(json)
    if (!kind) {
      this.skip(coverage, path, 'unknown-format')
      return
    }

    let records = 0
    const items = kind === 'location-records' ? (json as { locations?: unknown[] }).locations : json
    if (!Array.isArray(items)) {
      this.skip(coverage, path, 'unknown-format')
      return
    }
    for (const item of items) {
      const entity = this.itemToEntity(kind, item)
      if (entity) {
        entities.push(entity)
        records++
      }
    }
    coverage.parsed.push({ path, kind, records })
  }

  private itemToEntity(kind: SectionKind, item: unknown): NormalizedEntity | null {
    if (item === null || typeof item !== 'object') return null
    const rec = item as Record<string, unknown>
    switch (kind) {
      case 'semantic-location':
        return parseSemanticLocationItem(item)
      case 'location-records':
        return parseLocationRecordItem(item)
      case 'my-activity': {
        const section = classifyMyActivityItem(rec)
        if (section === 'search') return parseSearchItem(rec)
        if (section === 'youtube') return parseYoutubeItem(rec)
        return null
      }
    }
  }

  private skip(coverage: CoverageReport, path: string, reason: SkipReason): void {
    coverage.skipped.push({ path, reason })
  }
}
