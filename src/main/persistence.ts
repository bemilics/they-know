import { app } from 'electron'
import path from 'node:path'
import { FileStore } from './store'

export function getStore(): FileStore {
  return new FileStore(path.join(app.getPath('userData'), 'they-know-data'))
}
