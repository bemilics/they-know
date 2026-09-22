import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FileStore } from '../../src/main/store'
import { isChecklistItemDone, toggleChecklistItem } from '../../src/shared/checklistState'
import type { DossierSnapshot } from '../../src/shared/types'

const tmpDirs: string[] = []

async function makeDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'they-know-test-'))
  tmpDirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

describe('checklist state', () => {
  it('marks an item done with a date', () => {
    const state = toggleChecklistItem({}, 'google.location.delete', '2026-09-21T00:00:00.000Z')
    expect(state['google.location.delete']).toEqual({
      status: 'done',
      doneAt: '2026-09-21T00:00:00.000Z'
    })
    expect(isChecklistItemDone(state, 'google.location.delete')).toBe(true)
  })

  it('toggles back to pending and clears the date', () => {
    const done = toggleChecklistItem({}, 'a', '2026-09-21T00:00:00.000Z')
    const back = toggleChecklistItem(done, 'a')
    expect(back['a']).toEqual({ status: 'pending', doneAt: null })
    expect(isChecklistItemDone(back, 'a')).toBe(false)
  })

  it('does not mutate the previous state', () => {
    const before = {}
    const after = toggleChecklistItem(before, 'a')
    expect(before).toEqual({})
    expect(after).not.toBe(before)
  })
})

describe('FileStore', () => {
  const snapshot: DossierSnapshot = {
    version: 1,
    source: 'google',
    createdAt: '2026-09-21T00:00:00.000Z',
    entities: [{ tipo: 'search', timestamp: '2024-01-01T00:00:00.000Z', titulo: 'hola' }],
    coverage: { parsed: [], skipped: [] }
  }

  it('returns empty defaults when nothing is stored', async () => {
    const store = new FileStore(await makeDir())
    const stored = await store.load()
    expect(stored.snapshot).toBeNull()
    expect(stored.checklist).toEqual({})
  })

  it('roundtrips snapshot and checklist', async () => {
    const store = new FileStore(await makeDir())
    await store.saveSnapshot(snapshot)
    await store.saveChecklist({ a: { status: 'done', doneAt: '2026-09-21T00:00:00.000Z' } })
    const stored = await store.load()
    expect(stored.snapshot).toEqual(snapshot)
    expect(stored.checklist['a'].status).toBe('done')
  })

  it('survives corrupted files without throwing', async () => {
    const dir = await makeDir()
    await fs.writeFile(path.join(dir, 'snapshot.json'), '### broken ###')
    await fs.writeFile(path.join(dir, 'checklist.json'), '{"a":{"status":"maybe"}}')
    const store = new FileStore(dir)
    const stored = await store.load()
    expect(stored.snapshot).toBeNull()
    expect(stored.checklist).toEqual({})
  })

  it('clear removes stored data', async () => {
    const store = new FileStore(await makeDir())
    await store.saveSnapshot(snapshot)
    await store.clear()
    const stored = await store.load()
    expect(stored.snapshot).toBeNull()
  })
})
