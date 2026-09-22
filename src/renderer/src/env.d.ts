/// <reference types="vite/client" />
import type { TheyKnowApi } from '../../shared/ipc'

declare global {
  interface Window {
    api: TheyKnowApi
  }
}

export {}
