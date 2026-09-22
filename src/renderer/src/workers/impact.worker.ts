import type { NormalizedEntity } from '../../../shared/types'
import type {
  ImpactConfig,
  ImpactProgress,
  ImpactResult
} from '../../../impact/types'
import { runImpact } from '../../../impact/cards/generator'

export type ImpactWorkerRequest =
  | { type: 'run'; id: number; entities: NormalizedEntity[]; config: ImpactConfig }

export type ImpactWorkerResponse =
  | { type: 'progress'; id: number; progress: ImpactProgress }
  | { type: 'done'; id: number; result: ImpactResult }
  | { type: 'error'; id: number; message: string }

const ctx = self as unknown as {
  onmessage: ((ev: MessageEvent<ImpactWorkerRequest>) => void) | null
}

ctx.onmessage = (ev: MessageEvent<ImpactWorkerRequest>) => {
  const msg = ev.data
  if (msg.type !== 'run') return
  try {
    const result = runImpact(msg.entities, msg.config, (progress) => {
      const res: ImpactWorkerResponse = { type: 'progress', id: msg.id, progress }
      ;(self as unknown as Worker).postMessage(res)
    })
    const done: ImpactWorkerResponse = { type: 'done', id: msg.id, result }
    ;(self as unknown as Worker).postMessage(done)
  } catch (err) {
    const error: ImpactWorkerResponse = {
      type: 'error',
      id: msg.id,
      message: err instanceof Error ? err.message : String(err)
    }
    ;(self as unknown as Worker).postMessage(error)
  }
}
