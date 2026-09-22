import { useTranslation } from 'react-i18next'
import type { Aggregates } from '../lib/aggregates'

export default function BigCounters({ agg }: { agg: Aggregates }): React.JSX.Element {
  const { t } = useTranslation('dashboard')
  return (
    <div className="big-counters">
      <div className="counter">
        <div className="number">{agg.locationDays.toLocaleString()}</div>
        <div className="label">{t('counters.locationDays')}</div>
        <div className="sub">
          {agg.locationPoints.toLocaleString()} {t('counters.locationPoints')}
        </div>
      </div>
      <div className="counter">
        <div className="number">{agg.counts.search.toLocaleString()}</div>
        <div className="label">{t('counters.searches')}</div>
        {agg.oldestYear ? (
          <div className="sub">{t('counters.searchesSince', { year: agg.oldestYear })}</div>
        ) : null}
      </div>
      <div className="counter">
        <div className="number">{agg.counts.youtube.toLocaleString()}</div>
        <div className="label">{t('counters.videos')}</div>
      </div>
    </div>
  )
}
