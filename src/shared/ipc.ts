import type { ChecklistState, DossierSnapshot, ParseReport, StoredData } from './types'

export const IPC = {
  selectExportPath: 'tk:select-export-path',
  parseExport: 'tk:parse-export',
  loadStored: 'tk:load-stored',
  saveSnapshot: 'tk:save-snapshot',
  saveChecklist: 'tk:save-checklist',
  clearAll: 'tk:clear-all',
  openDeepLink: 'tk:open-deep-link'
} as const

export interface SelectExportPathResult {
  canceled: boolean
  paths: string[]
}

export interface TheyKnowApi {
  selectExportPath(title?: string): Promise<SelectExportPathResult>
  parseExport(paths: string[]): Promise<ParseReport>
  loadStored(): Promise<StoredData>
  saveSnapshot(snapshot: DossierSnapshot): Promise<void>
  saveChecklist(checklist: ChecklistState): Promise<void>
  clearAll(): Promise<void>
  openDeepLink(url: string): Promise<boolean>
}
