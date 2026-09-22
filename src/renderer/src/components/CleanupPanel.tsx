import { useTranslation } from 'react-i18next'
import { CLEANUP_ACTIONS } from '../../../shared/cleanup'
import { useAppStore } from '../state/store'

export default function CleanupPanel(): React.JSX.Element | null {
  const { t } = useTranslation(['cleanup', 'disclaimers', 'dashboard', 'common'])
  const section = useAppStore((s) => s.cleanupSection)
  const checklist = useAppStore((s) => s.checklist)
  const toggleCleanup = useAppStore((s) => s.toggleCleanup)
  const closeCleanup = useAppStore((s) => s.closeCleanup)

  if (!section) return null

  const actions = CLEANUP_ACTIONS.filter((a) => a.section === section)
  const doneCount = actions.filter((a) => checklist[a.id]?.status === 'done').length

  return (
    <div className="overlay" onClick={closeCleanup}>
      <aside className="cleanup-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{t('cleanup:panelTitle')}</h2>
          <button className="secondary" onClick={closeCleanup}>
            {t('common:close')}
          </button>
        </div>
        <p className="lead">
          {t('cleanup:progress', { done: doneCount, total: actions.length })}
        </p>
        <div className="progress-bar">
          <div
            className="fill"
            style={{ width: actions.length ? `${(doneCount / actions.length) * 100}%` : '0%' }}
          />
        </div>
        <p className="note">{t('cleanup:recommendedOrder')}</p>

        {actions.map((action) => {
          const state = checklist[action.id]
          const done = state?.status === 'done'
          const steps = t(`cleanup:actions.${action.i18nKey}.steps`, {
            returnObjects: true
          }) as unknown as string[]
          return (
            <div className="cleanup-action" key={action.id}>
              <span className={`level-badge ${action.level}`}>
                {t(`cleanup:levels.${action.level}`)}
              </span>
              <h3>{t(`cleanup:actions.${action.i18nKey}.title`)}</h3>

              <h4>{t('cleanup:stepsLabel')}</h4>
              <ol className="steps">
                {Array.isArray(steps) ? steps.map((s, i) => <li key={i}>{s}</li>) : null}
              </ol>

              <button className="primary" onClick={() => void window.api.openDeepLink(action.deepLink)}>
                {t('cleanup:openLink')}
              </button>

              <p className="you-lose">
                <strong>{t('cleanup:youLoseLabel')}</strong>
                {t(`cleanup:actions.${action.i18nKey}.youLose`)}
              </p>

              <p className="disclaimer">{t(`disclaimers:${action.level}`)}</p>

              <label className="done-row">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => void toggleCleanup(action.id)}
                />
                <span>{t('cleanup:done')}</span>
                {done && state?.doneAt ? (
                  <span className="done-at">
                    {t('cleanup:doneAt', { date: new Date(state.doneAt).toLocaleDateString() })}
                  </span>
                ) : null}
              </label>
            </div>
          )
        })}
      </aside>
    </div>
  )
}
