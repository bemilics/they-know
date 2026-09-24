import type { NormalizedEntity } from '../../shared/types'
import { parseTimestamp } from '../normalize'

type RawItem = Record<string, unknown>

function asRecord(value: unknown): RawItem | null {
  return value !== null && typeof value === 'object' ? (value as RawItem) : null
}

function docTitle(rec: RawItem | null): string {
  const doc = rec ? asRecord(rec.doc) : null
  return doc && typeof doc.title === 'string' ? doc.title : ''
}

function docType(rec: RawItem | null): string {
  const doc = rec ? asRecord(rec.doc) : null
  return doc && typeof doc.documentType === 'string' ? doc.documentType : ''
}

function str(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : ''
}

/**
 * Parsea los JSON con envoltorio único de Google Play Store:
 * `install`, `libraryDoc`, `purchaseHistory`, `subscription` (datos), y
 * `device`/`userSetting` (config sin historia → null).
 *
 * `detalle` lleva un prefijo de tipo wrapper para que las cartas de impacto
 * puedan distinguir compras, suscripciones e instalaciones.
 */
export function parsePlayStoreItem(item: unknown): NormalizedEntity | null {
  const rec = asRecord(item)
  if (!rec) return null

  const install = asRecord(rec.install)
  if (install) {
    const timestamp = parseTimestamp(install.firstInstallationTime)
    const titulo = docTitle(install)
    if (!timestamp || !titulo) return null
    const device = str(install.deviceDisplayName) || str(asRecord(install.deviceAttribute)?.deviceDisplayName)
    return {
      tipo: 'app',
      timestamp,
      titulo,
      product: 'play-store',
      detalle: `install${device ? ` · ${device}` : ''}`
    }
  }

  const libraryDoc = asRecord(rec.libraryDoc)
  if (libraryDoc) {
    const timestamp = parseTimestamp(libraryDoc.acquisitionTime)
    const titulo = docTitle(libraryDoc)
    if (!timestamp || !titulo) return null
    const docTypeValue = docType(libraryDoc)
    if (docTypeValue === 'Subscription') {
      return {
        tipo: 'purchase',
        timestamp,
        titulo,
        product: 'play-store',
        detalle: 'subscription · library'
      }
    }
    return {
      tipo: 'app',
      timestamp,
      titulo,
      product: 'play-store',
      detalle: `library${docTypeValue ? ` · ${docTypeValue}` : ''}`
    }
  }

  const purchase = asRecord(rec.purchaseHistory)
  if (purchase) {
    const timestamp = parseTimestamp(purchase.purchaseTime)
    const titulo = docTitle(purchase)
    if (!timestamp || !titulo) return null
    const parts = ['purchase']
    if (str(purchase.invoicePrice)) parts.push(purchase.invoicePrice as string)
    if (str(purchase.paymentMethodTitle)) parts.push(purchase.paymentMethodTitle as string)
    return {
      tipo: 'purchase',
      timestamp,
      titulo,
      product: 'play-store',
      detalle: parts.join(' · ')
    }
  }

  // Order History: órdenes de Google/Play (incluye Google One, hardware, GPA).
  // Las GPA se solapan con purchaseHistory: el adapter deduplica por timestamp.
  const order = asRecord(rec.orderHistory)
  if (order) {
    const timestamp = parseTimestamp(order.creationTime)
    if (!timestamp) return null
    const lineItems = Array.isArray(order.lineItem) ? order.lineItem : []
    let titulo = ''
    for (const li of lineItems) {
      const item = asRecord(li)
      const t = item ? docTitle(item) : ''
      if (t) {
        titulo = t
        break
      }
    }
    if (!titulo) return null
    const parts = ['order']
    if (str(order.totalPrice)) parts.push(order.totalPrice as string)
    const billing = asRecord(order.billingInstrument)
    if (billing && str(billing.displayName)) parts.push(billing.displayName as string)
    return {
      tipo: 'purchase',
      timestamp,
      titulo,
      product: 'play-store',
      detalle: parts.join(' · ')
    }
  }

  const subscription = asRecord(rec.subscription)
  if (subscription) {
    const titulo = docTitle(subscription)
    if (!titulo) return null
    const changes = Array.isArray(subscription.userChangeRecord)
      ? subscription.userChangeRecord
      : []
    let timestamp: string | null = null
    let state = ''
    for (const change of changes) {
      const c = asRecord(change)
      if (!c) continue
      const ts = parseTimestamp(c.date)
      if (ts && (timestamp === null || Date.parse(ts) > Date.parse(timestamp))) {
        timestamp = ts
        // el estado que importa es el del cambio más reciente
        state = typeof c.type === 'string' ? c.type : ''
      }
    }
    if (!timestamp) return null
    const pricing = Array.isArray(subscription.pricing)
      ? asRecord(subscription.pricing[0])
      : null
    const price = str(pricing?.price)
    const unit = pricing && asRecord(pricing.period) ? str(asRecord(pricing.period)?.unit) : ''
    const subState = str(subscription.state) || state
    const parts = ['subscription']
    if (price) parts.push(unit ? `${price}/${unit}` : price)
    if (subState) parts.push(subState)
    return {
      tipo: 'purchase',
      timestamp,
      titulo,
      product: 'play-store',
      detalle: parts.join(' · ')
    }
  }

  // device / userSetting: configuración, sin historia que contar.
  return null
}
