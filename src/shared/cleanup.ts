import type { EntityType } from './types'

export type CleanupLevel = 'delete-visible' | 'disable-collection' | 'derived-models'

export interface CleanupAction {
  id: string
  section: EntityType | 'ads' | 'models'
  level: CleanupLevel
  deepLink: string
  i18nKey: string
}

export const CLEANUP_ACTIONS: CleanupAction[] = [
  {
    id: 'google.location.delete',
    section: 'location',
    level: 'delete-visible',
    deepLink: 'https://timeline.google.com/',
    i18nKey: 'google.location.delete'
  },
  {
    id: 'google.location.disable',
    section: 'location',
    level: 'disable-collection',
    deepLink: 'https://myaccount.google.com/activitycontrols',
    i18nKey: 'google.location.disable'
  },
  {
    id: 'google.search.delete',
    section: 'search',
    level: 'delete-visible',
    deepLink: 'https://myactivity.google.com/myactivity',
    i18nKey: 'google.search.delete'
  },
  {
    id: 'google.search.disable',
    section: 'search',
    level: 'disable-collection',
    deepLink: 'https://myaccount.google.com/activitycontrols',
    i18nKey: 'google.search.disable'
  },
  {
    id: 'google.youtube.delete',
    section: 'youtube',
    level: 'delete-visible',
    deepLink: 'https://www.youtube.com/feed/history',
    i18nKey: 'google.youtube.delete'
  },
  {
    id: 'google.youtube.disable',
    section: 'youtube',
    level: 'disable-collection',
    deepLink: 'https://myaccount.google.com/activitycontrols',
    i18nKey: 'google.youtube.disable'
  },
  {
    id: 'google.ads.disable',
    section: 'ads',
    level: 'disable-collection',
    deepLink: 'https://myadcenter.google.com/customization',
    i18nKey: 'google.ads.disable'
  },
  {
    id: 'google.models.derived',
    section: 'models',
    level: 'derived-models',
    deepLink: 'https://myaccount.google.com/data-and-privacy',
    i18nKey: 'google.models.derived'
  }
]

const ALLOWED_HOSTS = ['google.com', 'youtube.com', 'meta.com', 'facebook.com', 'instagram.com']

export function isAllowedDeepLink(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    return ALLOWED_HOSTS.some(
      (host) => u.hostname === host || u.hostname.endsWith(`.${host}`)
    )
  } catch {
    return false
  }
}
