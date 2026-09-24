import type { Readable } from 'node:stream'
import type {
  CoverageReport,
  NormalizedEntity,
  ParseReport,
  SkipReason
} from '../../shared/types'
import { classifyJsonText, classifyJsonValue, classifyMyActivityItem, isEmptyJson } from '../detect'
import { looksLikeActivityHtml, parseActivityHtmlStream } from '../htmlActivity'
import { readHead, streamObjectKeyArray, streamRootArray } from '../jsonStream'
import {
  ACTIVITY_HTML_SNIFF_BYTES,
  BIG_FILE_THRESHOLD,
  HEAD_SNIFF_BYTES,
  type SectionKind
} from '../types'
import { openZipEntries, resolveZipPaths } from '../zipStream'
import { parseLocationRecordItem, parseSemanticLocationItem } from './locations'
import { parseMapsReviewFeature } from './mapsReviews'
import { parsePlayStoreItem } from './playStore'
import { parseSearchItem } from './searchHistory'
import { parseYoutubeItem } from './youtubeHistory'

export class GoogleTakeoutAdapter {
  async parse(inputs: string[]): Promise<ParseReport> {
    const zipPaths = await resolveZipPaths(inputs)
    const entities: NormalizedEntity[] = []
    const coverage: CoverageReport = { parsed: [], skipped: [] }
    // Compras vistas (timestamp): Order History y Purchase History se solapan.
    const seenPurchases = new Set<string>()
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
        const lower = entry.path.toLowerCase()
        const io = {
          buffer: () => entry.buffer(),
          stream: () => entry.stream()
        }
        try {
          if (lower.endsWith('.json')) {
            await this.parseEntry(
              entry.path,
              entry.uncompressedSize,
              io,
              entities,
              coverage,
              seenPurchases
            )
          } else if (lower.endsWith('.html')) {
            await this.parseHtmlEntry(entry.path, io, entities, coverage, seenPurchases)
          }
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
    coverage: CoverageReport,
    seenPurchases: Set<string>
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
        if (entity && this.pushEntity(entities, seenPurchases, entity)) {
          records++
        }
      }
      if (kind === 'location-records') {
        await streamObjectKeyArray(io.stream(), 'locations', onItem)
      } else if (kind === 'maps-reviews') {
        await streamObjectKeyArray(io.stream(), 'features', onItem)
      } else {
        await streamRootArray(io.stream(), onItem)
      }
      coverage.parsed.push({ path, kind, records })
      return
    }

    const buffer = await io.buffer()
    const text = buffer.toString('utf8').trim()
    if (text === '') {
      this.skip(coverage, path, 'empty')
      return
    }
    const json: unknown = JSON.parse(text)
    kind = classifyJsonValue(json)
    if (!kind) {
      this.skip(coverage, path, isEmptyJson(json) ? 'empty' : 'unknown-format')
      return
    }

    let records = 0
    const items =
      kind === 'location-records'
        ? (json as { locations?: unknown[] }).locations
        : kind === 'maps-reviews'
          ? (json as { features?: unknown[] }).features
          : json
    if (!Array.isArray(items)) {
      this.skip(coverage, path, 'unknown-format')
      return
    }
    for (const item of items) {
      const entity = this.itemToEntity(kind, item)
      if (entity && this.pushEntity(entities, seenPurchases, entity)) {
        records++
      }
    }
    coverage.parsed.push({ path, kind, records })
  }

  private async parseHtmlEntry(
    path: string,
    io: { stream: () => Readable },
    entities: NormalizedEntity[],
    coverage: CoverageReport,
    seenPurchases: Set<string>
  ): Promise<void> {
    const head = await readHead(io.stream, ACTIVITY_HTML_SNIFF_BYTES)
    if (!looksLikeActivityHtml(head)) return
    let records = 0
    await parseActivityHtmlStream(io.stream(), (entity) => {
      if (this.pushEntity(entities, seenPurchases, entity)) records++
    })
    coverage.parsed.push({ path, kind: 'activity-html', records })
  }

  /**
   * Guarda la entidad; devuelve false si es una compra JSON ya vista
   * (mismo timestamp). Order History y Purchase History registran el mismo
   * evento. Solo aplica a JSON con `detalle`: los eventos HTML de actividad
   * tienen precisión de segundo (.000) y colisionarían entre sí.
   */
  private pushEntity(
    entities: NormalizedEntity[],
    seenPurchases: Set<string>,
    entity: NormalizedEntity
  ): boolean {
    if (entity.tipo === 'purchase' && entity.detalle !== undefined) {
      if (seenPurchases.has(entity.timestamp)) return false
      seenPurchases.add(entity.timestamp)
    }
    entities.push(entity)
    return true
  }

  private itemToEntity(kind: SectionKind, item: unknown): NormalizedEntity | null {
    if (item === null || typeof item !== 'object') return null
    const rec = item as Record<string, unknown>
    switch (kind) {
      case 'semantic-location':
        return parseSemanticLocationItem(item)
      case 'location-records':
        return parseLocationRecordItem(item)
      case 'maps-reviews':
        return parseMapsReviewFeature(item)
      case 'play-store':
        return parsePlayStoreItem(item)
      case 'my-activity': {
        const section = classifyMyActivityItem(rec)
        if (section === 'search') return parseSearchItem(rec)
        if (section === 'youtube') return parseYoutubeItem(rec)
        return null
      }
      case 'activity-html':
        return null
    }
  }

  private skip(coverage: CoverageReport, path: string, reason: SkipReason): void {
    coverage.skipped.push({ path, reason })
  }
}
