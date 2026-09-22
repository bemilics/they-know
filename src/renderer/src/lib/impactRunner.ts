import type { NormalizedEntity } from '../../../shared/types'
import type {
  ImpactConfig,
  ImpactProgress,
  ImpactResult
} from '../../../impact/types'
import type {
  ImpactWorkerRequest,
  ImpactWorkerResponse
} from '../workers/impact.worker'

export interface RunImpactOptions {
  entities: NormalizedEntity[]
  config: ImpactConfig
  onProgress?: (p: ImpactProgress) => void
}

/**
 * Ejecuta el motor en un WebWorker. Fallback a síncrono si Worker no está disponible.
 */
export function runImpactAsync(opts: RunImpactOptions): Promise<ImpactResult> {
  if (typeof Worker === 'undefined') {
    return import('../../../impact/cards/generator').then(({ runImpact }) =>
      runImpact(opts.entities, opts.config, opts.onProgress)
    )
  }

  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('../workers/impact.worker.ts', import.meta.url), {
        type: 'module'
      })
    } catch {
      return import('../../../impact/cards/generator')
        .then(({ runImpact }) => resolve(runImpact(opts.entities, opts.config, opts.onProgress)))
        .catch(reject)
    }

    const id = Date.now()
    const onMessage = (ev: MessageEvent<ImpactWorkerResponse>): void => {
      const msg = ev.data
      if (msg.id !== id) return
      if (msg.type === 'progress') {
        opts.onProgress?.(msg.progress)
      } else if (msg.type === 'done') {
        cleanup()
        resolve(msg.result)
      } else if (msg.type === 'error') {
        cleanup()
        reject(new Error(msg.message))
      }
    }
    const onError = (err: ErrorEvent): void => {
      cleanup()
      reject(new Error(err.message || 'worker error'))
    }
    const cleanup = (): void => {
      worker.removeEventListener('message', onMessage as EventListener)
      worker.removeEventListener('error', onError as EventListener)
      worker.terminate()
    }
    worker.addEventListener('message', onMessage as EventListener)
    worker.addEventListener('error', onError as EventListener)
    const req: ImpactWorkerRequest = {
      type: 'run',
      id,
      entities: opts.entities,
      config: opts.config
    }
    worker.postMessage(req)
  })
}
