import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Dashboard from './pages/Dashboard'
import ImportValidate from './pages/ImportValidate'
import OnboardingWizard from './pages/OnboardingWizard'
import ConfessionalMode from './pages/ConfessionalMode'
import { useAppStore } from './state/store'

export default function App(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const hydrated = useAppStore((s) => s.hydrated)
  const phase = useAppStore((s) => s.phase)
  const hydrate = useAppStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (!hydrated) {
    return <div className="app-loading">{t('loading')}</div>
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-name">{t('appName')}</span>
          <span className="privacy-badge">{t('privacyBadge')}</span>
        </div>
        <div className="lang-switch" aria-label={t('language')}>
          <button
            className={i18n.language === 'es-CL' ? 'active' : ''}
            onClick={() => void i18n.changeLanguage('es-CL')}
          >
            {t('spanish')}
          </button>
          <button
            className={i18n.language === 'en' ? 'active' : ''}
            onClick={() => void i18n.changeLanguage('en')}
          >
            {t('english')}
          </button>
        </div>
      </header>
      <main className="app-main">
        {phase === 'welcome' || phase === 'guide' ? <OnboardingWizard /> : null}
        {phase === 'import' ? <ImportValidate /> : null}
        {phase === 'dashboard' ? <Dashboard /> : null}
        {phase === 'confessional' ? <ConfessionalMode /> : null}
      </main>
    </div>
  )
}
