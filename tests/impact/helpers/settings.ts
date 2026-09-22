import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AppSettings } from '../../../src/shared/types'

/**
 * Simula el ciclo de settings.json del FileStore (escritura atómica + lectura).
 */
export async function storeSettingsRoundtrip(settings: AppSettings): Promise<AppSettings> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tk-settings-'))
  const file = path.join(dir, 'settings.json')
  const tmp = path.join(dir, 'settings.json.tmp')
  await fs.writeFile(tmp, JSON.stringify(settings, null, 2), 'utf8')
  await fs.rename(tmp, file)
  const raw = JSON.parse(await fs.readFile(file, 'utf8')) as AppSettings
  await fs.rm(dir, { recursive: true, force: true })
  return raw
}
