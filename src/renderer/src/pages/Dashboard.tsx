import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BigCounters from '../components/BigCounters'
import CleanupPanel from '../components/CleanupPanel'
import LocationMap from '../components/LocationMap'
import Timeline from '../components/Timeline'
import UncomfortableFact from '../components/UncomfortableFact'
import { computeAggregates } from '../lib/aggregates'
import { useAppStore, type CleanupSection } from '../state/store'

export default function Dashboard(): React.JSX.Element | null {
  const { t } = useTranslation(['dashboard', 'cleanup', 'common'])
  const snapshot = useAppStore((s) => s.snapshot)
  const openCleanup = useAppStore((s) => s.openCleanup)
  const resetAll = useAppStore((s) => s.resetAll)
  const setPhase = useAppStore((s) => s.setPhase)
  const openConfessional = useAppStore((s) => s.openConfessional)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const agg = useMemo(
    () => computeAggregates(snapshot?.entities ?? []),
    [snapshot]
  )

  if (!snapshot) return null

  const sections: { id: CleanupSection; count: number }[] = [
    { id: 'location', count: agg.counts.location },
    { id: 'search', count: agg.counts.search },
    { id: 'youtube', count: agg.counts.youtube }
  ]

  return (
    <div>
      <h1>{t('dashboard:title')}</h1>
      <p className="lead">{t('dashboard:subtitle')}</p>

      <UncomfortableFact agg={agg} />
      <BigCounters agg={agg} />

      <div className="section-card confessional-cta">
        <div className="section-head">
          <div>
            <h2>{t('dashboard:confessional.title')}</h2>
            <p className="lead">{t('dashboard:confessional.description')}</p>
          </div>
          <button className="primary" onClick={() => void openConfessional()}>
            {t('dashboard:confessional.cta')}
          </button>
        </div>
      </div>

      {sections.map((section) => (
        <div className="section-card" key={section.id}>
          <div className="section-head">
            <div>
              <h2>{t(`dashboard:sections.${section.id}.title`)}</h2>
              <p className="lead">{t(`dashboard:sections.${section.id}.description`)}</p>
            </div>
            <button className="primary" onClick={() => openCleanup(section.id)}>
              {t('dashboard:cleanupCta')}
            </button>
          </div>
          {section.count === 0 ? (
            <p className="note">{t('dashboard:counters.empty')}</p>
          ) : null}
          {section.id === 'location' && section.count > 0 ? (
            <LocationMap entities={snapshot.entities} />
          ) : null}
        </div>
      ))}

      <div className="section-card">
        <div className="section-head">
          <div>
            <h2>{t('cleanup:actions.google.ads.disable.title')}</h2>
            <p className="lead">{t('cleanup:levels.disable-collection')}</p>
          </div>
          <button className="primary" onClick={() => openCleanup('ads')}>
            {t('dashboard:cleanupCta')}
          </button>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <h2>{t('cleanup:actions.google.models.derived.title')}</h2>
            <p className="lead">{t('cleanup:levels.derived-models')}</p>
          </div>
          <button className="primary" onClick={() => openCleanup('models')}>
            {t('dashboard:cleanupCta')}
          </button>
        </div>
      </div>

      <Timeline months={agg.byMonth} />

      {snapshot.coverage.skipped.length > 0 ? (
        <div className="card">
          <h2>{t('dashboard:coverage.title')}</h2>
          <div className="coverage-list">
            {snapshot.coverage.skipped.map((s, i) => (
              <div key={i}>
                <code>{s.path}</code> —{' '}
                {t(`dashboard:coverage.skippedReasons.${s.reason}`, s.reason)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="danger-zone">
        <button className="secondary" onClick={() => setPhase('import')}>
          {t('onboarding:import.title', { ns: 'onboarding' })}
        </button>{' '}
        {confirmingReset ? (
          <>
            <span className="note">{t('dashboard:resetConfirm')}</span>{' '}
            <button
              className="primary"
              onClick={() => {
                setConfirmingReset(false)
                void resetAll()
              }}
            >
              {t('common:continue')}
            </button>{' '}
            <button className="secondary" onClick={() => setConfirmingReset(false)}>
              {t('common:cancel')}
            </button>
          </>
        ) : (
          <button className="link" onClick={() => setConfirmingReset(true)}>
            {t('dashboard:reset')}
          </button>
        )}
      </div>

      <CleanupPanel />
    </div>
  )
}
