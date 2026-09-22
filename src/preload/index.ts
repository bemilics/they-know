import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type SelectExportPathOptions, type TheyKnowApi } from '../shared/ipc'
import type { AppSettings, ChecklistState, DossierSnapshot } from '../shared/types'

const api: TheyKnowApi = {
  selectExportPath: (options?: SelectExportPathOptions) =>
    ipcRenderer.invoke(IPC.selectExportPath, options),
  parseExport: (paths: string[]) => ipcRenderer.invoke(IPC.parseExport, paths),
  loadStored: () => ipcRenderer.invoke(IPC.loadStored),
  saveSnapshot: (snapshot: DossierSnapshot) => ipcRenderer.invoke(IPC.saveSnapshot, snapshot),
  saveChecklist: (checklist: ChecklistState) => ipcRenderer.invoke(IPC.saveChecklist, checklist),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke(IPC.saveSettings, settings),
  clearAll: () => ipcRenderer.invoke(IPC.clearAll),
  openDeepLink: (url: string) => ipcRenderer.invoke(IPC.openDeepLink, url)
}

contextBridge.exposeInMainWorld('api', api)
