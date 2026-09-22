import type { Readable } from 'node:stream'
import { parser } from 'stream-json'
import { pick } from 'stream-json/filters/Pick'
import { streamArray } from 'stream-json/streamers/StreamArray'

export function readHead(streamFactory: () => Readable, bytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = streamFactory()
    const chunks: Buffer[] = []
    let total = 0
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      total += chunk.length
      if (total >= bytes) {
        stream.destroy()
        resolve(Buffer.concat(chunks).toString('utf8', 0, bytes))
      }
    })
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    stream.on('error', reject)
  })
}

export function streamRootArray(
  source: Readable,
  onItem: (item: unknown) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pipeline = source.pipe(parser()).pipe(streamArray())
    pipeline.on('data', ({ value }: { value: unknown }) => onItem(value))
    pipeline.on('end', resolve)
    pipeline.on('error', reject)
  })
}

export function streamObjectKeyArray(
  source: Readable,
  key: string,
  onItem: (item: unknown) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pipeline = source.pipe(parser()).pipe(pick({ filter: key })).pipe(streamArray())
    pipeline.on('data', ({ value }: { value: unknown }) => onItem(value))
    pipeline.on('end', resolve)
    pipeline.on('error', reject)
  })
}
