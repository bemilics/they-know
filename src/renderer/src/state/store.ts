import { create } from 'zustand'
import { toggleChecklistItem } from '../../../shared/checklistState'
import type {
  ChecklistState,
  DossierSnapshot,
  ParseReport
} from '../../../shared/types'
import type { Card, ImpactProgress, ImpactResult } from '../../../impact/types'
import { detectTimezone } from '../../../impact/time'
import { runImpactAsync } from '../lib/impactRunner'

export type Phase = 'welcome' | 'guide' | 'import' | 'dashboard' | 'confessional'
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
  timezone: string

  impactCards: Card[] | null
  impactRunning: boolean
  impactProgress: ImpactProgress | null
  impactError: boolean
  confessionalIndex: number
  confessionalRevealed: number
  confessionalDone: boolean

  hydrate(): Promise<void>
  setPhase(phase: Phase): void
  setTimezone(tz: string): Promise<void>
  startImport(mode: 'files' | 'folder'): Promise<void>
  confirmImport(): Promise<void>
  retryImport(): void
  toggleCleanup(id: string): Promise<void>
  openCleanup(section: CleanupSection): void
  closeCleanup(): void
  resetAll(): Promise<void>
  openConfessional(): Promise<void>
  closeConfessional(): void
  advanceConfessional(): void
  revealNext(): void
  resetConfessional(): void
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
  timezone: detectTimezone(),

  impactCards: null,
  impactRunning: false,
  impactProgress: null,
  impactError: false,
  confessionalIndex: 0,
  confessionalRevealed: 0,
  confessionalDone: false,

  async hydrate() {
    const stored = await window.api.loadStored()
    set({
      hydrated: true,
      snapshot: stored.snapshot,
      checklist: stored.checklist,
      timezone: stored.settings?.timezone || detectTimezone(),
      phase: stored.snapshot ? 'dashboard' : 'welcome'
    })
  },

  setPhase(phase) {
    set({ phase, importFailed: false })
  },

  async setTimezone(tz) {
    set({ timezone: tz })
    try {
      await window.api.saveSettings({ timezone: tz })
    } catch {
      // no bloquear
    }
  },

  async startImport(mode) {
    const selected = await window.api.selectExportPath({ mode })
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
      impactCards: null,
      impactRunning: false,
      impactProgress: null,
      impactError: false,
      confessionalIndex: 0,
      confessionalRevealed: 0,
      confessionalDone: false,
      phase: 'welcome'
    })
  },

  async openConfessional() {
    const { snapshot, timezone, impactCards, impactRunning } = get()
    if (!snapshot) return
    set({
      phase: 'confessional',
      confessionalIndex: 0,
      confessionalRevealed: 0,
      confessionalDone: false
    })
    if (impactCards || impactRunning) return
    set({ impactRunning: true, impactError: false, impactProgress: null })
    try {
      const result: ImpactResult = await runImpactAsync({
        entities: snapshot.entities,
        config: { timezone, lexiconVersion: 'v1', now: Date.now() },
        onProgress: (p) => set({ impactProgress: p })
      })
      set({
        impactCards: result.cards,
        impactRunning: false,
        confessionalIndex: 0,
        confessionalRevealed: 0
      })
    } catch {
      set({ impactRunning: false, impactError: true })
    }
  },

  closeConfessional() {
    set({ phase: 'dashboard' })
  },

  advanceConfessional() {
    const cards = get().impactCards
    if (!cards) return
    const idx = get().confessionalIndex
    if (idx + 1 >= cards.length) {
      set({ confessionalDone: true })
      return
    }
    set({ confessionalIndex: idx + 1, confessionalRevealed: 0 })
  },

  revealNext() {
    const cards = get().impactCards
    if (!cards) return
    const card = cards[get().confessionalIndex]
    if (!card) return
    const revealed = get().confessionalRevealed
    if (revealed >= card.reveal_steps.length) {
      get().advanceConfessional()
      return
    }
    set({ confessionalRevealed: revealed + 1 })
  },

  resetConfessional() {
    set({ confessionalIndex: 0, confessionalRevealed: 0, confessionalDone: false })
  }
}))
