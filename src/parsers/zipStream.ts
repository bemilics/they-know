import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Open } from 'unzipper'
import type { File as ZipEntry } from 'unzipper'

export async function resolveZipPaths(inputs: string[]): Promise<string[]> {
  const zips: string[] = []
  for (const input of inputs) {
    try {
      const stat = await fs.stat(input)
      if (stat.isDirectory()) {
        const names = await fs.readdir(input)
        for (const name of names) {
          if (name.toLowerCase().endsWith('.zip')) zips.push(path.join(input, name))
        }
      } else if (input.toLowerCase().endsWith('.zip')) {
        zips.push(input)
      }
    } catch {
      // unreadable path: ignore, coverage reports what was processed
    }
  }
  return zips.sort((a, b) => a.localeCompare(b))
}

export async function openZipEntries(zipPath: string): Promise<ZipEntry[]> {
  const dir = await Open.file(zipPath)
  return dir.files.filter((f) => f.type === 'File')
}
