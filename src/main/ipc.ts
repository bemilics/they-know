import { dialog, ipcMain, shell } from 'electron'
import { IPC, type SelectExportPathOptions } from '../shared/ipc'
import { isAllowedDeepLink } from '../shared/cleanup'
import type { ChecklistState, DossierSnapshot } from '../shared/types'
import { parseExport } from '../parsers'
import { getStore } from './persistence'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

export function registerIpc(): void {
  ipcMain.handle(IPC.selectExportPath, async (_event, options?: SelectExportPathOptions) => {
    const mode = options?.mode === 'folder' ? 'folder' : 'files'
    const result = await dialog.showOpenDialog({
      title: typeof options?.title === 'string' ? options.title : undefined,
      properties: mode === 'folder' ? ['openDirectory'] : ['openFile', 'multiSelections'],
      filters: mode === 'files' ? [{ name: 'ZIP', extensions: ['zip'] }] : undefined
    })
    return { canceled: result.canceled, paths: result.filePaths }
  })

  ipcMain.handle(IPC.parseExport, (_event, paths: unknown) => {
    if (!isStringArray(paths) || paths.length === 0) {
      return Promise.reject(new Error('invalid paths'))
    }
    return parseExport(paths)
  })

  ipcMain.handle(IPC.loadStored, () => getStore().load())

  ipcMain.handle(IPC.saveSnapshot, (_event, snapshot: DossierSnapshot) =>
    getStore().saveSnapshot(snapshot)
  )

  ipcMain.handle(IPC.saveChecklist, (_event, checklist: ChecklistState) =>
    getStore().saveChecklist(checklist)
  )

  ipcMain.handle(IPC.clearAll, () => getStore().clear())

  ipcMain.handle(IPC.openDeepLink, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !isAllowedDeepLink(url)) return false
    await shell.openExternal(url)
    return true
  })
}
