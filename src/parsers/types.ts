export type SectionKind =
  | 'semantic-location'
  | 'location-records'
  | 'my-activity'
  | 'activity-html'
  | 'maps-reviews'
  | 'play-store'

export const BIG_FILE_THRESHOLD = 8 * 1024 * 1024
export const HEAD_SNIFF_BYTES = 16384
export const ACTIVITY_HTML_SNIFF_BYTES = 256 * 1024
