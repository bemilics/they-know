import { useTranslation } from 'react-i18next'
import { useAppStore } from '../state/store'

export default function ImportValidate(): React.JSX.Element {
  const { t } = useTranslation(['onboarding', 'common'])
  const importing = useAppStore((s) => s.importing)
  const importFailed = useAppStore((s) => s.importFailed)
  const importReport = useAppStore((s) => s.importReport)
  const startImport = useAppStore((s) => s.startImport)
  const confirmImport = useAppStore((s) => s.confirmImport)
  const retryImport = useAppStore((s) => s.retryImport)
  const setPhase = useAppStore((s) => s.setPhase)

  if (importing) {
    return (
      <div>
        <h1>{t('onboarding:import.processing')}</h1>
        <p className="note">{t('onboarding:import.processingNote')}</p>
      </div>
    )
  }

  if (importFailed) {
    const help = t('onboarding:import.notTakeout.help', {
      returnObjects: true
    }) as unknown as string[]
    return (
      <div className="error-card">
        <h2>{t('onboarding:import.notTakeout.title')}</h2>
        <ul>
          {Array.isArray(help) ? help.map((h, i) => <li key={i}>{h}</li>) : null}
        </ul>
        <div className="actions-row">
          <button className="secondary" onClick={() => setPhase('welcome')}>
            {t('common:back')}
          </button>
          <button
            className="primary"
            onClick={() => {
              retryImport()
              void startImport()
            }}
          >
            {t('onboarding:import.notTakeout.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (importReport) {
    return (
      <div>
        <h1>{t('onboarding:import.coverage.title')}</h1>
        <p className="lead">
          {t('onboarding:import.coverage.parsed', { count: importReport.coverage.parsed.length })}{' '}
          · {t('onboarding:import.coverage.skipped', { count: importReport.coverage.skipped.length })}
        </p>
        {importReport.coverage.skipped.length > 0 ? (
          <>
            <p className="note">{t('onboarding:import.coverage.skippedNote')}</p>
            <div className="coverage-list">
              {importReport.coverage.skipped.map((s, i) => (
                <div key={i}>
                  <code>{s.path}</code> —{' '}
                  {t(`dashboard:coverage.skippedReasons.${s.reason}`, s.reason)}
                </div>
              ))}
            </div>
          </>
        ) : null}
        <div className="actions-row">
          <button className="secondary" onClick={() => retryImport()}>
            {t('common:back')}
          </button>
          <button className="primary" onClick={() => void confirmImport()}>
            {t('onboarding:import.coverage.continue')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>{t('onboarding:import.title')}</h1>
      <p className="lead">{t('onboarding:import.hint')}</p>
      <div className="actions-row">
        <button className="secondary" onClick={() => setPhase('welcome')}>
          {t('common:back')}
        </button>
        <button className="primary" onClick={() => void startImport()}>
          {t('onboarding:import.select')}
        </button>
      </div>
    </div>
  )
}
