import type { ParseReport } from '../shared/types'
import { GoogleTakeoutAdapter } from './google/GoogleTakeoutAdapter'

export async function parseExport(paths: string[]): Promise<ParseReport> {
  const google = new GoogleTakeoutAdapter()
  return google.parse(paths)
}

export { GoogleTakeoutAdapter }
