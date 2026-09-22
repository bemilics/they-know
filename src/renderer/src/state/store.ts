import { create } from 'zustand'
import { toggleChecklistItem } from '../../../shared/checklistState'
import type {
  ChecklistState,
  DossierSnapshot,
  ParseReport
} from '../../../shared/types'

export type Phase = 'welcome' | 'guide' | 'import' | 'dashboard'
export type CleanupSection = 'location' | 'search' | 'youtube' | 'ads' | 'models'

interface AppState {
  hydrated: boolean
  phase: Phase
  snapshot: DossierSnapshot | null
  checklist: ChecklistState
  importReport: ParseReport | null
  importFailed: boolean
  importing: boolean
  cleanupSection: CleanupSection | null

  hydrate(): Promise<void>
  setPhase(phase: Phase): void
  startImport(): Promise<void>
  confirmImport(): Promise<void>
  retryImport(): void
  toggleCleanup(id: string): Promise<void>
  openCleanup(section: CleanupSection): void
  closeCleanup(): void
  resetAll(): Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  phase: 'welcome',
  snapshot: null,
  checklist: {},
  importReport: null,
  importFailed: false,
  importing: false,
  cleanupSection: null,

  async hydrate() {
    const stored = await window.api.loadStored()
    set({
      hydrated: true,
      snapshot: stored.snapshot,
      checklist: stored.checklist,
      phase: stored.snapshot ? 'dashboard' : 'welcome'
    })
  },

  setPhase(phase) {
    set({ phase, importFailed: false })
  },

  async startImport() {
    const selected = await window.api.selectExportPath()
    if (selected.canceled || selected.paths.length === 0) return
    set({ importing: true, importFailed: false, importReport: null })
    try {
      const report = await window.api.parseExport(selected.paths)
      if (report.source === 'unknown') {
        set({ importing: false, importFailed: true })
      } else {
        set({ importing: false, importReport: report })
      }
    } catch {
      set({ importing: false, importFailed: true })
    }
  },

  async confirmImport() {
    const report = get().importReport
    if (!report) return
    const snapshot: DossierSnapshot = {
      version: 1,
      source: report.source,
      createdAt: new Date().toISOString(),
      entities: report.entities,
      coverage: report.coverage
    }
    await window.api.saveSnapshot(snapshot)
    set({ snapshot, importReport: null, phase: 'dashboard' })
  },

  retryImport() {
    set({ importFailed: false, importReport: null })
  },

  async toggleCleanup(id) {
    const checklist = toggleChecklistItem(get().checklist, id)
    set({ checklist })
    await window.api.saveChecklist(checklist)
  },

  openCleanup(section) {
    set({ cleanupSection: section })
  },

  closeCleanup() {
    set({ cleanupSection: null })
  },

  async resetAll() {
    await window.api.clearAll()
    set({
      snapshot: null,
      checklist: {},
      importReport: null,
      importFailed: false,
      cleanupSection: null,
      phase: 'welcome'
    })
  }
}))
