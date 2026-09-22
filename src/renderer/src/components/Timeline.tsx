import { useTranslation } from 'react-i18next'
import type { MonthBucket } from '../lib/aggregates'

const MAX_MONTHS = 24

export default function Timeline({ months }: { months: MonthBucket[] }): React.JSX.Element {
  const { t } = useTranslation('dashboard')
  return (
    <div className="card">
      <h2>{t('timeline.title')}</h2>
      {months.length === 0 ? (
        <p className="lead">{t('timeline.empty')}</p>
      ) : (
        months.slice(0, MAX_MONTHS).map((m) => (
          <div className="timeline-month" key={m.key}>
            <span className="month-key">{m.key}</span>
            <span className="month-count">{m.count.toLocaleString()}</span>
            {m.samples.length > 0 ? (
              <div className="samples">{m.samples.join(' · ')}</div>
            ) : null}
          </div>
        ))
      )}
    </div>
  )
}
