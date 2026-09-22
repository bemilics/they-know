import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../state/store'
import { detectTimezone } from '../../../impact/time'

export default function OnboardingWizard(): React.JSX.Element {
  const { t } = useTranslation(['onboarding', 'common'])
  const phase = useAppStore((s) => s.phase)
  const snapshot = useAppStore((s) => s.snapshot)
  const setPhase = useAppStore((s) => s.setPhase)
  const timezone = useAppStore((s) => s.timezone)
  const setTimezone = useAppStore((s) => s.setTimezone)
  const [tzDraft, setTzDraft] = useState(timezone)

  useEffect(() => {
    setTzDraft(timezone || detectTimezone())
  }, [timezone])

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

      <div className="section-card tz-step">
        <label className="tz-label" htmlFor="tz-input">
          {t('onboarding:timezone.label')}
        </label>
        <p className="note">{t('onboarding:timezone.hint')}</p>
        <input
          id="tz-input"
          className="tz-input"
          value={tzDraft}
          onChange={(e) => setTzDraft(e.target.value)}
          onBlur={() => void setTimezone(tzDraft.trim() || detectTimezone())}
          placeholder="America/Santiago"
          spellCheck={false}
        />
        <button
          className="secondary"
          onClick={() => {
            const detected = detectTimezone()
            setTzDraft(detected)
            void setTimezone(detected)
          }}
        >
          {t('onboarding:timezone.detect')}
        </button>
      </div>

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
