import { useTranslation } from 'react-i18next'
import type { Aggregates } from '../lib/aggregates'
import { pickUncomfortableFact } from '../lib/uncomfortable'

export default function UncomfortableFact({
  agg
}: {
  agg: Aggregates
}): React.JSX.Element | null {
  const { t } = useTranslation('dashboard')
  const fact = pickUncomfortableFact(agg)
  if (!fact) return null
  return (
    <div className="uncomfortable">
      <span className="kicker">{t('uncomfortable.title')}</span>
      {t(`uncomfortable.${fact.key}`, fact.params)}
    </div>
  )
}
