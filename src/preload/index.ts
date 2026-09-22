import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type TheyKnowApi } from '../shared/ipc'
import type { ChecklistState, DossierSnapshot } from '../shared/types'

const api: TheyKnowApi = {
  selectExportPath: (title?: string) => ipcRenderer.invoke(IPC.selectExportPath, title),
  parseExport: (paths: string[]) => ipcRenderer.invoke(IPC.parseExport, paths),
  loadStored: () => ipcRenderer.invoke(IPC.loadStored),
  saveSnapshot: (snapshot: DossierSnapshot) => ipcRenderer.invoke(IPC.saveSnapshot, snapshot),
  saveChecklist: (checklist: ChecklistState) => ipcRenderer.invoke(IPC.saveChecklist, checklist),
  clearAll: () => ipcRenderer.invoke(IPC.clearAll),
  openDeepLink: (url: string) => ipcRenderer.invoke(IPC.openDeepLink, url)
}

contextBridge.exposeInMainWorld('api', api)
