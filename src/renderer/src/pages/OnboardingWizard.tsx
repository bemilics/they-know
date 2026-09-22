import { useTranslation } from 'react-i18next'
import { useAppStore } from '../state/store'

export default function OnboardingWizard(): React.JSX.Element {
  const { t } = useTranslation(['onboarding', 'common'])
  const phase = useAppStore((s) => s.phase)
  const snapshot = useAppStore((s) => s.snapshot)
  const setPhase = useAppStore((s) => s.setPhase)

  if (phase === 'guide') {
    const steps = t('onboarding:googleGuide.steps', { returnObjects: true }) as unknown as string[]
    return (
      <div>
        <h1>{t('onboarding:googleGuide.title')}</h1>
        <p className="lead">{t('onboarding:googleGuide.intro')}</p>
        <ol className="steps">
          {Array.isArray(steps) ? steps.map((step, i) => <li key={i}>{step}</li>) : null}
        </ol>
        <p className="note">{t('onboarding:googleGuide.patience')}</p>
        <div className="actions-row">
          <button className="secondary" onClick={() => setPhase('welcome')}>
            {t('common:back')}
          </button>
          <button className="primary" onClick={() => setPhase('import')}>
            {t('onboarding:googleGuide.ready')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>{t('onboarding:welcome.title')}</h1>
      <p className="lead">{t('onboarding:welcome.subtitle')}</p>
      <div className="path-choice">
        <button onClick={() => setPhase('guide')}>
          {t('onboarding:welcome.google')}
          <span className="hint">{t('onboarding:welcome.googleHint')}</span>
        </button>
        <button disabled>
          {t('onboarding:welcome.meta')}
          <span className="hint">{t('onboarding:welcome.metaSoon')}</span>
        </button>
      </div>
      {snapshot ? (
        <button className="secondary" onClick={() => setPhase('dashboard')}>
          {t('onboarding:welcome.hasSnapshot')}
        </button>
      ) : null}
    </div>
  )
}
