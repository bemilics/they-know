import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { AppSettings, ChecklistState, DossierSnapshot, StoredData } from '../shared/types'

function isSnapshot(value: unknown): value is DossierSnapshot {
  if (value === null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.version === 1 && Array.isArray(v.entities) && typeof v.createdAt === 'string'
}

function isChecklist(value: unknown): value is ChecklistState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  for (const item of Object.values(value as Record<string, unknown>)) {
    if (item === null || typeof item !== 'object') return false
    const i = item as Record<string, unknown>
    if (i.status !== 'pending' && i.status !== 'done') return false
    if (i.doneAt !== null && typeof i.doneAt !== 'string') return false
  }
  return true
}

function isSettings(value: unknown): value is AppSettings {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  return typeof (value as AppSettings).timezone === 'string'
}

export class FileStore {
  constructor(private readonly dir: string) {}

  private file(name: string): string {
    return path.join(this.dir, name)
  }

  private async readJson(name: string): Promise<unknown> {
    try {
      return JSON.parse(await fs.readFile(this.file(name), 'utf8'))
    } catch {
      return null
    }
  }

  private async writeJson(name: string, data: unknown): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })
    const tmp = this.file(`${name}.tmp`)
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
    await fs.rename(tmp, this.file(name))
  }

  async load(): Promise<StoredData> {
    const snapshot = await this.readJson('snapshot.json')
    const checklist = await this.readJson('checklist.json')
    const settings = await this.readJson('settings.json')
    let tz = 'UTC'
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      tz = 'UTC'
    }
    return {
      snapshot: isSnapshot(snapshot) ? snapshot : null,
      checklist: isChecklist(checklist) ? checklist : {},
      settings: isSettings(settings) ? settings : { timezone: tz }
    }
  }

  async saveSnapshot(snapshot: DossierSnapshot): Promise<void> {
    await this.writeJson('snapshot.json', snapshot)
  }

  async saveChecklist(checklist: ChecklistState): Promise<void> {
    await this.writeJson('checklist.json', checklist)
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.writeJson('settings.json', settings)
  }

  async clear(): Promise<void> {
    await fs.rm(this.file('snapshot.json'), { force: true })
    await fs.rm(this.file('checklist.json'), { force: true })
    await fs.rm(this.file('settings.json'), { force: true })
  }
}
